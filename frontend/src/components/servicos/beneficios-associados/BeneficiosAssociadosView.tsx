'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getBeneficiosAssociados,
  listBeneficiosParceirosPublic,
  type BeneficiosAssociadosItem,
  type BeneficioParceiro,
} from '@/lib/firestore';

export type BeneficiosAssociadosViewProps = {
  /** Modo app WebView — layout compacto dentro de `MobileWebSubPageChrome`. */
  mobileShell?: boolean;
  associeHref?: string;
  atendimentoHref?: string;
};

export function BeneficiosAssociadosView({
  mobileShell = false,
  associeHref = '/associe-se',
  atendimentoHref = '/atendimento',
}: BeneficiosAssociadosViewProps) {
  const [data, setData] = useState<BeneficiosAssociadosItem | null>(null);
  const [partners, setPartners] = useState<BeneficioParceiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBeneficiosAssociados(), listBeneficiosParceirosPublic()])
      .then(([page, list]) => {
        if (!cancelled) {
          setData(page);
          setPartners(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setPartners([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={mobileShell ? 'py-10 text-center text-sm text-slate-600' : 'py-12 sm:py-16'}>
        {!mobileShell ? (
          <div className="container-cdl max-w-5xl">
            <div className="text-center">Carregando...</div>
          </div>
        ) : (
          <p className="font-medium">Carregando benefícios…</p>
        )}
      </div>
    );
  }

  const heroH = mobileShell ? 'h-44 sm:h-48' : 'h-64 sm:h-96';
  const titleCls =
    mobileShell ? 'mb-5 text-xl font-bold text-slate-900' : 'mb-8 text-3xl sm:text-4xl font-bold text-gray-900';
  const titleContent = data?.title || 'Benefícios para Associados';

  return (
    <div className={mobileShell ? 'pb-4' : undefined}>
      {mobileShell ? (
        <h2 className={titleCls}>{titleContent}</h2>
      ) : (
        <h1 className={titleCls}>{titleContent}</h1>
      )}

      <div className={mobileShell ? 'mb-5 overflow-hidden rounded-2xl border border-slate-200/90 shadow-md' : 'mb-8 rounded-xl overflow-hidden shadow-lg'}>
        <div className={`relative w-full ${heroH}`}>
          {data?.photo ? (
            <img src={data.photo} alt="Benefícios para Associados" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-cdl-blue via-cdl-blue-dark to-cdl-blue">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-24 h-24 text-white/20 sm:w-32 sm:h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="prose prose-cdl max-w-none">
        {data?.description && (
          <div
            className={
              mobileShell
                ? 'mb-6 rounded-2xl border border-cdl-blue/25 bg-white p-4 shadow-sm'
                : 'mb-8 sm:mb-10 p-6 bg-gradient-to-r from-cdl-blue/10 to-cdl-blue-dark/10 rounded-xl border-2 border-cdl-blue/30'
            }
          >
            <div
              className={`text-cdl-gray-text leading-relaxed whitespace-pre-line ${mobileShell ? 'text-[13px]' : ''}`}
            >
              {data.description}
            </div>
          </div>
        )}

        <div className={mobileShell ? 'mb-6' : 'mb-8 sm:mb-10'}>
          {mobileShell ? (
            <h3 className="mb-2 font-bold text-sm uppercase tracking-[0.1em] text-slate-500">Parceiros e Convênios</h3>
          ) : (
            <h2 className="mb-2 font-bold text-gray-900 text-lg sm:mb-3 sm:text-xl">Parceiros e Convênios</h2>
          )}
          {partners.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-[13px] text-cdl-gray-text">
              Nenhum parceiro ativo cadastrado no momento.
            </p>
          ) : (
            <div className={mobileShell ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6'}>
              {partners.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} compact={mobileShell} />
              ))}
            </div>
          )}
        </div>

        <div
          className={
            mobileShell
              ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-inner shadow-slate-200/70'
              : 'mt-10 p-8 bg-gradient-to-r from-cdl-blue/10 to-cdl-blue-dark/10 rounded-xl border-2 border-cdl-blue/30'
          }
        >
          <div className={mobileShell ? 'text-left' : 'text-center'}>
            {mobileShell ? (
              <h3 className="mb-3 text-base font-bold text-gray-900">Faça parte da nossa comunidade</h3>
            ) : (
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Faça parte da nossa comunidade</h2>
            )}
            <p
              className={`mb-6 text-cdl-gray-text ${mobileShell ? 'text-[13px] leading-relaxed' : 'max-w-2xl mx-auto'}`}
            >
              Associe-se à CDL Paulo Afonso e tenha acesso a benefícios exclusivos. Fortaleça seu negócio com a rede que
              impulsiona o comércio local.
            </p>
            <div className={`flex gap-3 ${mobileShell ? 'flex-col' : 'flex-wrap justify-center gap-4'}`}>
              <Link
                href={associeHref}
                prefetch={false}
                className={
                  mobileShell
                    ? 'rounded-xl bg-[#172554] py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-[#131c48]'
                    : 'btn-primary'
                }
              >
                Associe-se agora
              </Link>
              <Link
                href={atendimentoHref}
                prefetch={false}
                className={
                  mobileShell
                    ? 'rounded-xl border-2 border-cdl-blue py-3.5 text-center text-sm font-semibold text-cdl-blue hover:bg-cdl-blue/8'
                    : 'btn-secondary'
                }
              >
                Fale conosco
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ partner, compact }: { partner: BeneficioParceiro; compact?: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const detailText = partner.details?.trim() ?? '';
  const showSaibaMais = detailText.length > 0;

  return (
    <>
      <article
        className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md shadow-gray-900/5 transition-all duration-300 hover:border-cdl-blue/35 hover:shadow-xl hover:shadow-cdl-blue/10 ${
          compact ? '' : 'hover:-translate-y-1'
        }`}
      >
        <div className={`relative aspect-[5/3] w-full shrink-0 bg-gradient-to-br from-slate-100 via-slate-50 to-cdl-blue/10 ${compact ? 'max-h-[9.5rem]' : ''}`}>
          <div className={`absolute inset-0 flex items-center justify-center ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
            {partner.photo ? (
              <img
                src={partner.photo}
                alt={partner.name}
                className="h-full w-full min-h-0 min-w-0 object-contain object-center transition-transform duration-300 ease-out group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-cdl-blue/40">
                <svg className="h-12 w-12 sm:h-14 sm:w-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.25}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-4 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span className="text-[11px] font-medium text-slate-400">Convênio</span>
              </div>
            )}
          </div>
        </div>

        <div className={`flex flex-1 flex-col ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`}>
          <h3 className={`font-bold leading-snug text-gray-900 ${compact ? 'text-[15px]' : 'text-base sm:text-lg'}`}>{partner.name}</h3>
          <p className={`mt-1.5 flex-1 text-cdl-gray-text ${compact ? 'line-clamp-4 text-[12px] leading-snug' : 'line-clamp-3 text-sm'}`}>{partner.description}</p>
          {showSaibaMais ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-cdl-blue px-3 py-1.5 font-semibold text-white shadow-sm transition-colors hover:bg-cdl-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-cdl-blue focus-visible:ring-offset-2 sm:mt-4 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm ${compact ? 'text-xs' : 'text-sm'}`}
            >
              Saiba mais
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="mt-3 block h-px w-10 rounded-full bg-gradient-to-r from-cdl-blue/40 to-transparent sm:mt-4 sm:w-12" aria-hidden />
          )}
        </div>
      </article>

      {modalOpen && <PartnerDetailModal partner={partner} onClose={() => setModalOpen(false)} />}
    </>
  );
}

function PartnerDetailModal({
  partner,
  onClose,
}: {
  partner: BeneficioParceiro;
  onClose: () => void;
}) {
  const detailText = partner.details?.trim() ?? '';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-modal-title"
        className="flex max-h-[min(88dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(85vh,720px)] sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
          <h2 id="partner-modal-title" className="pr-2 text-base font-bold text-gray-900 sm:text-lg">
            {partner.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {partner.photo && (
            <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-slate-50">
              <div className="relative aspect-[5/3] w-full">
                <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-5">
                  <img
                    src={partner.photo}
                    alt={partner.name}
                    className="h-full w-full min-h-0 min-w-0 object-contain object-center"
                  />
                </div>
              </div>
            </div>
          )}
          {partner.description.trim() && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resumo</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-cdl-gray-text">{partner.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detalhes</p>
            <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800">{detailText}</div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-gray-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-cdl-blue py-2.5 text-sm font-semibold text-white hover:bg-cdl-blue-dark sm:w-auto sm:min-w-[120px] sm:px-5"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
