/**
 * Credenciais Resend em Firestore (integrations/resend).
 * Acesso somente via Admin SDK — regras bloqueiam o cliente.
 */
import admin from 'firebase-admin';
import { getAdminFirestore } from '../firebase-admin.js';

export type ResendEnvironment = 'sandbox' | 'production';

export type ResendIntegrationDoc = {
  environment?: ResendEnvironment;
  enabled?: boolean;
  /** @deprecated Use apiKeySandbox / apiKeyProduction */
  apiKey?: string;
  apiKeySandbox?: string;
  apiKeyProduction?: string;
  /** @deprecated Use fromAddressSandbox / fromAddressProduction */
  fromAddress?: string;
  fromAddressSandbox?: string;
  fromAddressProduction?: string;
  updatedAt?: admin.firestore.Timestamp;
  updatedBy?: string;
};

export type ResendIntegrationPublic = {
  environment: ResendEnvironment;
  enabled: boolean;
  hasSandboxKey: boolean;
  hasProductionKey: boolean;
  apiKeySandboxMasked: string;
  apiKeyProductionMasked: string;
  fromAddressSandbox: string;
  fromAddressProduction: string;
  /** Remetente efetivo do ambiente selecionado */
  fromAddress: string;
  updatedAt: string | null;
  updatedBy: string | null;
  source: 'firestore' | 'env' | 'none';
};

const DOC_PATH = ['integrations', 'resend'] as const;

export function maskSecret(value: string | undefined | null): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  const len = raw.length;
  if (len <= 4) return '••••';
  const tail = raw.slice(-4);
  const dots = '•'.repeat(Math.max(4, Math.min(20, len - 4)));
  return `${dots}${tail}`;
}

export async function readResendIntegrationDoc(): Promise<ResendIntegrationDoc | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const snap = await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).get();
  if (!snap.exists) return null;
  return (snap.data() as ResendIntegrationDoc) ?? null;
}

export type ResendIntegrationPatch = Partial<
  Pick<
    ResendIntegrationDoc,
    | 'environment'
    | 'enabled'
    | 'apiKeySandbox'
    | 'apiKeyProduction'
    | 'fromAddressSandbox'
    | 'fromAddressProduction'
  >
> & {
  updatedBy?: string;
};

function trimNonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

export async function writeResendIntegrationDoc(patch: ResendIntegrationPatch): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');

  const data: Record<string, unknown> = {};
  if (patch.environment === 'sandbox' || patch.environment === 'production') {
    data.environment = patch.environment;
  }
  if (typeof patch.enabled === 'boolean') data.enabled = patch.enabled;

  const sandboxKey = trimNonEmpty(patch.apiKeySandbox);
  if (sandboxKey) data.apiKeySandbox = sandboxKey;

  const productionKey = trimNonEmpty(patch.apiKeyProduction);
  if (productionKey) data.apiKeyProduction = productionKey;

  const fromSandbox = trimNonEmpty(patch.fromAddressSandbox);
  if (fromSandbox) data.fromAddressSandbox = fromSandbox;

  const fromProduction = trimNonEmpty(patch.fromAddressProduction);
  if (fromProduction) data.fromAddressProduction = fromProduction;

  if (patch.updatedBy) data.updatedBy = patch.updatedBy;
  data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).set(data, { merge: true });
}

export async function clearResendIntegrationSecret(
  field: 'apiKeySandbox' | 'apiKeyProduction' | 'apiKey',
  updatedBy?: string,
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  await db
    .collection(DOC_PATH[0])
    .doc(DOC_PATH[1])
    .set(
      {
        [field]: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(updatedBy ? { updatedBy } : {}),
      },
      { merge: true },
    );
}

export function buildResendIntegrationPublic(
  doc: ResendIntegrationDoc | null,
  fallback: {
    environment: ResendEnvironment;
    enabled: boolean;
    sandboxKey: string;
    productionKey: string;
    fromAddressSandbox: string;
    fromAddressProduction: string;
  },
): ResendIntegrationPublic {
  const environment: ResendEnvironment =
    doc?.environment === 'production' || doc?.environment === 'sandbox'
      ? doc.environment
      : fallback.environment;

  const enabled = typeof doc?.enabled === 'boolean' ? doc.enabled : fallback.enabled;

  const legacyKey = doc?.apiKey?.trim() || '';
  const sandbox =
    doc?.apiKeySandbox?.trim() ||
    fallback.sandboxKey ||
    '';
  const production =
    doc?.apiKeyProduction?.trim() ||
    fallback.productionKey ||
    '';

  const hasSandboxKey = Boolean(sandbox || legacyKey);
  const hasProductionKey = Boolean(production || legacyKey);

  const legacyFrom = doc?.fromAddress?.trim() || '';
  const fromAddressSandbox =
    doc?.fromAddressSandbox?.trim() ||
    legacyFrom ||
    fallback.fromAddressSandbox ||
    '';
  const fromAddressProduction =
    doc?.fromAddressProduction?.trim() ||
    fallback.fromAddressProduction ||
    '';

  const fromAddress = environment === 'production' ? fromAddressProduction : fromAddressSandbox;

  const hasFirestoreSecrets = Boolean(
    doc?.apiKeySandbox?.trim() ||
      doc?.apiKeyProduction?.trim() ||
      doc?.apiKey?.trim(),
  );
  const source: ResendIntegrationPublic['source'] = hasFirestoreSecrets
    ? 'firestore'
    : fallback.sandboxKey || fallback.productionKey
      ? 'env'
      : 'none';

  return {
    environment,
    enabled,
    hasSandboxKey,
    hasProductionKey,
    apiKeySandboxMasked: maskSecret(sandbox || legacyKey),
    apiKeyProductionMasked: maskSecret(production || legacyKey),
    fromAddressSandbox,
    fromAddressProduction,
    fromAddress,
    updatedAt: doc?.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    updatedBy: doc?.updatedBy ?? null,
    source,
  };
}
