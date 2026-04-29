export type ShareNewsArticleResult =
  | { ok: true; method: 'native' | 'clipboard' | 'prompt' }
  | { ok: false; reason: 'no-slug' | 'cancelled' | 'error' };

/**
 * Compartilha link público da notícia (`/noticias/ver?slug=...`).
 * Web Share API → clipboard → prompt.
 */
export async function shareNewsArticle(params: {
  title: string;
  excerpt?: string;
  slug: string;
}): Promise<ShareNewsArticleResult> {
  const slug = params.slug.trim();
  if (!slug) return { ok: false, reason: 'no-slug' };

  if (typeof window === 'undefined') return { ok: false, reason: 'error' };

  const shareUrl = `${window.location.origin}/noticias/ver?slug=${encodeURIComponent(slug)}`;
  const shareText = `${params.title}\n${shareUrl}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: params.title,
        text: params.excerpt?.trim() || undefined,
        url: shareUrl,
      });
      return { ok: true, method: 'native' };
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      return { ok: true, method: 'clipboard' };
    }

    window.prompt('Copie o link da notícia:', shareUrl);
    return { ok: true, method: 'prompt' };
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError') return { ok: false, reason: 'cancelled' };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        return { ok: true, method: 'clipboard' };
      }
    } catch {
      /* fallthrough */
    }
    return { ok: false, reason: 'error' };
  }
}
