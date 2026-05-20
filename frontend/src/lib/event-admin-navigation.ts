/** Lista principal de eventos no admin. */
export const EVENT_ADMIN_LIST_PATH = '/admin/eventos';

const RETURN_TO_PARAM = 'returnTo';

/** Evita open redirect: só caminhos internos do admin de eventos. */
export function sanitizeEventAdminReturnTo(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const path = decodeURIComponent(value.trim());
    if (!path.startsWith('/admin/eventos')) return null;
    if (path.includes('://') || path.includes('..')) return null;
    return path;
  } catch {
    return null;
  }
}

export function eventDetailsPath(eventId: string): string {
  return `/admin/eventos/${encodeURIComponent(eventId)}`;
}

/** Página de detalhes; `returnTo` opcional (ex.: lista de eventos). */
export function eventDetailsHref(eventId: string, returnTo?: string | null): string {
  const base = eventDetailsPath(eventId);
  const safe = sanitizeEventAdminReturnTo(returnTo ?? null);
  if (!safe || safe === EVENT_ADMIN_LIST_PATH) return base;
  return `${base}?${RETURN_TO_PARAM}=${encodeURIComponent(safe)}`;
}

export type EventSubPage = 'inscritos' | 'credenciamento' | 'certificados';

/** Subpáginas (inscritos, credenciamento, certificados) com `returnTo` = tela anterior. */
export function eventSubPageHref(
  page: EventSubPage,
  eventId: string,
  returnTo: string
): string {
  const params = new URLSearchParams();
  params.set('eventId', eventId);
  const safe = sanitizeEventAdminReturnTo(returnTo);
  if (safe) params.set(RETURN_TO_PARAM, safe);
  return `/admin/eventos/${page}?${params.toString()}`;
}

export function resolveEventAdminBackHref(
  returnToParam: string | null | undefined,
  fallback: string
): string {
  return sanitizeEventAdminReturnTo(returnToParam) ?? fallback;
}

export function getEventAdminBackLabel(backHref: string): string {
  const path = (backHref.split('?')[0] ?? backHref).replace(/\/$/, '');
  if (path === EVENT_ADMIN_LIST_PATH) return 'Eventos';
  if (path.endsWith('/inscritos')) return 'Inscritos no evento';
  if (path.endsWith('/credenciamento')) return 'Credenciamento';
  if (path.endsWith('/certificados')) return 'Certificados';
  if (/^\/admin\/eventos\/[^/]+$/.test(path)) return 'Detalhes do evento';
  return 'Voltar';
}

export function currentAdminPath(pathname: string, searchString: string): string {
  const q = searchString.replace(/^\?/, '');
  return q ? `${pathname}?${q}` : pathname;
}
