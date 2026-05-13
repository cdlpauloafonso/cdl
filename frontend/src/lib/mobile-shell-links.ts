/** Prefixo `/m/:token` (ex.: `/m/cdl-mobile-…`) quando o pathname está dentro do shell WebView. */
export function segmentFromMobilePathname(pathname: string): string | null {
  const m = pathname.match(/^(\/m\/[^/]+)(?:\/|$)/);
  return m ? m[1] : null;
}

function pathnameAndSearch(href: string): { pathname: string; search: string } {
  const q = href.indexOf('?');
  if (q === -1) return { pathname: href, search: '' };
  return { pathname: href.slice(0, q), search: href.slice(q) };
}

function safeDecodePathSegment(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Hostnames do site público (paths relativos após strip da origem). */
function siteHosts(): string[] {
  const out = new Set<string>(['www.cdlpauloafonso.com', 'cdlpauloafonso.com', 'localhost', '127.0.0.1']);
  const base = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL : undefined;
  if (base) {
    try {
      out.add(new URL(base).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  return [...out];
}

/**
 * Converte `https://www…/rota` em `/rota`, normaliza detalhe de campanha para `/ver?slug=` (modo app)
 * e devolve `mailto:` / `tel:` / URLs externas sem alteração.
 */
export function coerceToAppRelativePath(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^mailto:/i.test(t) || /^tel:/i.test(t)) return t;
  if (t.startsWith('/')) return canonicalizeInternalPathForWebview(t);
  if (!/^https?:\/\//i.test(t)) return t;
  try {
    const u = new URL(t);
    if (!siteHosts().includes(u.hostname.toLowerCase())) return t;
    const rel = (u.pathname || '/') + u.search;
    return canonicalizeInternalPathForWebview(rel);
  } catch {
    return t;
  }
}

/**
 * `/institucional/campanhas/{slug}` → `/institucional/campanhas/ver?slug=` (página adaptada no app).
 * `/institucional/campanhas/inscricao/{slug}` → query `?slug=` (path do site; shell cobre quando existir rota espelhada).
 */
function canonicalizeInternalPathForWebview(pathWithSearch: string): string {
  let { pathname, search } = pathnameAndSearch(pathWithSearch);
  if (!pathname || pathname === '') pathname = '/';

  const segs = pathname.split('/').filter(Boolean);

  if (segs.length >= 4 && segs[0] === 'institucional' && segs[1] === 'campanhas' && segs[2] === 'inscricao') {
    const slug = safeDecodePathSegment(segs[3]!);
    const sp = new URLSearchParams(search.replace(/^\?/, ''));
    if (!sp.has('slug')) sp.set('slug', slug);
    const q = sp.toString();
    return `/institucional/campanhas/inscricao${q ? `?${q}` : ''}`;
  }

  if (segs.length === 3 && segs[0] === 'institucional' && segs[1] === 'campanhas') {
    const slug = safeDecodePathSegment(segs[2]!);
    const reserved = new Set(['ver', 'inscricao']);
    if (!reserved.has(slug)) {
      const sp = new URLSearchParams(search.replace(/^\?/, ''));
      if (!sp.has('slug')) sp.set('slug', slug);
      const q = sp.toString();
      return `/institucional/campanhas/ver${q ? `?${q}` : ''}`;
    }
  }

  return pathname + search;
}

/** Rotas absolutas dentro do shell (path completo, sem subtrees genéricos). */
const APP_SHELL_EXACT_ROUTES = new Set([
  '/servicos',
  '/institucional/campanhas',
  '/institucional/nossa-cidade',
  '/area-associado',
  '/atendimento',
  '/indicadores-economicos',
]);

/** Prefixos dentro do shell (associações e páginas filhas declaradas no app). */
const APP_SHELL_ROUTE_PREFIXES = [
  '/associe-se',
  '/servicos/beneficios-associados',
  '/institucional/campanhas/ver',
] as const;

/**
 * Mantém navegação no mesmo shell do app quando o href é uma destas páginas “adaptadas”.
 * Suporta `?slug=` em `/institucional/campanhas/ver` e toda àrvore `/noticias/…`.
 * Normaliza URLs absolutas do domínio do site e detalhe de campanha em `/ver?slug=`.
 */
export function resolveAppShellHref(segment: string | null, href: string): string {
  const normalized = coerceToAppRelativePath(href);
  if (!segment || !normalized.startsWith('/')) return normalized;
  const { pathname, search } = pathnameAndSearch(normalized);

  // Notícias: lista (`/noticias`) + detalhe (`/noticias/slug`) + auxiliar `/noticias/ver`
  if (pathname === '/noticias' || pathname.startsWith('/noticias/')) {
    return `${segment}${pathname}${search}`;
  }

  if (APP_SHELL_EXACT_ROUTES.has(pathname)) {
    return `${segment}${pathname}${search}`;
  }

  for (const p of APP_SHELL_ROUTE_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`)) {
      return `${segment}${pathname}${search}`;
    }
  }

  return normalized;
}

/** `true` quando o destino deve usar `<a>` nativo (site externo, mailto, tel). */
export function shouldUseNativeAnchorForMobileNav(href: string): boolean {
  const t = coerceToAppRelativePath(href).trim();
  if (/^mailto:/i.test(t) || /^tel:/i.test(t)) return true;
  return /^https?:\/\//i.test(t);
}

/**
 * Raiz absoluta do site institucional (fora da shell `/m/`), para abrir em navegador/Safari.
 * Usa `NEXT_PUBLIC_SITE_URL` em dev/host custom; caso contrário produção.
 */
export function getMarketingSiteHomeAbsoluteUrl(): string {
  const raw =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL?.trim()
      ? process.env.NEXT_PUBLIC_SITE_URL.trim()
      : null;
  if (raw) {
    try {
      return new URL('/', raw.endsWith('/') ? raw : `${raw}/`).href;
    } catch {
      /* ignore */
    }
  }
  return 'https://www.cdlpauloafonso.com/';
}

/** @deprecated use `resolveAppShellHref` */
export function resolveAssocieHrefInMobileShell(segment: string | null, href: string): string {
  return resolveAppShellHref(segment, href);
}
