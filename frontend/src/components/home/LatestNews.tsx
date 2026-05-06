'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { listNews, getInformativos } from '@/lib/firestore';
import type { NewsItemFirestore, Informativo } from '@/lib/firestore';
import { shareNewsArticle } from '@/lib/share-news';
import { formatNewsPublishedDate } from '@/lib/news-date';

export function LatestNews() {
  const [news, setNews] = useState<NewsItemFirestore[]>([]);
  const [informativos, setInformativos] = useState<Informativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [informativoIndex, setInformativoIndex] = useState(0);
  const [sharingSlug, setSharingSlug] = useState<string | null>(null);
  const carouselTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [newsOutcome, informativosOutcome] = await Promise.allSettled([
        listNews(true, 3),
        getInformativos(5),
      ]);
      if (cancelled) return;
      if (newsOutcome.status === 'fulfilled') setNews(newsOutcome.value);
      else setNews([]);
      if (informativosOutcome.status === 'fulfilled') setInformativos(informativosOutcome.value);
      else setInformativos([]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const track = carouselTrackRef.current;
    if (!track || informativos.length === 0) return;
    track.style.transform = `translateX(-${informativoIndex * 100}%)`;
  }, [informativoIndex, informativos.length]);

  async function handleShareNews(item: NewsItemFirestore) {
    const slug = (item.slug ?? '').trim();
    if (!slug) return;
    setSharingSlug(slug);
    try {
      const result = await shareNewsArticle({
        title: item.title,
        excerpt: item.excerpt,
        slug,
      });
      if (result.ok && result.method === 'clipboard') {
        alert('Link da notícia copiado para a área de transferência.');
      }
      if (!result.ok && result.reason === 'error') {
        alert('Não foi possível compartilhar agora. Tente novamente.');
      }
    } finally {
      setSharingSlug(null);
    }
  }

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

  return (
    <>
      {/* Informativos — quadro separado acima, só se existir */}
      {informativos.length > 0 && (
        <section className="pt-10 pb-6 sm:pt-12 sm:pb-8 bg-gray-50 border-b border-gray-200/80">
          <div className="container-cdl">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-12 rounded-full bg-cdl-blue" />
                <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Informativos</h2>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-gray-50/80">
                <div className="overflow-hidden">
                  <div
                    ref={carouselTrackRef}
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${informativoIndex * 100}%)` }}
                  >
                    {informativos.map((informativo) => (
                      <div key={informativo.id} className="w-full flex-shrink-0 px-1">
                        <div className="rounded-lg bg-white p-5 sm:p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 pt-1">
                              <div
                                className={`h-3 w-3 rounded-full ${
                                  informativo.tipo === 'sistema'
                                    ? 'bg-blue-500'
                                    : informativo.tipo === 'aviso'
                                      ? 'bg-yellow-500'
                                      : informativo.tipo === 'manutencao'
                                        ? 'bg-red-500'
                                        : 'bg-purple-500'
                                }`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">
                                {informativo.titulo}
                              </h3>
                              <p className="mb-3 line-clamp-4 text-sm text-gray-600 sm:line-clamp-3">
                                {informativo.descricao}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>
                                  {informativo.data_publicacao
                                    ? new Date(informativo.data_publicacao).toLocaleDateString('pt-BR')
                                    : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {informativos.length > 1 && (
                  <div className="flex justify-center gap-2 border-t border-gray-100 bg-white/90 py-3">
                    {informativos.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setInformativoIndex(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === informativoIndex ? 'w-8 bg-cdl-blue' : 'w-2 bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Informativo ${index + 1}`}
                        aria-current={index === informativoIndex ? 'true' : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Últimas notícias — 3 cards como antes */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container-cdl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Últimas notícias</h2>
            <Link
              href="/noticias"
              className="flex items-center gap-1 font-medium text-cdl-blue hover:text-cdl-blue-dark"
            >
              Ver todas
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {news.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-600">Nenhuma notícia publicada no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {news.map((item) => (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]"
                >
                  {item.image && (
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized={item.image.startsWith('http')}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.14)_0%,transparent_16%,transparent_84%,rgba(15,23,42,0.14)_100%),linear-gradient(to_bottom,rgba(15,23,42,0.1)_0%,transparent_20%,transparent_80%,rgba(15,23,42,0.1)_100%)]"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <time className="text-sm text-gray-500">
                        {formatNewsPublishedDate(item.publishedAt, 'long')}
                      </time>
                    </div>
                    <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900">
                      <Link
                        href={`/noticias/${encodeURIComponent(item.slug)}`}
                        className="transition-colors hover:text-cdl-blue"
                      >
                        {item.title}
                      </Link>
                    </h3>
                    <p className="mb-4 line-clamp-3 text-sm text-gray-600">{item.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/noticias/${encodeURIComponent(item.slug)}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-cdl-blue hover:text-cdl-blue-dark"
                      >
                        Ler mais
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleShareNews(item)}
                        disabled={sharingSlug === item.slug || !(item.slug ?? '').trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-cdl-blue hover:text-cdl-blue disabled:opacity-50"
                        aria-label={`Compartilhar notícia: ${item.title}`}
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                        {sharingSlug === item.slug ? 'Compartilhando...' : 'Compartilhar'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
