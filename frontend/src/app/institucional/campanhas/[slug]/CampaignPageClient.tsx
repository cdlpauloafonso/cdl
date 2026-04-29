'use client';

import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getCampaign, Campaign } from '@/lib/firestore';
import {
  getEffectiveRegistration,
  hrefForExternalRegistration,
  isInscriptionSoldOut,
} from '@/lib/event-registration-fields';

const SOLD_OUT_TOAST_MS = 6000;

export function CampaignPageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [soldOutNotification, setSoldOutNotification] = useState(false);
  const soldOutToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [registrationClosedNotification, setRegistrationClosedNotification] = useState(false);
  const closedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSoldOutToast = () => {
    setSoldOutNotification(true);
    if (soldOutToastTimerRef.current) clearTimeout(soldOutToastTimerRef.current);
    soldOutToastTimerRef.current = setTimeout(() => {
      setSoldOutNotification(false);
      soldOutToastTimerRef.current = null;
    }, SOLD_OUT_TOAST_MS);
  };

  const showRegistrationClosedToast = () => {
    setRegistrationClosedNotification(true);
    if (closedToastTimerRef.current) clearTimeout(closedToastTimerRef.current);
    closedToastTimerRef.current = setTimeout(() => {
      setRegistrationClosedNotification(false);
      closedToastTimerRef.current = null;
    }, SOLD_OUT_TOAST_MS);
  };

  useEffect(() => {
    return () => {
      if (soldOutToastTimerRef.current) clearTimeout(soldOutToastTimerRef.current);
      if (closedToastTimerRef.current) clearTimeout(closedToastTimerRef.current);
    };
  }, []);

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
  const ingressosEsgotados =
    registration.kind === 'form' && isInscriptionSoldOut(campanha);

  async function handleIrParaInscricao() {
    const base = campanha;
    if (!base) return;
    try {
      const fresh = await getCampaign(slug);
      if (fresh) setCampanha(fresh);
      const c = fresh ?? base;
      if (c.registrationClosed) {
        showRegistrationClosedToast();
        return;
      }
      const regFresh = getEffectiveRegistration(c);
      if (regFresh.kind === 'form' && isInscriptionSoldOut(c)) {
        showSoldOutToast();
        return;
      }
      router.push(`/institucional/campanhas/inscricao?slug=${encodeURIComponent(slug)}`);
    } catch {
      router.push(`/institucional/campanhas/inscricao?slug=${encodeURIComponent(slug)}`);
    }
  }

  return (
    <div className="relative py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
      {soldOutNotification && (
        <div
          className="fixed bottom-6 left-1/2 z-[100] flex w-[min(100%,24rem)] -translate-x-1/2 flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-lg shadow-black/10"
          role="status"
          aria-live="polite"
        >
          <p className="text-base font-semibold text-amber-950">Ingressos esgotados</p>
          <p className="text-sm text-amber-900/90">
            O limite de inscrições para este evento foi atingido. Não é possível novas inscrições pelo site.
          </p>
        </div>
      )}
      {registrationClosedNotification && (
        <div
          className="fixed bottom-6 left-1/2 z-[100] flex w-[min(100%,24rem)] -translate-x-1/2 flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-lg shadow-black/10"
          role="status"
          aria-live="polite"
        >
          <p className="text-base font-semibold text-amber-950">Inscrição encerrada</p>
          <p className="text-sm text-amber-900/90">
            As inscrições para este evento foram encerradas. Não é possível novas inscrições pelo site.
          </p>
        </div>
      )}

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

        <div
          className="rounded-xl overflow-hidden mb-10 bg-gray-100"
          style={{ aspectRatio: '16 / 9' }}
        >
          {campanha.image ? (
            <img src={campanha.image} alt={campanha.title} className="w-full h-full object-cover" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-cdl-blue/20 to-cdl-blue-dark/20">
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
            ) : ingressosEsgotados ? (
              <button
                type="button"
                title="Ingressos esgotados"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cdl-blue px-6 py-3 text-base font-semibold text-white shadow-sm ring-2 ring-amber-400/60 ring-offset-2 transition-opacity hover:opacity-90"
                onClick={showSoldOutToast}
              >
                <span className="sr-only">Ingressos esgotados. Limite de inscrições atingido. </span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Fazer inscrição
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cdl-blue px-6 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                onClick={() => void handleIrParaInscricao()}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Fazer inscrição
              </button>
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
