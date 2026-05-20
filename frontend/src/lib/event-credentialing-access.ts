import { deleteField, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firestore';

export const CREDENTIALING_TOKEN_PARAM = 'token';

export function generateCredentialingAccessToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function publicCredentialingPageUrl(eventId: string, token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const q = new URLSearchParams({
    eventId,
    [CREDENTIALING_TOKEN_PARAM]: token,
  });
  return `${origin}/institucional/eventos/credenciamento?${q.toString()}`;
}

export type CredentialingSessionResponse = {
  ok: boolean;
  sessionId?: string;
  eventTitle?: string;
  error?: string;
};

/**
 * Abre sessão de credenciamento público (valida o token via Firestore Rules).
 * Retorna sessionId para marcar check-in nas inscrições.
 */
export async function establishCredentialingSession(
  eventId: string,
  token: string,
  eventTitle?: string,
): Promise<CredentialingSessionResponse> {
  if (!eventId.trim() || !token.trim()) {
    return { ok: false, error: 'Link incompleto.' };
  }

  const sessionId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : generateCredentialingAccessToken().slice(0, 36);

  const db = getDb();
  try {
    await setDoc(doc(db, 'campaigns', eventId, 'credentialingGate', sessionId), {
      token: token.trim(),
      createdAt: serverTimestamp(),
    });
    return { ok: true, sessionId, eventTitle: eventTitle ?? '' };
  } catch {
    return { ok: false, error: 'Link inválido ou expirado.' };
  }
}

export async function setInscriptionCredentialedViaSession(
  eventId: string,
  inscriptionId: string,
  sessionId: string,
  credentialed: boolean,
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'campaigns', eventId, 'inscricoes', inscriptionId), {
    credentialedAt: credentialed ? new Date().toISOString() : deleteField(),
    credentialingSessionId: sessionId,
  });
}
