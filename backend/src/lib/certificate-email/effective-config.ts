import {
  buildResendIntegrationPublic,
  readResendIntegrationDoc,
  type ResendEnvironment,
  type ResendIntegrationPublic,
} from './resend-integration-store.js';

export type CertificateEmailEffectiveConfig = {
  enabled: boolean;
  providerReady: boolean;
  environment: ResendEnvironment;
  apiKey: string;
  fromAddress: string;
  source: 'firestore' | 'env' | 'none';
};

const PRODUCTION_DEFAULT_FROM = 'CDL Paulo Afonso <certificados@cdlpauloafonso.com>';
const SANDBOX_DEFAULT_FROM = 'onboarding@resend.dev';

export function defaultFromForEnvironment(env: ResendEnvironment): string {
  return env === 'production' ? PRODUCTION_DEFAULT_FROM : SANDBOX_DEFAULT_FROM;
}

function envResendEnvironment(): ResendEnvironment {
  const raw = (process.env.RESEND_ENV ?? process.env.CERTIFICATE_EMAIL_ENV ?? 'sandbox')
    .trim()
    .toLowerCase();
  return raw === 'production' ? 'production' : 'sandbox';
}

function envCertificateEmailEnabled(): boolean {
  return process.env.CERTIFICATE_EMAIL_ENABLED === 'true';
}

function envLegacyApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() ?? '';
}

function envSandboxApiKey(): string {
  return process.env.RESEND_API_KEY_SANDBOX?.trim() ?? '';
}

function envProductionApiKey(): string {
  return process.env.RESEND_API_KEY_PRODUCTION?.trim() ?? '';
}

function envLegacyFrom(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    process.env.CERTIFICATE_EMAIL_FROM?.trim() ||
    ''
  );
}

function envFromSandbox(): string {
  return process.env.RESEND_FROM_SANDBOX?.trim() || envLegacyFrom() || SANDBOX_DEFAULT_FROM;
}

function envFromProduction(): string {
  return process.env.RESEND_FROM_PRODUCTION?.trim() || PRODUCTION_DEFAULT_FROM;
}

function resolveKeysFromEnv(environment: ResendEnvironment): {
  sandboxKey: string;
  productionKey: string;
  source: 'env' | 'none';
} {
  const legacy = envLegacyApiKey();
  const sandboxEnv = envSandboxApiKey();
  const productionEnv = envProductionApiKey();
  const sandboxKey = sandboxEnv || (environment === 'sandbox' ? legacy : '');
  const productionKey = productionEnv || (environment === 'production' ? legacy : '');
  const source = sandboxKey || productionKey ? 'env' : 'none';
  return { sandboxKey, productionKey, source };
}

export async function getCertificateEmailEffectiveConfig(): Promise<CertificateEmailEffectiveConfig> {
  const doc = await readResendIntegrationDoc().catch(() => null);
  const envEnabled = envCertificateEmailEnabled();
  const fallbackEnv = envResendEnvironment();
  const envKeys = resolveKeysFromEnv(fallbackEnv);

  const environment: ResendEnvironment =
    doc?.environment === 'production' || doc?.environment === 'sandbox'
      ? doc.environment
      : fallbackEnv;

  const enabled = doc?.enabled ?? envEnabled;

  const legacyKey = doc?.apiKey?.trim() || '';
  const sandboxKey =
    doc?.apiKeySandbox?.trim() ||
    envKeys.sandboxKey ||
    '';
  const productionKey =
    doc?.apiKeyProduction?.trim() ||
    envKeys.productionKey ||
    '';

  const apiKey =
    environment === 'production'
      ? productionKey || legacyKey
      : sandboxKey || legacyKey;

  const legacyFrom = doc?.fromAddress?.trim() || '';
  const fromAddressSandbox =
    doc?.fromAddressSandbox?.trim() ||
    legacyFrom ||
    envFromSandbox();
  const fromAddressProduction =
    doc?.fromAddressProduction?.trim() ||
    envFromProduction();
  const fromAddress = environment === 'production' ? fromAddressProduction : fromAddressSandbox;

  const hasFirestoreSecrets = Boolean(
    doc?.apiKeySandbox?.trim() ||
      doc?.apiKeyProduction?.trim() ||
      doc?.apiKey?.trim(),
  );
  const source: CertificateEmailEffectiveConfig['source'] = hasFirestoreSecrets
    ? 'firestore'
    : envKeys.source;

  return {
    enabled,
    providerReady: Boolean(apiKey),
    environment,
    apiKey,
    fromAddress,
    source,
  };
}

export async function getResendIntegrationPublic(): Promise<ResendIntegrationPublic> {
  const doc = await readResendIntegrationDoc().catch(() => null);
  const environment = envResendEnvironment();
  const envKeys = resolveKeysFromEnv(environment);
  return buildResendIntegrationPublic(doc, {
    environment,
    enabled: envCertificateEmailEnabled(),
    sandboxKey: envKeys.sandboxKey,
    productionKey: envKeys.productionKey,
    fromAddressSandbox: envFromSandbox(),
    fromAddressProduction: envFromProduction(),
  });
}
