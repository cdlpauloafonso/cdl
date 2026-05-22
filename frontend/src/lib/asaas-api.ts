import { waitForFirebaseAuthUser } from '@/lib/admin-auth';
import {
  API_NOT_CONFIGURED_MESSAGE,
  getApiBaseUrl,
  isApiConfiguredForClient,
} from '@/lib/api-base';

const API_BASE = getApiBaseUrl();

function assertApiReachable(): void {
  if (!isApiConfiguredForClient()) {
    throw new Error(API_NOT_CONFIGURED_MESSAGE);
  }
}

export type AsaasIntegrationStatus = {
  configured: boolean;
  environment: string;
};

export type InscriptionPaymentPixCheckout = {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
};

/** Data URL para exibir QR Code PIX retornado pelo Asaas (base64). */
export function pixQrImageSrc(encodedImage: string): string {
  const raw = encodedImage.trim();
  if (raw.startsWith('data:')) return raw;
  return `data:image/png;base64,${raw}`;
}

export type InscriptionPaymentBoletoCheckout = {
  identificationField: string;
  barCode?: string;
  nossoNumero?: string;
  dueDate?: string;
};

export type CreateInscriptionPaymentResponse = {
  paymentId: string;
  invoiceUrl: string;
  customerId: string;
  amount: number;
  paymentStatus: string;
  pix: InscriptionPaymentPixCheckout | null;
  boleto: InscriptionPaymentBoletoCheckout | null;
  /** Voucher 100% — sem cobrança Asaas; status Firestore `gratis`. */
  gratis?: boolean;
};

export type AsaasCreditCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type AsaasCreditCardHolderInput = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
  addressComplement?: string;
  mobilePhone?: string;
};

export type InscriptionCardHolderPrefill = Partial<AsaasCreditCardHolderInput>;

export type InscriptionCheckoutMethod = 'pix' | 'boleto' | 'card';

export type ApplyInscriptionVoucherResult = {
  amount: number;
  amountBefore: number;
  tier: 'normal' | 'associado';
  voucherCode: string | null;
  voucherApplied: boolean;
};

function parseBoletoFromResponse(
  data: Record<string, unknown>
): InscriptionPaymentBoletoCheckout | null {
  const boleto = data.boleto;
  if (boleto && typeof boleto === 'object') {
    const b = boleto as Record<string, unknown>;
    const identificationField =
      typeof b.identificationField === 'string' ? b.identificationField.trim() : '';
    if (identificationField) {
      return {
        identificationField,
        ...(typeof b.barCode === 'string' && b.barCode.trim() ? { barCode: b.barCode.trim() } : {}),
        ...(typeof b.nossoNumero === 'string' && b.nossoNumero.trim()
          ? { nossoNumero: b.nossoNumero.trim() }
          : {}),
        ...(typeof b.dueDate === 'string' && b.dueDate ? { dueDate: b.dueDate } : {}),
      };
    }
  }
  return null;
}

function parsePixFromResponse(
  data: Record<string, unknown>
): InscriptionPaymentPixCheckout | null {
  const pix = data.pix;
  if (pix && typeof pix === 'object') {
    const p = pix as Record<string, unknown>;
    const payload = typeof p.payload === 'string' ? p.payload.trim() : '';
    const encodedImage = typeof p.encodedImage === 'string' ? p.encodedImage.trim() : '';
    if (payload && encodedImage) {
      return {
        encodedImage,
        payload,
        ...(typeof p.expirationDate === 'string' && p.expirationDate
          ? { expirationDate: p.expirationDate }
          : {}),
      };
    }
  }
  return null;
}

function normalizeInscriptionPaymentResponse(
  data: Record<string, unknown>
): CreateInscriptionPaymentResponse {
  const paymentStatus =
    typeof data.paymentStatus === 'string' && data.paymentStatus ? data.paymentStatus : 'pending';
  const gratis = data.gratis === true || paymentStatus === 'gratis';
  if (gratis) {
    return {
      paymentId: '',
      invoiceUrl: '',
      customerId: '',
      amount: 0,
      paymentStatus: 'gratis',
      pix: null,
      boleto: null,
      gratis: true,
    };
  }

  const paymentId = typeof data.paymentId === 'string' ? data.paymentId : '';
  if (!paymentId) {
    throw new Error('Resposta inválida do servidor de pagamento.');
  }
  const amountRaw = Number(data.amount);
  return {
    paymentId,
    invoiceUrl: typeof data.invoiceUrl === 'string' ? data.invoiceUrl : '',
    customerId: typeof data.customerId === 'string' ? data.customerId : '',
    amount: Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 0,
    paymentStatus,
    pix: parsePixFromResponse(data),
    boleto: parseBoletoFromResponse(data),
  };
}

export type AsaasIntegrationPublic = {
  environment: 'sandbox' | 'production';
  enabled: boolean;
  hasSandboxKey: boolean;
  hasProductionKey: boolean;
  hasWebhookToken: boolean;
  apiKeySandboxMasked: string;
  apiKeyProductionMasked: string;
  webhookTokenMasked: string;
  updatedAt: string | null;
  updatedBy: string | null;
  source: 'firestore' | 'env' | 'none';
};

export type AsaasIntegrationUpdate = {
  environment?: 'sandbox' | 'production';
  enabled?: boolean;
  apiKeySandbox?: string;
  apiKeyProduction?: string;
  webhookToken?: string;
  clearSandboxKey?: boolean;
  clearProductionKey?: boolean;
  clearWebhookToken?: boolean;
};

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  assertApiReachable();
  const user = await waitForFirebaseAuthUser();
  if (!user) throw new Error('Sessão administrativa expirada. Faça login novamente.');
  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${idToken}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new Error(
      `Não foi possível contactar o servidor (${API_BASE}). Verifique se a API está no ar e se NEXT_PUBLIC_API_URL está correta.`,
    );
  }
}

export async function fetchAsaasIntegrationStatus(): Promise<AsaasIntegrationStatus | null> {
  if (!isApiConfiguredForClient()) return null;
  try {
    const res = await fetch(`${API_BASE}/api/asaas/status`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as AsaasIntegrationStatus;
  } catch {
    return null;
  }
}

export async function fetchAsaasIntegration(): Promise<AsaasIntegrationPublic> {
  const res = await adminFetch('/api/asaas/integration');
  const data = (await res.json().catch(() => ({}))) as Partial<AsaasIntegrationPublic> & {
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data as AsaasIntegrationPublic;
}

export async function saveAsaasIntegration(
  patch: AsaasIntegrationUpdate
): Promise<AsaasIntegrationPublic> {
  const res = await adminFetch('/api/asaas/integration', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<AsaasIntegrationPublic> & {
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data as AsaasIntegrationPublic;
}

export async function testAsaasIntegration(): Promise<{
  ok: boolean;
  environment?: string;
  error?: string;
}> {
  try {
    const res = await adminFetch('/api/asaas/integration/test', { method: 'POST' });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      environment?: string;
      error?: string;
    };
    return {
      ok: Boolean(data.ok),
      environment: data.environment,
      error: data.error,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha de rede.' };
  }
}

export async function createAsaasInscriptionPayment(
  campaignId: string,
  inscriptionId: string
): Promise<CreateInscriptionPaymentResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/asaas/inscription-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, inscriptionId }),
    });
  } catch {
    throw new Error(
      `Não foi possível contactar o servidor de pagamento (${API_BASE}). Verifique sua conexão ou tente mais tarde.`,
    );
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' && data.error ? data.error : 'Não foi possível gerar o link de pagamento.',
    );
  }
  return normalizeInscriptionPaymentResponse(data);
}

export async function applyInscriptionVoucher(
  campaignId: string,
  inscriptionId: string,
  voucherCode: string,
): Promise<ApplyInscriptionVoucherResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/asaas/inscription-payment/voucher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, inscriptionId, voucherCode }),
    });
  } catch {
    throw new Error(
      `Não foi possível contactar o servidor de pagamento (${API_BASE}). Verifique sua conexão ou tente mais tarde.`,
    );
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' && data.error ? data.error : 'Não foi possível aplicar o voucher.',
    );
  }
  const amount = Number(data.amount);
  const amountBefore = Number(data.amountBefore);
  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    amountBefore: Number.isFinite(amountBefore) && amountBefore > 0 ? amountBefore : 0,
    tier: data.tier === 'associado' ? 'associado' : 'normal',
    voucherCode:
      typeof data.voucherCode === 'string' && data.voucherCode ? data.voucherCode : null,
    voucherApplied: Boolean(data.voucherApplied),
  };
}

export async function fetchInscriptionCheckoutMethod(
  campaignId: string,
  inscriptionId: string,
  method: InscriptionCheckoutMethod,
): Promise<CreateInscriptionPaymentResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/asaas/inscription-payment/method`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, inscriptionId, method }),
    });
  } catch {
    throw new Error(
      `Não foi possível contactar o servidor de pagamento (${API_BASE}). Verifique sua conexão ou tente mais tarde.`,
    );
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' && data.error ? data.error : 'Não foi possível carregar o pagamento.',
    );
  }
  return normalizeInscriptionPaymentResponse(data);
}

export async function payAsaasInscriptionWithCreditCard(
  campaignId: string,
  inscriptionId: string,
  creditCard: AsaasCreditCardInput,
  creditCardHolderInfo: AsaasCreditCardHolderInput,
): Promise<{ paymentStatus: string; paid: boolean }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/asaas/inscription-payment/card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, inscriptionId, creditCard, creditCardHolderInfo }),
    });
  } catch {
    throw new Error(
      `Não foi possível contactar o servidor de pagamento (${API_BASE}). Verifique sua conexão ou tente mais tarde.`,
    );
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' && data.error ? data.error : 'Não foi possível processar o cartão.',
    );
  }
  return {
    paymentStatus:
      typeof data.paymentStatus === 'string' && data.paymentStatus ? data.paymentStatus : 'PENDING',
    paid: Boolean(data.paid),
  };
}
