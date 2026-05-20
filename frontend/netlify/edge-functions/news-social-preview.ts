import type { Context } from '@netlify/edge-functions';

const SITE_ORIGIN = 'https://www.cdlpauloafonso.com';
const SITE_NAME = 'CDL Paulo Afonso';
const PROJECT_ID = 'sitecdl';
const API_KEY = 'AIzaSyD9NjTI1Z_QvvL0pqTtL7xdoP6uEb5HiE0';

/** User-agents que leem Open Graph sem executar o app React. */
const SOCIAL_CRAWLER_UA =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|Pinterestbot|Google-Extended/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainExcerpt(htmlOrText: string, maxLen: number): string {
  const t = htmlOrText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

function fieldString(fields: Record<string, { stringValue?: string; nullValue?: null }>, key: string): string {
  const f = fields[key];
  if (!f || f.nullValue != null) return '';
  return f.stringValue ?? '';
}

async function fetchNewsBySlug(slug: string): Promise<{
  title: string;
  excerpt: string;
  image: string | null;
} | null> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'news' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'slug' },
                    op: 'EQUAL',
                    value: { stringValue: slug },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'published' },
                    op: 'EQUAL',
                    value: { booleanValue: true },
                  },
                },
              ],
            },
          },
          limit: 1,
        },
      }),
    },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ document?: { fields?: Record<string, { stringValue?: string; nullValue?: null }> } }>;
  const fields = rows[0]?.document?.fields;
  if (!fields) return null;
  const image = fieldString(fields, 'image');
  return {
    title: fieldString(fields, 'title'),
    excerpt: fieldString(fields, 'excerpt'),
    image: image || null,
  };
}

function buildPreviewHtml(slug: string, news: { title: string; excerpt: string; image: string | null }): string {
  const pageUrl = `${SITE_ORIGIN}/noticias/${encodeURIComponent(slug)}`;
  const description = plainExcerpt(news.excerpt || news.title, 160);
  const ogImage =
    news.image && (news.image.startsWith('http://') || news.image.startsWith('https://'))
      ? news.image
      : news.image
        ? `${SITE_ORIGIN}${news.image.startsWith('/') ? news.image : `/${news.image}`}`
        : `${SITE_ORIGIN}/logo-site.png`;
  const documentTitle = `${news.title} | ${SITE_NAME}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(documentTitle)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<link rel="canonical" href="${escapeHtml(pageUrl)}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}"/>
<meta property="og:locale" content="pt_BR"/>
<meta property="og:url" content="${escapeHtml(pageUrl)}"/>
<meta property="og:title" content="${escapeHtml(news.title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:image" content="${escapeHtml(ogImage)}"/>
<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}"/>
<meta property="og:image:alt" content="${escapeHtml(news.title)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(news.title)}"/>
<meta name="twitter:description" content="${escapeHtml(description)}"/>
<meta name="twitter:image" content="${escapeHtml(ogImage)}"/>
</head>
<body>
<p><a href="${escapeHtml(pageUrl)}">${escapeHtml(news.title)}</a></p>
</body>
</html>`;
}

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/noticias\/([^/]+)\/?$/);
  if (!match) return context.next();

  const slug = decodeURIComponent(match[1] ?? '').trim();
  if (!slug || slug === 'ver') return context.next();

  const ua = request.headers.get('user-agent') ?? '';
  if (!SOCIAL_CRAWLER_UA.test(ua)) return context.next();

  try {
    const news = await fetchNewsBySlug(slug);
    if (!news?.title) return context.next();

    return new Response(buildPreviewHtml(slug, news), {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600',
      },
    });
  } catch {
    return context.next();
  }
}

export const config = { path: '/noticias/*' };
