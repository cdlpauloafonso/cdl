'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { listNews, getInformativos } from '@/lib/firestore';
import type { NewsItemFirestore, Informativo } from '@/lib/firestore';

export function LatestNews() {
  const [news, setNews] = useState<NewsItemFirestore[]>([]);
  const [informativos, setInformativos] = useState<Informativo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar notícias e informativos em paralelo
    Promise.all([
      listNews(true, 3), // Apenas notícias publicadas, limite de 3
      getInformativos(5) // Apenas informativos ativos, limite de 5
    ])
      .then(([newsData, informativosData]) => {
        setNews(newsData);
        setInformativos(informativosData);
      })
      .catch(() => {
        setNews([]);
        setInformativos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container-cdl">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue"></div>
            <p className="mt-2 text-gray-600">Carregando notícias e informativos...</p>
          </div>
        </div>
      </section>
    );
  }

  const hasContent = news.length > 0 || informativos.length > 0;

  return (
    <section className="py-12 sm:py-16 bg-gray-50">
      <div className="container-cdl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Últimas Notícias e Informativos</h2>
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

        {!hasContent && (
          <div className="text-center">
            <p className="text-gray-600">Nenhuma notícia ou informativo publicado no momento.</p>
          </div>
        )}

        {hasContent && (
          <div className="space-y-8">
            {/* Informativos - Carrossel */}
            {informativos.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-1 bg-cdl-blue"></div>
                  <h3 className="text-xl font-semibold text-gray-900">Informativos</h3>
                </div>
                <div className="relative">
                  <div className="overflow-hidden rounded-xl">
                    <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(0%)` }}>
                      {informativos.map((informativo, index) => (
                        <div key={informativo.id} className="w-full flex-shrink-0">
                          <div className="bg-white rounded-lg shadow-lg p-6 mx-2">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                <div className={`w-3 h-3 rounded-full ${informativo.tipo === 'sistema' ? 'bg-blue-500' : informativo.tipo === 'aviso' ? 'bg-yellow-500' : informativo.tipo === 'manutencao' ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">{informativo.titulo}</h4>
                                <p className="text-gray-600 text-sm mb-3 line-clamp-3">{informativo.descricao}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{new Date(informativo.data_publicacao).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Navegação do carrossel */}
                  <div className="flex justify-center gap-2 mt-4">
                    {informativos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const container = document.querySelector('.transition-transform');
                          if (container) {
                            const offset = -index * 100;
                            container.style.transform = `translateX(${offset}%)`;
                          }
                        }}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === 0 ? 'bg-cdl-blue' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notícias - Grid */}
            {news.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-1 bg-cdl-gray"></div>
                  <h3 className="text-xl font-semibold text-gray-900">Notícias</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.map((item) => (
                    <article key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {item.image && (
                        <div className="relative h-48">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            unoptimized={item.image.startsWith('http')}
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <time className="text-sm text-gray-500">
                            {new Date(item.publishedAt).toLocaleDateString('pt-BR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </time>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          <Link href={`/noticias/${item.slug}`} className="hover:text-cdl-blue transition-colors">
                            {item.title}
                          </Link>
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                          {item.excerpt}
                        </p>
                        <Link
                          href={`/noticias/${item.slug}`}
                          className="text-cdl-blue hover:text-cdl-blue-dark text-sm font-medium flex items-center gap-1"
                        >
                          Ler mais
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  );
}
