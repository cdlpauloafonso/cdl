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

export type CreateInscriptionPaymentResponse = {
  paymentId: string;
  invoiceUrl: string;
  customerId: string;
  amount: number;
  paymentStatus: string;
  pix: InscriptionPaymentPixCheckout;
};

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
  const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<
    CreateInscriptionPaymentResponse
  >;
  if (!res.ok) {
    throw new Error(data.error ?? 'Não foi possível gerar o link de pagamento.');
  }
  if (!data.invoiceUrl || !data.paymentId || !data.pix?.payload || !data.pix?.encodedImage) {
    throw new Error('Resposta inválida do servidor de pagamento.');
  }
  return data as CreateInscriptionPaymentResponse;
}
