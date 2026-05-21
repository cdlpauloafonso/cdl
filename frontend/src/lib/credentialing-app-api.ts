import { getApiBaseUrl, isApiConfiguredForClient, API_NOT_CONFIGURED_MESSAGE } from '@/lib/api-base';

export type AppCredentialingSessionResponse = {
  ok: boolean;
  sessionId?: string;
  eventTitle?: string;
  error?: string;
};

/** Abre sessão de credenciamento no app (valida token WebView + flag no evento). */
export async function establishAppCredentialingSession(
  eventId: string,
  mobileToken: string,
): Promise<AppCredentialingSessionResponse> {
  if (!eventId.trim() || !mobileToken.trim()) {
    return { ok: false, error: 'Parâmetros inválidos.' };
  }
  if (!isApiConfiguredForClient()) {
    return { ok: false, error: API_NOT_CONFIGURED_MESSAGE };
  }

  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/credentialing/app-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: eventId.trim(), mobileToken: mobileToken.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as AppCredentialingSessionResponse & {
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Não foi possível abrir o credenciamento.' };
    }
    if (!data.ok || !data.sessionId) {
      return { ok: false, error: data.error ?? 'Sessão inválida.' };
    }
    return data;
  } catch {
    return { ok: false, error: 'Falha de conexão com o servidor.' };
  }
}
