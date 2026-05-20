/** Origem pública do site (Open Graph, canonical, edge). */
export const SITE_ORIGIN = 'https://www.cdlpauloafonso.com';

/** Converte caminho relativo ou URL parcial em URL absoluta HTTPS para crawlers (WhatsApp, etc.). */
export function absolutePublicUrl(pathOrUrl: string | null | undefined): string | undefined {
  const raw = (pathOrUrl ?? '').trim();
  if (!raw) return undefined;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  try {
    return new URL(raw.startsWith('/') ? raw : `/${raw}`, SITE_ORIGIN).href;
  } catch {
    return undefined;
  }
}
