/**
 * Limite de inscrições no site: parsing defensivo (Firestore / formulários podem gravar string ou float).
 */

/** Inteiro > 0 ou null se não houver limite válido. */
export function parsePositiveInscriptionLimit(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const i = Math.floor(value);
    return i > 0 ? i : null;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return null;
    const n = parseInt(t, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Contador público (>= 0). */
export function parseInscriptionWebCountField(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return 0;
    const n = parseInt(t, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}
