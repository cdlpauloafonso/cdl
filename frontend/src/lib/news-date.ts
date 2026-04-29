/** Data local de hoje no formato do input date (YYYY-MM-DD). */
export function todayLocalIsoDate(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converte valor de `<input type="date">` (YYYY-MM-DD) para ISO sem “voltar um dia” no fuso BR.
 * Usa meio-dia no fuso local para evitar bordas de DST.
 */
export function isoFromDateInput(dateStr: string): string {
  const s = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date().toISOString();
  }
  const [y, m, d] = s.split('-').map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) {
    return new Date().toISOString();
  }
  const localNoon = new Date(y, m - 1, d, 12, 0, 0, 0);
  return localNoon.toISOString();
}

export type FormatNewsDateVariant = 'long' | 'short';

/**
 * Exibe data de publicação em pt-BR.
 * Corrige legado salvo como `...T00:00:00.000Z` a partir do date input (meia-noite UTC = dia anterior no BR).
 */
export function formatNewsPublishedDate(
  publishedAt: string | undefined | null,
  variant: FormatNewsDateVariant = 'long'
): string {
  if (publishedAt == null || publishedAt === '') return '';
  const s = publishedAt.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return '';
    return variant === 'long'
      ? dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      : dt.toLocaleDateString('pt-BR');
  }

  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return '';

  if (/T00:00:00\.000Z$/i.test(s)) {
    const utcCal = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
    return variant === 'long'
      ? utcCal.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
      : utcCal.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  return variant === 'long'
    ? dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    : dt.toLocaleDateString('pt-BR');
}
