'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCampaign, Campaign } from '@/lib/firestore';
import { getEffectiveRegistration, hrefForExternalRegistration } from '@/lib/event-registration-fields';

export function CampaignPageClient({ slug }: { slug: string }) {
  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getCampaign(slug);
        if (!mounted) return;
        setCampanha(c);
      } catch {
        if (mounted) setCampanha(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) return <p className="p-8 text-cdl-gray-text">Carregando...</p>;
  if (!campanha) notFound();

  const registration = getEffectiveRegistration(campanha);

  return (
    <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
      <div className="container-cdl max-w-4xl">
        <Link href="/institucional/campanhas" className="text-sm text-cdl-blue hover:underline mb-6 inline-block">
          ← Voltar às campanhas
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-4 py-1 text-sm font-semibold rounded-full bg-cdl-blue text-white">
              {campanha.category}
            </span>
            <span className="text-sm text-cdl-gray-text flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {campanha.date}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">{campanha.title}</h1>
          <p className="text-xl text-cdl-gray-text leading-relaxed">{campanha.description}</p>
        </div>

        <div className="rounded-xl overflow-hidden mb-10">
          {campanha.image ? (
            <img src={campanha.image} alt={campanha.title} className="w-full h-64 sm:h-80 object-cover" />
          ) : (
            <div className="relative h-64 sm:h-80 flex items-center justify-center bg-gradient-to-br from-cdl-blue/20 to-cdl-blue-dark/20">
              <div className="text-center p-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-cdl-blue/10 flex items-center justify-center">
                  <svg className="w-12 h-12 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-cdl-gray-text">{campanha.date}</p>
              </div>
            </div>
          )}
        </div>

        <section className="mb-10">
          <div className="prose prose-cdl max-w-none">
            <p className="text-lg text-cdl-gray-text leading-relaxed">{campanha.fullDescription}</p>
          </div>
        </section>

        {registration.kind !== 'none' && (
          <section className="mb-10">
            {registration.kind === 'external' ? (
              <a
                href={hrefForExternalRegistration(registration.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cdl-blue px-6 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Fazer inscrição
              </a>
            ) : (
              <Link
                href={`/institucional/campanhas/inscricao?slug=${encodeURIComponent(slug)}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cdl-blue px-6 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Fazer inscrição
              </Link>
            )}
          </section>
        )}

        {campanha.highlights && campanha.highlights.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Destaques</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {campanha.highlights.map((highlight, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-white border border-gray-200">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cdl-blue/10 flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-cdl-gray-text">{highlight}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {campanha.benefits && campanha.benefits.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Benefícios</h2>
            <div className="bg-gradient-to-r from-cdl-blue/10 to-cdl-blue-dark/10 rounded-xl p-6 border border-cdl-blue/20">
              <ul className="space-y-3">
                {campanha.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-cdl-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-cdl-gray-text">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {campanha.howToParticipate && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Como Participar</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-cdl-gray-text leading-relaxed">{campanha.howToParticipate}</p>
            </div>
          </section>
        )}

        <section className="mt-12">
          <div className="bg-gradient-to-r from-cdl-blue to-cdl-blue-dark rounded-xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-3">Quer saber mais?</h2>
            <p className="text-blue-100 mb-6">{campanha.contact || 'Entre em contato conosco para mais informações sobre esta campanha.'}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/atendimento" className="btn-secondary bg-white text-cdl-blue hover:bg-gray-100">Entre em contato</Link>
              <Link href="/associe-se" className="btn-secondary border-2 border-white text-white hover:bg-white/10">Associe-se</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
