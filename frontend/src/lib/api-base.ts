/** URL base da API Express (sem barra final). */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return 'http://localhost:4000';
}

/**
 * No browser em produção, só chama a API se NEXT_PUBLIC_API_URL foi definida no build
 * (Netlify) ou se o host é localhost (dev).
 */
export function isApiConfiguredForClient(): boolean {
  if (process.env.NEXT_PUBLIC_API_URL) return true;
  if (typeof window === 'undefined') return !!process.env.NEXT_PUBLIC_API_URL;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export const API_NOT_CONFIGURED_MESSAGE =
  'A API não está acessível neste ambiente. No Netlify, defina NEXT_PUBLIC_API_URL (ex.: https://apiassas.cdlpauloafonso.com), faça um novo deploy e garanta que o backend está no ar nesse endereço.';
