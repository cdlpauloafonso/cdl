import { apiGet, apiPost } from '@/lib/api';

export type CertificateEmailConfig = {
  enabled: boolean;
  smtpConfigured: boolean;
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

export async function fetchCertificateEmailConfig(
  campaignId: string
): Promise<CertificateEmailConfig | null> {
  try {
    return await apiGet<CertificateEmailConfig>(
      `/events/${encodeURIComponent(campaignId)}/certificates/email-config`
    );
  } catch {
    return null;
  }
}

export async function sendCertificateEmailOne(
  campaignId: string,
  inscriptionId: string
): Promise<{ ok: true; sentAt?: string } | { ok: false; error: string; skipped?: boolean }> {
  try {
    const data = await apiPost<{ ok: boolean; sentAt?: string; error?: string; skipped?: boolean; reason?: string }>(
      `/events/${encodeURIComponent(campaignId)}/certificates/${encodeURIComponent(inscriptionId)}/send-email`,
      {}
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
  inscriptionIds: string[]
): Promise<CertificateEmailBatchResponse> {
  return apiPost<CertificateEmailBatchResponse>(
    `/events/${encodeURIComponent(campaignId)}/certificates/send-email-batch`,
    { inscriptionIds }
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
  onProgress?: (done: number, total: number) => void
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
