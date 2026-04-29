'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { listNews, type NewsItemFirestore } from '@/lib/firestore';
import { formatNewsPublishedDate } from '@/lib/news-date';

export function NoticiasListClient() {
  const [items, setItems] = useState<NewsItemFirestore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNews(true, 20)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-cdl-gray-text">
        Carregando notícias...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cdl-gray flex items-center justify-center">
          <svg className="w-10 h-10 text-cdl-blue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <p className="text-cdl-gray-text text-lg">Nenhuma notícia publicada ainda.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {items.map((n) => (
        <Link
          key={n.id!}
          href={`/noticias/ver?slug=${encodeURIComponent(n.slug)}`}
          className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-cdl-blue/30 hover:shadow-lg transition-all duration-300"
        >
          <div className="relative aspect-video bg-gradient-to-br from-cdl-blue/10 via-cdl-blue/5 to-transparent overflow-hidden">
            {n.image ? (
              <Image
                src={n.image.startsWith('http') ? n.image : n.image}
                alt={n.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-cdl-blue/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-cdl-blue/60 uppercase tracking-wide">CDL</span>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="flex-1 p-6 flex flex-col">
            {n.publishedAt && (
              <time className="text-xs font-medium text-cdl-blue mb-3 block" dateTime={n.publishedAt}>
                {formatNewsPublishedDate(n.publishedAt, 'long')}
              </time>
            )}
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-cdl-blue transition-colors line-clamp-2 mb-3">
              {n.title}
            </h2>
            <p className="text-sm text-cdl-gray-text line-clamp-3 flex-1 mb-4">
              {n.excerpt}
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-cdl-blue group-hover:gap-2 transition-all">
              Ler mais
              <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
