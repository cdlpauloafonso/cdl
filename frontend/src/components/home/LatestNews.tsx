'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { listNews } from '@/lib/firestore';
import type { NewsItemFirestore } from '@/lib/firestore';

export function LatestNews() {
  const [news, setNews] = useState<NewsItemFirestore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNews(true, 3) // Apenas notícias publicadas, limite de 3
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container-cdl">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue"></div>
            <p className="mt-2 text-gray-600">Carregando notícias...</p>
          </div>
        </div>
      </section>
    );
  }

  if (news.length === 0) {
    return (
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container-cdl">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Últimas Notícias</h2>
            <p className="text-gray-600">Nenhuma notícia publicada no momento.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 bg-gray-50">
      <div className="container-cdl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Últimas Notícias</h2>
          <Link
            href="/noticias"
            className="text-cdl-blue hover:text-cdl-blue-dark font-medium flex items-center gap-1"
          >
            Ver todas
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item) => (
            <article key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {item.photo && (
                <div className="relative h-48">
                  <Image
                    src={item.photo}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized={item.photo.startsWith('http')}
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <time className="text-sm text-gray-500">
                    {new Date(item.date).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </time>
                  {item.category && (
                    <span className="text-xs bg-cdl-blue/10 text-cdl-blue px-2 py-1 rounded-full">
                      {item.category}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  <Link href={`/noticias/${item.slug}`} className="hover:text-cdl-blue transition-colors">
                    {item.title}
                  </Link>
                </h3>
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                  {item.summary}
                </p>
                <Link
                  href={`/noticias/${item.slug}`}
                  className="text-cdl-blue hover:text-cdl-blue-dark text-sm font-medium flex items-center gap-1"
                >
                  Ler mais
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
