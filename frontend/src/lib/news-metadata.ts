import type { Metadata } from 'next';
import { getNewsBySlugAtBuild } from '@/lib/firestore-build';

const SITE_NAME = 'CDL Paulo Afonso';

function plainExcerpt(htmlOrText: string, maxLen: number): string {
  const t = htmlOrText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

/**
 * Metadados para SEO e compartilhamento (WhatsApp, Facebook, X, LinkedIn).
 * Depende de `getNewsBySlugAtBuild` (Firebase Admin em produção / build).
 */
export async function buildMetadataForNewsSlug(slug: string): Promise<Metadata> {
  const s = slug.trim();
  if (!s || s === 'not-found') {
    return {
      title: `Notícia | ${SITE_NAME}`,
      description: 'Notícias da CDL Paulo Afonso.',
    };
  }

  const news = await getNewsBySlugAtBuild(s);
  if (!news) {
    return {
      title: `Notícia | ${SITE_NAME}`,
      description: 'Notícias da CDL Paulo Afonso.',
    };
  }

  const description = plainExcerpt(news.excerpt || news.title, 160);
  const title = `${news.title} | ${SITE_NAME}`;
  const canonicalPath = `/noticias/${encodeURIComponent(s)}`;
  const ogImages = news.image
    ? [{ url: news.image, alt: news.title }]
    : [{ url: '/logo-site.png', alt: SITE_NAME }];

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'article',
      locale: 'pt_BR',
      siteName: SITE_NAME,
      url: canonicalPath,
      title: news.title,
      description,
      publishedTime: news.publishedAt,
      images: ogImages,
    },
    twitter: {
      card: news.image ? 'summary_large_image' : 'summary',
      title: news.title,
      description,
      images: news.image ? [news.image] : ['/logo-site.png'],
    },
  };
}
