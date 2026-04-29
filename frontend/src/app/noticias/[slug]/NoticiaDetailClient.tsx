'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getNewsBySlug, type NewsItemFirestore, type NewsLink } from '@/lib/firestore';
import { shareNewsArticle } from '@/lib/share-news';
import { formatNewsPublishedDate } from '@/lib/news-date';
import { isProbablyHtml } from '@/lib/news-content-format';

export function NoticiaDetailClient({ slug }: { slug: string }) {
  const [news, setNews] = useState<NewsItemFirestore | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    // Se for fallback, não tenta buscar no Firestore
    if (slug === 'not-found') {
      setNews(null);
      return;
    }
    
    getNewsBySlug(slug)
      .then((n) => setNews(n ?? null))
      .catch(() => setNews(null));
  }, [slug]);

  if (news === undefined) {
    return (
      <div className="py-12 text-center text-cdl-gray-text">
        Carregando...
      </div>
    );
  }

  if (news === null) {
    // Se for fallback, mostra mensagem amigável em vez de 404
    if (slug === 'not-found') {
      return (
        <div className="py-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Notícia não encontrada
            </h1>
            <p className="text-lg text-cdl-gray-text mb-8">
              Esta notícia não está disponível no momento. Verifique a lista de notícias para encontrar outras publicações.
            </p>
            <Link
              href="/noticias"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Ver todas as notícias
            </Link>
          </div>
        </div>
      );
    }
    
    notFound();
  }

  async function handleShare() {
    const n = news;
    if (n === undefined || n === null) return;
    const s = (n.slug ?? slug ?? '').trim();
    if (!s) return;
    setSharing(true);
    try {
      const result = await shareNewsArticle({
        title: n.title,
        excerpt: n.excerpt,
        slug: s,
      });
      if (result.ok && result.method === 'clipboard') {
        alert('Link da notícia copiado para a área de transferência.');
      }
      if (!result.ok && result.reason === 'error') {
        alert('Não foi possível compartilhar agora. Tente novamente.');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <article className="py-12 sm:py-16">
      <div className="container-cdl max-w-3xl">
        <Link href="/noticias" className="text-sm text-cdl-blue hover:underline mb-6 inline-block">
          ← Voltar às notícias
        </Link>

        {news.image && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-cdl-gray mb-8 shadow-lg">
            <Image
              src={news.image.startsWith('http') ? news.image : news.image}
              alt={news.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              priority
            />
          </div>
        )}

        <div className="mb-6">
          {news.publishedAt && (
            <time className="text-sm font-medium text-cdl-blue mb-3 block" dateTime={news.publishedAt}>
              {formatNewsPublishedDate(news.publishedAt, 'long')}
            </time>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">{news.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={sharing || !(news.slug ?? slug ?? '').trim()}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-cdl-blue bg-white px-4 py-2.5 text-sm font-semibold text-cdl-blue transition-colors hover:bg-cdl-blue hover:text-white disabled:opacity-50"
              aria-label="Compartilhar esta notícia"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              {sharing ? 'Compartilhando...' : 'Compartilhar notícia'}
            </button>
          </div>
        </div>

        {isProbablyHtml(news.content) ? (
          <div
            className="news-article-body mt-8 max-w-none text-gray-700 prose prose-neutral prose-lg sm:prose-xl prose-p:leading-relaxed prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:font-medium prose-a:text-cdl-blue prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-gray-900 prose-ul:my-4 prose-ol:my-4 prose-li:my-1.5 prose-blockquote:border-cdl-blue prose-blockquote:text-gray-600 prose-img:rounded-xl prose-hr:border-gray-200"
            dangerouslySetInnerHTML={{ __html: news.content }}
          />
        ) : (
          <div className="news-article-body mt-8 whitespace-pre-wrap text-base leading-relaxed text-gray-700 sm:text-lg">
            {news.content}
          </div>
        )}

        {news.links && Array.isArray(news.links) && news.links.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Links relacionados</h2>
            <div className="flex flex-wrap gap-3">
              {news.links.map((link: NewsLink, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target={link.type === 'external' ? '_blank' : undefined}
                  rel={link.type === 'external' ? 'noopener noreferrer' : undefined}
                  download={link.type === 'download' ? true : undefined}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-cdl-blue text-cdl-blue font-medium hover:bg-cdl-blue hover:text-white transition-colors"
                >
                  {link.type === 'download' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                  {link.label || link.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
