/**
 * Persistência das credenciais Asaas em Firestore (integrations/asaas).
 *
 * Acesso só pelo backend via Admin SDK.
 * As regras do Firestore (firebase/firestore.rules) bloqueiam o cliente.
 *
 * Princípios:
 * - Nunca retornar segredos para o navegador. Use maskSecret() ao expor.
 * - Salvamento parcial: campos vazios/undefined NÃO sobrescrevem o valor anterior.
 * - Auditoria mínima (updatedAt/updatedBy).
 */
import admin from 'firebase-admin';
import { getAdminFirestore } from '../firebase-admin.js';

// Definido localmente para evitar dependência circular com config.ts
export type AsaasEnvironment = 'sandbox' | 'production';

export type AsaasIntegrationDoc = {
  environment?: AsaasEnvironment;
  enabled?: boolean;
  apiKeySandbox?: string;
  apiKeyProduction?: string;
  webhookToken?: string;
  updatedAt?: admin.firestore.Timestamp;
  updatedBy?: string;
};

export type AsaasIntegrationPublic = {
  environment: AsaasEnvironment;
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

const DOC_PATH = ['integrations', 'asaas'] as const;

export function maskSecret(value: string | undefined | null): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  const len = raw.length;
  if (len <= 4) return '••••';
  const tail = raw.slice(-4);
  const dots = '•'.repeat(Math.max(4, Math.min(20, len - 4)));
  return `${dots}${tail}`;
}

export async function readAsaasIntegrationDoc(): Promise<AsaasIntegrationDoc | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const snap = await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).get();
  if (!snap.exists) return null;
  return (snap.data() as AsaasIntegrationDoc) ?? null;
}

export type AsaasIntegrationPatch = Partial<
  Pick<AsaasIntegrationDoc, 'environment' | 'enabled' | 'apiKeySandbox' | 'apiKeyProduction' | 'webhookToken'>
> & {
  updatedBy?: string;
};

/**
 * Salva parcialmente. Strings vazias/undefined são ignoradas (não apagam o valor anterior).
 * Para limpar um segredo, use clearAsaasIntegrationSecret().
 */
export async function writeAsaasIntegrationDoc(patch: AsaasIntegrationPatch): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');

  const data: Record<string, unknown> = {};
  if (patch.environment === 'sandbox' || patch.environment === 'production') {
    data.environment = patch.environment;
  }
  if (typeof patch.enabled === 'boolean') data.enabled = patch.enabled;

  const trimNonEmpty = (v: unknown): string | null => {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  };

  const sandbox = trimNonEmpty(patch.apiKeySandbox);
  if (sandbox) data.apiKeySandbox = sandbox;

  const production = trimNonEmpty(patch.apiKeyProduction);
  if (production) data.apiKeyProduction = production;

  const webhookToken = trimNonEmpty(patch.webhookToken);
  if (webhookToken) data.webhookToken = webhookToken;

  if (Object.keys(data).length === 0) return;

  data.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  if (patch.updatedBy) data.updatedBy = patch.updatedBy;

  await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).set(data, { merge: true });
}

/** Remove um segredo específico do documento (envia explicitamente "limpar"). */
export async function clearAsaasIntegrationSecret(
  field: 'apiKeySandbox' | 'apiKeyProduction' | 'webhookToken',
  updatedBy?: string
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
      { merge: true }
    );
}

export function buildIntegrationPublic(
  doc: AsaasIntegrationDoc | null,
  fallback: { environment: AsaasEnvironment; enabled: boolean; sandboxKey: string; productionKey: string; webhookToken: string }
): AsaasIntegrationPublic {
  const environment: AsaasEnvironment =
    doc?.environment === 'production' || doc?.environment === 'sandbox'
      ? doc.environment
      : fallback.environment;

  const enabled = typeof doc?.enabled === 'boolean' ? doc.enabled : fallback.enabled;

  const sandbox = doc?.apiKeySandbox || fallback.sandboxKey || '';
  const production = doc?.apiKeyProduction || fallback.productionKey || '';
  const webhook = doc?.webhookToken || fallback.webhookToken || '';

  const updatedAtIso = doc?.updatedAt?.toDate?.().toISOString() ?? null;
  const source: AsaasIntegrationPublic['source'] = doc ? 'firestore' : sandbox || production ? 'env' : 'none';

  return {
    environment,
    enabled,
    hasSandboxKey: Boolean(sandbox),
    hasProductionKey: Boolean(production),
    hasWebhookToken: Boolean(webhook),
    apiKeySandboxMasked: maskSecret(sandbox),
    apiKeyProductionMasked: maskSecret(production),
    webhookTokenMasked: maskSecret(webhook),
    updatedAt: updatedAtIso,
    updatedBy: doc?.updatedBy ?? null,
    source,
  };
}
