/** Prefixo do payload de credenciamento em QR Code. */
export const CREDENTIALING_QR_PREFIX = 'CDL-CRED:v1:';

export type ParsedCredentialingQr = {
  eventId: string;
  inscriptionId: string;
};

/** Gera o texto codificado no QR Code do participante. */
export function buildCredentialingQrPayload(eventId: string, inscriptionId: string): string {
  return `${CREDENTIALING_QR_PREFIX}${eventId.trim()}:${inscriptionId.trim()}`;
}

/**
 * Interpreta leitura do scanner (payload CDL, URL com query ou id da inscrição).
 * `expectedEventId` garante que o QR pertence ao evento aberto na tela.
 */
export function parseCredentialingQrPayload(
  raw: string,
  expectedEventId: string,
): ParsedCredentialingQr | null {
  const text = raw.trim();
  if (!text || !expectedEventId.trim()) return null;
  const eventId = expectedEventId.trim();

  if (text.startsWith(CREDENTIALING_QR_PREFIX)) {
    const rest = text.slice(CREDENTIALING_QR_PREFIX.length);
    const colon = rest.indexOf(':');
    if (colon <= 0) return null;
    const scannedEventId = rest.slice(0, colon).trim();
    const inscriptionId = rest.slice(colon + 1).trim();
    if (!inscriptionId || scannedEventId !== eventId) return null;
    return { eventId, inscriptionId };
  }

  try {
    const url = new URL(text);
    const fromQuery =
      url.searchParams.get('inscriptionId') ??
      url.searchParams.get('inscricao') ??
      url.searchParams.get('id');
    const urlEventId = url.searchParams.get('eventId') ?? url.searchParams.get('evento');
    if (fromQuery) {
      if (urlEventId && urlEventId.trim() !== eventId) return null;
      return { eventId, inscriptionId: fromQuery.trim() };
    }
  } catch {
    /* não é URL */
  }

  if (/^[a-zA-Z0-9_-]{8,128}$/.test(text)) {
    return { eventId, inscriptionId: text };
  }

  return null;
}
