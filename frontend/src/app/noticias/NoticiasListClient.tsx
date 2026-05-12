'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { listNews, type NewsItemFirestore } from '@/lib/firestore';
import { formatNewsPublishedDate } from '@/lib/news-date';
import { resolveAppShellHref } from '@/lib/mobile-shell-links';

export type NoticiasListClientProps = {
  mobileShell?: boolean;
  shellSegment?: string | null;
};

export function NoticiasListClient({
  mobileShell = false,
  shellSegment = null,
}: NoticiasListClientProps) {
  const [items, setItems] = useState<NewsItemFirestore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNews(true, 20)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const detailHrefFor = (s: string) =>
    resolveAppShellHref(shellSegment, `/noticias/${encodeURIComponent(s)}`);

  if (loading) {
    return (
      <div
        className={
          mobileShell ? 'py-10 text-center text-sm font-medium text-slate-600' : 'py-12 text-center text-cdl-gray-text'
        }
      >
        Carregando notícias...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={mobileShell ? 'py-10 text-center' : 'py-16 text-center'}>
        {!mobileShell && (
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-cdl-gray">
            <svg className="h-10 w-10 text-cdl-blue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
        )}
        <p className={`text-cdl-gray-text ${mobileShell ? 'text-[13px]' : 'text-lg'}`}>Nenhuma notícia publicada ainda.</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${mobileShell ? 'grid-cols-1' : 'grid-cols-1 gap-8 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8'}`}>
      {items.map((n) => (
        <Link
          key={n.id!}
          href={detailHrefFor(String(n.slug))}
          prefetch={false}
          className={`group flex flex-col overflow-hidden border border-gray-200 bg-white transition-all duration-300 ${
            mobileShell ?
              'rounded-2xl shadow-md shadow-slate-900/[0.04] hover:border-cdl-blue/35 hover:shadow-lg'
            : 'rounded-xl hover:-translate-y-0.5 hover:scale-[1.01] hover:border-cdl-blue/30 hover:shadow-lg'
          }`}
        >
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-cdl-blue/10 via-cdl-blue/5 to-transparent">
            {n.image ?
              <>
                <Image
                  src={n.image.startsWith('http') ? n.image : n.image}
                  alt={n.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes={mobileShell ? '100vw' : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'}
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.12)_0%,transparent_14%,transparent_86%,rgba(15,23,42,0.12)_100%),linear-gradient(to_bottom,rgba(15,23,42,0.08)_0%,transparent_18%,transparent_82%,rgba(15,23,42,0.08)_100%)]"
                  aria-hidden="true"
                />
              </>
            : <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-cdl-blue/10">
                    <svg className="h-7 w-7 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                      />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-cdl-blue/70">CDL</span>
                </div>
              </div>
            }
          </div>
          <div className={`flex flex-1 flex-col ${mobileShell ? 'p-4' : 'p-6'}`}>
            {n.publishedAt && (
              <time
                className={`mb-2 block font-medium text-cdl-blue ${mobileShell ? 'text-[10px]' : 'mb-3 text-xs'}`}
                dateTime={n.publishedAt}
              >
                {formatNewsPublishedDate(n.publishedAt, mobileShell ? 'short' : 'long')}
              </time>
            )}
            <h2
              className={`font-bold text-gray-900 transition-colors group-hover:text-cdl-blue ${mobileShell ? 'mb-2 line-clamp-2 text-[15px] leading-snug' : 'mb-3 line-clamp-2 text-lg'}`}
            >
              {n.title}
            </h2>
            <p className={`line-clamp-3 flex-1 text-cdl-gray-text ${mobileShell ? 'mb-3 text-[12px] leading-snug' : 'mb-4 text-sm'}`}>
              {n.excerpt}
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-cdl-blue transition-all group-hover:gap-2">
              Ler mais
              <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
