/** Resolve slug para detalhe a partir da query (?slug?) e do pathname (incl. `/m/…/noticias/…`). */
export function resolveNewsSlugFromSearchAndPath(
  searchParams: Pick<URLSearchParams, 'get'>,
  pathname: string | null,
): string {
  const fromQuery = (searchParams.get('slug') ?? searchParams.get('id') ?? '').trim();
  if (fromQuery) return fromQuery;
  if (!pathname) return '';
  const parts = pathname.split('/').filter(Boolean);
  const ni = parts.indexOf('noticias');
  if (ni === -1 || ni >= parts.length - 1) return '';
  const last = parts[parts.length - 1] ?? '';
  if (last === 'ver') return '';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}
