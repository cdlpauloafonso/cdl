'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getNewsBySlug, type NewsItemFirestore, type NewsLink } from '@/lib/firestore';

export function NoticiaDetailClient({ slug }: { slug: string }) {
  const [news, setNews] = useState<NewsItemFirestore | null | undefined>(undefined);

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
              {new Date(news.publishedAt).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">{news.title}</h1>
        </div>

        <div className="mt-8 prose prose-cdl max-w-none" dangerouslySetInnerHTML={{ __html: news.content }} />

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
