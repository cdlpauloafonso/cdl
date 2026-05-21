import { getAsaasConfig, type AsaasEffectiveConfig } from './config.js';

export class AsaasApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'AsaasApiError';
  }
}

export async function asaasRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  configOverride?: AsaasEffectiveConfig
): Promise<T> {
  const { apiKey, baseUrl, enabled } = configOverride ?? getAsaasConfig();
  if (!enabled) {
    throw new Error('ASAAS_NOT_CONFIGURED');
  }

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const errMsg =
      typeof data === 'object' &&
      data !== null &&
      'errors' in data &&
      Array.isArray((data as { errors: { description?: string }[] }).errors)
        ? (data as { errors: { description?: string }[] }).errors
            .map((e) => e.description)
            .filter(Boolean)
            .join('; ')
        : `Asaas HTTP ${res.status}`;
    throw new AsaasApiError(errMsg || `Asaas HTTP ${res.status}`, res.status, data);
  }

  return data as T;
}
