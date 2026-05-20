import type { EventInscriptionRecord } from '@/lib/firestore';

export function isInscriptionCredentialed(row: Pick<EventInscriptionRecord, 'credentialedAt'>): boolean {
  const t = (row.credentialedAt ?? '').trim();
  return t.length > 0;
}

export function formatCredentialedAt(iso: string | null | undefined): string {
  const raw = (iso ?? '').trim();
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}
