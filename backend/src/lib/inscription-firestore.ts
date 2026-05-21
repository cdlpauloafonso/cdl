import { getAdminFirestore } from './firebase-admin.js';

export type InscriptionPaymentStatus = 'pending' | 'paid' | 'cancelled' | 'expired';

export type CampaignPaymentConfigDoc = {
  provider?: 'manual_pix' | 'asaas';
  amount?: number;
  description?: string;
  pixImageUrl?: string;
  pixCopyPaste?: string;
  pixObservationText?: string;
};

export type CampaignDoc = {
  title?: string;
  paymentConfig?: CampaignPaymentConfigDoc;
  registrationClosed?: boolean;
  published?: boolean;
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

export async function updateInscriptionPayment(
  campaignId: string,
  inscriptionId: string,
  patch: {
    paymentStatus?: InscriptionPaymentStatus;
    asaasPaymentId?: string;
    asaasInvoiceUrl?: string;
    asaasCustomerId?: string;
    paymentProvider?: 'manual_pix' | 'asaas';
    asaasLastWebhookEventId?: string;
  }
): Promise<void> {
  const db = requireAdminFirestore();
  await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('inscricoes')
    .doc(inscriptionId)
    .set(patch, { merge: true });
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
