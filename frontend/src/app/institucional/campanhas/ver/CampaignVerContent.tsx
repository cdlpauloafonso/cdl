'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CampaignPageClient } from '../[slug]/CampaignPageClient';

export type CampaignVerContentProps = {
  campanhasIndexHref?: string;
  associeHref?: string;
  atendimentoHref?: string;
  /** No shell `/m/`, garante gradiente até ao fundo quando há pouco conteúdo. */
  fillAppShellViewport?: boolean;
};

function CampaignVerInner({
  campanhasIndexHref = '/institucional/campanhas',
  associeHref = '/associe-se',
  atendimentoHref = '/atendimento',
  fillAppShellViewport = false,
}: CampaignVerContentProps) {
  const searchParams = useSearchParams();
  const slug = (searchParams.get('slug') ?? searchParams.get('id') ?? '').trim();

  if (!slug) {
    return (
      <div
        className={`bg-gradient-to-b from-white to-cdl-gray/30 py-12 sm:py-16 ${fillAppShellViewport ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      >
        <div className={`container-cdl max-w-2xl ${fillAppShellViewport ? 'flex flex-1 flex-col' : ''}`}>
          <Link href={campanhasIndexHref} prefetch={false} className="mb-6 inline-block text-sm text-cdl-blue hover:underline">
            ← Voltar às campanhas
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-cdl-gray-text">Link do evento inválido.</div>
          {fillAppShellViewport ? <div className="min-h-16 flex-1" aria-hidden /> : null}
        </div>
      </div>
    );
  }

  return (
    <CampaignPageClient
      slug={slug}
      campanhasIndexHref={campanhasIndexHref}
      associeHref={associeHref}
      atendimentoHref={atendimentoHref}
      fillAppShellViewport={fillAppShellViewport}
    />
  );
}

export function CampaignVerContent(props: CampaignVerContentProps) {
  const fallback =
    props.fillAppShellViewport ?
      <div className="flex min-h-[30vh] flex-1 flex-col items-center justify-center py-12">
        <p className="text-cdl-gray-text">Carregando...</p>
      </div>
    : (
        <p className="p-8 text-cdl-gray-text">Carregando...</p>
      );

  const suspense = (
    <Suspense fallback={fallback}>
      <CampaignVerInner {...props} />
    </Suspense>
  );

  return props.fillAppShellViewport ? <div className="flex min-h-0 flex-1 flex-col">{suspense}</div> : suspense;
}
