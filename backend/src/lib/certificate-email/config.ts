/** Envio de certificados por e-mail (Resend). Preferir getCertificateEmailEffectiveConfig() para checagens async. */

/** Máximo de inscrições processadas por requisição HTTP (evita timeout). */
export function certificateEmailMaxPerRequest(): number {
  const n = Number(process.env.CERTIFICATE_EMAIL_MAX_PER_REQUEST);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 50) : 20;
}

/** Pausa entre cada e-mail dentro de um lote (ms). */
export function certificateEmailDelayMs(): number {
  const n = Number(process.env.CERTIFICATE_EMAIL_DELAY_MS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3000;
}

/** Tamanho sugerido para o frontend agrupar chamadas à API. */
export function certificateEmailClientChunkSize(): number {
  const n = Number(process.env.CERTIFICATE_EMAIL_CLIENT_CHUNK_SIZE);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 50) : 15;
}

