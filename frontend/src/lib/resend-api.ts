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

export type ResendEnvironment = 'sandbox' | 'production';

export type ResendIntegrationStatus = {
  enabled: boolean;
  providerReady: boolean;
  environment: ResendEnvironment;
  fromAddress: string;
  source: 'firestore' | 'env' | 'none';
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
  fromAddress: string;
  updatedAt: string | null;
  updatedBy: string | null;
  source: 'firestore' | 'env' | 'none';
};

export type ResendIntegrationUpdate = {
  environment?: ResendEnvironment;
  enabled?: boolean;
  apiKeySandbox?: string;
  apiKeyProduction?: string;
  fromAddressSandbox?: string;
  fromAddressProduction?: string;
  clearSandboxKey?: boolean;
  clearProductionKey?: boolean;
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

export async function fetchResendIntegrationStatus(): Promise<ResendIntegrationStatus | null> {
  if (!isApiConfiguredForClient()) return null;
  try {
    const res = await fetch(`${API_BASE}/api/resend/status`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as ResendIntegrationStatus;
  } catch {
    return null;
  }
}

function resendApiErrorMessage(status: number, serverError?: string): string {
  if (serverError) return serverError;
  if (status === 404) {
    return 'Rotas Resend não encontradas no servidor. Atualize o backend (deploy) e reinicie o PM2.';
  }
  return `Erro ${status}`;
}

export async function fetchResendIntegration(): Promise<ResendIntegrationPublic> {
  const res = await adminFetch('/api/resend/integration');
  const data = (await res.json().catch(() => ({}))) as Partial<ResendIntegrationPublic> & {
    error?: string;
  };
  if (!res.ok) throw new Error(resendApiErrorMessage(res.status, data.error));
  return data as ResendIntegrationPublic;
}

export async function saveResendIntegration(
  patch: ResendIntegrationUpdate,
): Promise<ResendIntegrationPublic> {
  const res = await adminFetch('/api/resend/integration', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ResendIntegrationPublic> & {
    error?: string;
  };
  if (!res.ok) throw new Error(resendApiErrorMessage(res.status, data.error));
  return data as ResendIntegrationPublic;
}

export async function testResendIntegration(): Promise<{
  ok: boolean;
  environment?: ResendEnvironment;
  fromAddress?: string;
  domainsCount?: number;
  error?: string;
}> {
  try {
    const res = await adminFetch('/api/resend/integration/test', { method: 'POST' });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      environment?: ResendEnvironment;
      fromAddress?: string;
      domainsCount?: number;
      error?: string;
    };
    return {
      ok: Boolean(data.ok),
      environment: data.environment,
      fromAddress: data.fromAddress,
      domainsCount: data.domainsCount,
      error: data.error,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha de rede.' };
  }
}
