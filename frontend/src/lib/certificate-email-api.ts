import { waitForFirebaseAuthUser } from '@/lib/admin-auth';
import {
  API_NOT_CONFIGURED_MESSAGE,
  getApiBaseUrl,
  isApiConfiguredForClient,
} from '@/lib/api-base';

const API_BASE = getApiBaseUrl();

export type CertificateEmailConfig = {
  enabled: boolean;
  resendConfigured: boolean;
  providerReady: boolean;
  environment?: 'sandbox' | 'production';
  fromAddress?: string;
  source?: 'firestore' | 'env' | 'none';
  maxPerRequest: number;
  clientChunkSize: number;
};

export type CertificateEmailItemResult = {
  inscriptionId: string;
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  sentAt?: string;
};

export type CertificateEmailBatchResponse = {
  results: CertificateEmailItemResult[];
  summary: { total: number; sent: number; failed: number; skipped: number };
};

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!isApiConfiguredForClient()) {
    throw new Error(API_NOT_CONFIGURED_MESSAGE);
  }
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

async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Erro ${res.status}`);
  }
  return data as T;
}

export async function fetchCertificateEmailConfig(
  campaignId: string,
): Promise<CertificateEmailConfig | null> {
  try {
    return await adminJson<CertificateEmailConfig>(
      `/api/events/${encodeURIComponent(campaignId)}/certificates/email-config`,
    );
  } catch {
    return null;
  }
}

export async function sendCertificateEmailOne(
  campaignId: string,
  inscriptionId: string,
): Promise<{ ok: true; sentAt?: string } | { ok: false; error: string; skipped?: boolean }> {
  try {
    const data = await adminJson<{
      ok: boolean;
      sentAt?: string;
      error?: string;
      skipped?: boolean;
      reason?: string;
    }>(
      `/api/events/${encodeURIComponent(campaignId)}/certificates/${encodeURIComponent(inscriptionId)}/send-email`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    if (data.ok) return { ok: true, sentAt: data.sentAt };
    return { ok: false, error: data.error ?? 'Falha no envio.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha no envio.';
    if (/já enviado|anteriormente/i.test(msg)) {
      return { ok: false, skipped: true, error: msg };
    }
    return { ok: false, error: msg };
  }
}

export async function sendCertificateEmailBatch(
  campaignId: string,
  inscriptionIds: string[],
): Promise<CertificateEmailBatchResponse> {
  return adminJson<CertificateEmailBatchResponse>(
    `/api/events/${encodeURIComponent(campaignId)}/certificates/send-email-batch`,
    { method: 'POST', body: JSON.stringify({ inscriptionIds }) },
  );
}

export function chunkInscriptionIds(ids: string[], chunkSize: number): string[][] {
  const size = Math.max(1, chunkSize);
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/**
 * Divide lotes grandes em várias requisições; o servidor aplica pausa entre cada e-mail.
 */
export async function sendCertificateEmailsManaged(
  campaignId: string,
  inscriptionIds: string[],
  chunkSize: number,
  onProgress?: (done: number, total: number) => void,
): Promise<CertificateEmailBatchResponse> {
  const chunks = chunkInscriptionIds(inscriptionIds, chunkSize);
  const allResults: CertificateEmailItemResult[] = [];
  let done = 0;
  const total = inscriptionIds.length;

  for (const chunk of chunks) {
    const batch = await sendCertificateEmailBatch(campaignId, chunk);
    allResults.push(...batch.results);
    done += chunk.length;
    onProgress?.(done, total);
  }

  const sent = allResults.filter((r) => r.ok).length;
  const skipped = allResults.filter((r) => r.skipped).length;
  const failed = allResults.length - sent - skipped;

  return {
    results: allResults,
    summary: { total: allResults.length, sent, failed, skipped },
  };
}
