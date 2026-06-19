import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from './firebase-admin.js';
import {
  type EventVoucherDoc,
  resolveVoucherForCharge,
} from './event-voucher.js';

export type InscriptionPaymentStatus = 'pending' | 'paid' | 'gratis' | 'cancelled' | 'expired';

export type CampaignPaymentConfigDoc = {
  provider?: 'manual_pix' | 'asaas';
  amount?: number;
  amountAssociado?: number;
  description?: string;
  pixImageUrl?: string;
  pixCopyPaste?: string;
  pixObservationText?: string;
};

export type CampaignRegistrationConfigDoc =
  | { type: 'external'; url?: string }
  | { type: 'form'; fieldKeys?: string[] };

export type CampaignDoc = {
  title?: string;
  date?: string;
  paymentConfig?: CampaignPaymentConfigDoc;
  vouchers?: EventVoucherDoc[];
  registrationClosed?: boolean;
  published?: boolean;
  checkInOnApp?: boolean;
  /** @deprecated usar checkInOnApp */
  credentialingOnApp?: boolean;
  registrationConfig?: CampaignRegistrationConfigDoc;
};

function requireAdminFirestore() {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  return db;
}

export async function getCampaignDoc(campaignId: string): Promise<CampaignDoc | null> {
  const db = requireAdminFirestore();
  const snap = await db.collection('campaigns').doc(campaignId).get();
  if (!snap.exists) return null;
  return snap.data() as CampaignDoc;
}

export async function getInscriptionDoc(
  campaignId: string,
  inscriptionId: string
): Promise<Record<string, unknown> | null> {
  const db = requireAdminFirestore();
  const snap = await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('inscricoes')
    .doc(inscriptionId)
    .get();
  if (!snap.exists) return null;
  return snap.data() as Record<string, unknown>;
}

function onlyDigitsCnpj(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14);
}

/** CNPJ na coleção pública associadosCnpjIndex (mesma regra do site). */
export async function isCnpjCadastradoComoAssociado(cnpjRaw: string): Promise<boolean> {
  const digits = onlyDigitsCnpj(cnpjRaw);
  if (digits.length !== 14) return false;
  const db = requireAdminFirestore();
  const snap = await db.collection('associadosCnpjIndex').doc(digits).get();
  return snap.exists;
}

export type ResolvedInscriptionPaymentAmount = {
  amount: number;
  tier: 'normal' | 'associado';
  voucherId?: string;
  voucherCode?: string;
};

/** Define valor da cobrança conforme CNPJ, voucher e configuração do evento. */
export async function resolveInscriptionPaymentAmount(
  paymentCfg: CampaignPaymentConfigDoc,
  fields: Record<string, string>,
  options?: {
    vouchers?: EventVoucherDoc[];
    voucherCode?: string;
  },
): Promise<ResolvedInscriptionPaymentAmount> {
  const amountNormal = Number(paymentCfg.amount);
  if (!Number.isFinite(amountNormal) || amountNormal <= 0) {
    throw new Error('INVALID_PAYMENT_AMOUNT');
  }

  const amountAssociado = Number(paymentCfg.amountAssociado);
  const cnpj = onlyDigitsCnpj(String(fields.cnpj ?? ''));
  let baseAmount = amountNormal;
  let tier: 'normal' | 'associado' = 'normal';
  if (
    Number.isFinite(amountAssociado) &&
    amountAssociado > 0 &&
    cnpj.length === 14 &&
    (await isCnpjCadastradoComoAssociado(cnpj))
  ) {
    baseAmount = amountAssociado;
    tier = 'associado';
  }

  const code = options?.voucherCode?.trim();
  if (code) {
    const resolved = resolveVoucherForCharge(options?.vouchers, code, baseAmount);
    if (!resolved.ok) throw new Error(resolved.error);
    return {
      amount: resolved.amount,
      tier,
      voucherId: resolved.voucher.id,
      voucherCode: resolved.voucher.code,
    };
  }

  return { amount: baseAmount, tier };
}

export function isGratisPaymentAmount(amount: number): boolean {
  return !Number.isFinite(amount) || amount < 0.01;
}

export function isInscriptionPaymentConfirmedStatus(status: unknown): boolean {
  return status === 'paid' || status === 'gratis';
}

/** Voucher 100% (ou valor zero): confirma inscrição sem cobrança Asaas. */
export async function markInscriptionGratis(
  campaignId: string,
  inscriptionId: string,
  input: {
    tier: 'normal' | 'associado';
    voucherId?: string;
    voucherCode?: string;
    paymentAmountApplied?: number;
  },
): Promise<void> {
  const insc = await getInscriptionDoc(campaignId, inscriptionId);
  const alreadyConfirmed = isInscriptionPaymentConfirmedStatus(insc?.paymentStatus);

  await updateInscriptionPayment(campaignId, inscriptionId, {
    paymentStatus: 'gratis',
    paymentProvider: 'asaas',
    paymentAmountApplied: input.paymentAmountApplied ?? 0,
    paymentAmountTier: input.tier,
    ...(input.voucherId ? { voucherId: input.voucherId } : {}),
    ...(input.voucherCode ? { voucherCode: input.voucherCode } : {}),
  });

  if (input.voucherId && !alreadyConfirmed) {
    try {
      await incrementCampaignVoucherUsedCount(campaignId, input.voucherId);
    } catch {
      /* contador de voucher não bloqueia confirmação gratuita */
    }
  }
}

export async function incrementCampaignVoucherUsedCount(
  campaignId: string,
  voucherId: string,
): Promise<void> {
  const db = requireAdminFirestore();
  const ref = db.collection('campaigns').doc(campaignId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data() as CampaignDoc;
    const vouchers = data.vouchers;
    if (!Array.isArray(vouchers)) return;
    const next = vouchers.map((v) =>
      v.id === voucherId ? { ...v, usedCount: (v.usedCount ?? 0) + 1 } : v,
    );
    tx.update(ref, { vouchers: next });
  });
}

export async function updateInscriptionPayment(
  campaignId: string,
  inscriptionId: string,
  patch: {
    paymentStatus?: InscriptionPaymentStatus;
    paymentAmountApplied?: number;
    paymentAmountTier?: 'normal' | 'associado';
    voucherId?: string;
    voucherCode?: string;
    clearVoucher?: boolean;
    asaasPaymentId?: string;
    asaasInvoiceUrl?: string;
    asaasCustomerId?: string;
    paymentProvider?: 'manual_pix' | 'asaas';
    asaasLastWebhookEventId?: string;
  }
): Promise<void> {
  const db = requireAdminFirestore();
  const { clearVoucher, voucherId, voucherCode, ...rest } = patch;
  const data: Record<string, unknown> = { ...rest };
  if (clearVoucher) {
    data.voucherId = FieldValue.delete();
    data.voucherCode = FieldValue.delete();
  } else {
    if (voucherId !== undefined) data.voucherId = voucherId;
    if (voucherCode !== undefined) data.voucherCode = voucherCode;
  }
  await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('inscricoes')
    .doc(inscriptionId)
    .set(data, { merge: true });
}

export async function isWebhookEventProcessed(
  campaignId: string,
  inscriptionId: string,
  eventId: string
): Promise<boolean> {
  const data = await getInscriptionDoc(campaignId, inscriptionId);
  return data?.asaasLastWebhookEventId === eventId;
}

export async function updateInscriptionCertificateEmail(
  campaignId: string,
  inscriptionId: string,
  patch: {
    certificateEmailSentAt?: string | null;
    certificateEmailLastError?: string | null;
  }
): Promise<void> {
  const db = requireAdminFirestore();
  const data: Record<string, unknown> = {};
  if ('certificateEmailSentAt' in patch) {
    data.certificateEmailSentAt = patch.certificateEmailSentAt;
  }
  if ('certificateEmailLastError' in patch) {
    data.certificateEmailLastError = patch.certificateEmailLastError;
  }
  await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('inscricoes')
    .doc(inscriptionId)
    .set(data, { merge: true });
}
