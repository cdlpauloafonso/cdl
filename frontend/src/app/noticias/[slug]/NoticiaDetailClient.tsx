'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getNewsBySlug, type NewsItemFirestore, type NewsLink } from '@/lib/firestore';
import { shareNewsArticle } from '@/lib/share-news';
import { formatNewsPublishedDate } from '@/lib/news-date';
import { isProbablyHtml } from '@/lib/news-content-format';
import { MobileNewsReaderSurface, MobileNewsReaderToolbar } from '@/components/mobile-web/MobileNewsReaderShell';

export function NoticiaDetailClient({
  slug,
  noticiasIndexHref = '/noticias',
  mobileShell = false,
}: {
  slug: string;
  noticiasIndexHref?: string;
  mobileShell?: boolean;
}) {
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

  if (news === undefined) {
    if (mobileShell) {
      return (
        <div className="flex min-h-0 flex-1 flex-col bg-[#0b1224]">
          <MobileNewsReaderToolbar
            noticiasIndexHref={noticiasIndexHref}
            shareDisabled
            sharing={false}
            onShareClick={() => {}}
          />
          <MobileNewsReaderSurface>
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-cdl-blue/20 border-t-cdl-blue" aria-hidden />
              <p className="text-[13px] text-slate-500">Carregando artigo…</p>
            </div>
          </MobileNewsReaderSurface>
        </div>
      );
    }
    return (
      <div className="py-12 text-center text-cdl-gray-text">
        Carregando...
      </div>
    );
  }

  if (news === null) {
    // Se for fallback, mostra mensagem amigável em vez de 404
    if (slug === 'not-found') {
      if (mobileShell) {
        return (
          <div className="flex min-h-0 flex-1 flex-col bg-[#0b1224]">
            <MobileNewsReaderToolbar
              noticiasIndexHref={noticiasIndexHref}
              shareDisabled
              sharing={false}
              onShareClick={() => {}}
            />
            <MobileNewsReaderSurface>
              <div className="mx-auto max-w-xl py-8 text-center">
                <h1 className="mb-3 text-xl font-bold text-slate-900">Notícia não encontrada</h1>
                <p className="mb-8 text-[14px] leading-relaxed text-slate-600">
                  Esta notícia não está disponível no momento. Consulte a lista para outras publicações.
                </p>
                <Link
                  href={noticiasIndexHref}
                  prefetch={false}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cdl-blue px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-cdl-blue-dark"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Lista de notícias
                </Link>
              </div>
            </MobileNewsReaderSurface>
          </div>
        );
      }
      return (
        <div className="py-12 text-center">
          <div className="mx-auto max-w-2xl">
            <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Notícia não encontrada
            </h1>
            <p className="mb-8 text-lg text-cdl-gray-text">
              Esta notícia não está disponível no momento. Verifique a lista de notícias para encontrar outras publicações.
            </p>
            <Link
              href={noticiasIndexHref}
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-lg bg-cdl-blue px-6 py-3 text-white transition-colors hover:bg-cdl-blue-dark"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  // —— App WebView: leitura focada só no conteúdo ——
  if (mobileShell) {
    const shareSlug = (news.slug ?? slug ?? '').trim();
    const showShare = !!shareSlug;

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[#0b1224]">
        <MobileNewsReaderToolbar
          noticiasIndexHref={noticiasIndexHref}
          shareDisabled={!showShare}
          sharing={sharing}
          onShareClick={handleShare}
        />

        <MobileNewsReaderSurface>
          <h1 className="text-balance text-[1.375rem] font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
            {news.title}
          </h1>

          {news.publishedAt ?
            <time className="mt-3 block text-[12px] font-medium uppercase tracking-wide text-slate-500" dateTime={news.publishedAt}>
              {formatNewsPublishedDate(news.publishedAt, 'long')}
            </time>
          : null}

          {news.image && (
            <div className="relative -mx-1 mt-5 aspect-video overflow-hidden rounded-2xl bg-slate-200 shadow-inner">
              <Image
                src={news.image.startsWith('http') ? news.image : news.image}
                alt={news.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          )}

          {isProbablyHtml(news.content) ? (
            <div
              className="news-article-body prose prose-neutral mt-8 max-w-none text-slate-800 prose-headings:text-slate-900 prose-headings:scroll-mt-24 prose-headings:font-semibold prose-p:text-[17px] prose-p:leading-[1.7] prose-p:tracking-[0.01em] prose-li:text-[17px] prose-li:leading-relaxed prose-strong:text-slate-900 prose-blockquote:border-cdl-blue prose-blockquote:text-slate-600 prose-a:break-words prose-a:text-cdl-blue prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-img:my-6 prose-img:rounded-xl prose-hr:border-slate-200"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
          ) : (
            <div className="news-article-body mt-8 whitespace-pre-wrap text-[17px] leading-[1.7] tracking-[0.01em] text-slate-800">
              {news.content}
            </div>
          )}

          {news.links && Array.isArray(news.links) && news.links.length > 0 && (
            <div className="mt-10 border-t border-slate-200/90 pt-8">
              <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Links relacionados</h2>
              <div className="flex flex-col gap-2">
                {news.links.map((link: NewsLink, index: number) => (
                  <a
                    key={index}
                    href={link.url}
                    target={link.type === 'external' ? '_blank' : undefined}
                    rel={link.type === 'external' ? 'noopener noreferrer' : undefined}
                    download={link.type === 'download' ? true : undefined}
                    className="inline-flex min-h-[48px] w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-cdl-blue/30 bg-white px-4 py-3 text-center text-[14px] font-semibold text-cdl-blue shadow-sm transition-colors hover:border-cdl-blue hover:bg-slate-50"
                  >
                    {link.type === 'download' ? (
                      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    )}
                    {link.label || link.url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </MobileNewsReaderSurface>
      </div>
    );
  }

  return (
    <article className="py-12 sm:py-16">
      <div className="container-cdl max-w-3xl">
        <Link
          href={noticiasIndexHref}
          prefetch={false}
          className="mb-6 inline-block text-sm text-cdl-blue hover:underline"
        >
          ← Voltar às notícias
        </Link>

        {news.image && (
          <div className="relative mb-8 aspect-video overflow-hidden rounded-xl bg-cdl-gray shadow-lg">
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
            <time
              className="mb-3 block text-sm font-medium text-cdl-blue"
              dateTime={news.publishedAt}
            >
              {formatNewsPublishedDate(news.publishedAt, 'long')}
            </time>
          )}
          <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">{news.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
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
            className="news-article-body prose prose-neutral prose-lg sm:prose-xl prose-p:leading-relaxed mt-8 max-w-none text-gray-700 prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:font-medium prose-a:text-cdl-blue prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-gray-900 prose-ul:my-4 prose-ol:my-4 prose-li:my-1.5 prose-blockquote:border-cdl-blue prose-blockquote:text-gray-600 prose-img:rounded-xl prose-hr:border-gray-200"
            dangerouslySetInnerHTML={{ __html: news.content }}
          />
        ) : (
          <div className="news-article-body mt-8 whitespace-pre-wrap leading-relaxed text-base text-gray-700 sm:text-lg">{news.content}</div>
        )}

        {news.links && Array.isArray(news.links) && news.links.length > 0 && (
          <div className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Links relacionados
            </h2>
            <div className="flex flex-wrap gap-3">
              {news.links.map((link: NewsLink, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target={link.type === 'external' ? '_blank' : undefined}
                  rel={link.type === 'external' ? 'noopener noreferrer' : undefined}
                  download={link.type === 'download' ? true : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-cdl-blue px-4 py-2.5 font-medium text-cdl-blue transition-colors hover:bg-cdl-blue hover:text-white"
                >
                  {link.type === 'download' ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
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
