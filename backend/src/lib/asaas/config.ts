export type AsaasEnvironment = 'sandbox' | 'production';

export function getAsaasConfig() {
  const env = (process.env.ASAAS_ENV ?? 'sandbox').toLowerCase() as AsaasEnvironment;
  const apiKey = process.env.ASAAS_API_KEY?.trim() ?? '';
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim() ?? '';
  const baseUrl =
    env === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';

  return {
    env,
    apiKey,
    webhookToken,
    baseUrl,
    enabled: Boolean(apiKey) && process.env.ASAAS_ENABLED !== 'false',
  };
}

export function isAsaasConfigured(): boolean {
  return getAsaasConfig().enabled;
}
