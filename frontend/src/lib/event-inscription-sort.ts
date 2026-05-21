import type { EventInscriptionRecord } from './firestore';
import { isInscriptionCredentialed } from './event-credentialing';

export type EventInscriptionRow = EventInscriptionRecord & { id: string };

/** Converte ISO string ou Timestamp do Firestore em milissegundos. */
export function inscriptionDateMillis(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'string') {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof v === 'object' && v !== null && typeof (v as { seconds?: number }).seconds === 'number') {
    return (v as { seconds: number }).seconds * 1000;
  }
  return 0;
}

export function compareByCreatedAtDesc(a: EventInscriptionRow, b: EventInscriptionRow): number {
  const diff = inscriptionDateMillis(b.createdAt) - inscriptionDateMillis(a.createdAt);
  if (diff !== 0) return diff;
  return b.id.localeCompare(a.id);
}

export function compareByCredentialedAtDesc(a: EventInscriptionRow, b: EventInscriptionRow): number {
  const diff =
    inscriptionDateMillis(b.credentialedAt) - inscriptionDateMillis(a.credentialedAt);
  if (diff !== 0) return diff;
  return compareByCreatedAtDesc(a, b);
}

/** Mais recentes primeiro (data de inscrição). */
export function pickUltimosInscritos(lista: EventInscriptionRow[], limit = 5): EventInscriptionRow[] {
  return [...lista].sort(compareByCreatedAtDesc).slice(0, limit);
}

/** Mais recentes primeiro (data de credenciamento). */
export function pickUltimosCredenciados(
  lista: EventInscriptionRow[],
  limit = 5,
): EventInscriptionRow[] {
  return lista.filter(isInscriptionCredentialed).sort(compareByCredentialedAtDesc).slice(0, limit);
}
