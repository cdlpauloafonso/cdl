import { readAsaasIntegrationDoc, type AsaasEnvironment as AsaasEnvironmentDoc } from './integration-store.js';

export type AsaasEnvironment = AsaasEnvironmentDoc;

export type AsaasEffectiveConfig = {
  env: AsaasEnvironment;
  apiKey: string;
  webhookToken: string;
  baseUrl: string;
  enabled: boolean;
};

function baseUrlFor(env: AsaasEnvironment): string {
  return env === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';
}

/**
 * Versão síncrona (fallback do .env). Mantida por compatibilidade.
 * Prefira getAsaasConfigEffective() em rotas e libs novas.
 */
export function getAsaasConfig(): AsaasEffectiveConfig {
  const env = (process.env.ASAAS_ENV ?? 'sandbox').toLowerCase() as AsaasEnvironment;
  const apiKey = process.env.ASAAS_API_KEY?.trim() ?? '';
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim() ?? '';

  return {
    env,
    apiKey,
    webhookToken,
    baseUrl: baseUrlFor(env),
    enabled: Boolean(apiKey) && process.env.ASAAS_ENABLED !== 'false',
  };
}

export function isAsaasConfigured(): boolean {
  return getAsaasConfig().enabled;
}

/**
 * Configuração consolidada: Firestore (admin) tem prioridade sobre .env.
 * Use em fluxos de pagamento / webhook / status.
 */
export async function getAsaasConfigEffective(): Promise<AsaasEffectiveConfig> {
  const fallback = getAsaasConfig();
  const sandboxEnv = process.env.ASAAS_API_KEY_SANDBOX?.trim() ?? '';
  const productionEnv = process.env.ASAAS_API_KEY_PRODUCTION?.trim() ?? '';

  let doc = null;
  try {
    doc = await readAsaasIntegrationDoc();
  } catch {
    doc = null;
  }

  const environment: AsaasEnvironment =
    doc?.environment === 'production' || doc?.environment === 'sandbox'
      ? doc.environment
      : fallback.env;

  const enabledDb = typeof doc?.enabled === 'boolean' ? doc.enabled : null;
  const enabled = enabledDb !== null ? enabledDb : process.env.ASAAS_ENABLED !== 'false';

  const sandboxKey = doc?.apiKeySandbox || sandboxEnv || (fallback.env === 'sandbox' ? fallback.apiKey : '');
  const productionKey =
    doc?.apiKeyProduction || productionEnv || (fallback.env === 'production' ? fallback.apiKey : '');

  const apiKey = environment === 'production' ? productionKey : sandboxKey;
  const webhookToken = doc?.webhookToken || fallback.webhookToken || '';

  return {
    env: environment,
    apiKey,
    webhookToken,
    baseUrl: baseUrlFor(environment),
    enabled: Boolean(apiKey) && enabled,
  };
}

export async function isAsaasConfiguredEffective(): Promise<boolean> {
  return (await getAsaasConfigEffective()).enabled;
}
