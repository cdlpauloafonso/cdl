'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EventInscriptionClient } from './[slug]/EventInscriptionClient';
import { isCampaignPreviewRequested } from '@/lib/campaign-preview';

export type CampaignInscriptionContentProps = {
  campanhasIndexHref?: string;
  associeHref?: string;
  /** No shell `/m/`, preenche a altura útil do WebView. */
  fillAppShellViewport?: boolean;
};

function CampaignInscriptionInner({
  campanhasIndexHref = '/institucional/campanhas',
  associeHref = '/associe-se',
  fillAppShellViewport = false,
}: CampaignInscriptionContentProps) {
  const searchParams = useSearchParams();
  const slug = (searchParams.get('slug') ?? searchParams.get('id') ?? '').trim();
  const previewRequested = isCampaignPreviewRequested(searchParams.get('preview'));
  const resumeInscriptionId = (searchParams.get('inscriptionId') ?? searchParams.get('inscricao') ?? '').trim();

  const previewQs = previewRequested ? '&preview=1' : '';
  const mobileSegment = campanhasIndexHref.match(/^(\/m\/[^/]+)(?:\/|$)/)?.[1] ?? null;
  const campanhaVerHref = slug
    ? mobileSegment
      ? `${mobileSegment}/institucional/campanhas/ver?slug=${encodeURIComponent(slug)}${previewQs}`
      : `/institucional/campanhas/ver?slug=${encodeURIComponent(slug)}${previewQs}`
    : campanhasIndexHref;

  if (!slug) {
    return (
      <div
        className={`bg-gradient-to-b from-white to-cdl-gray/30 ${
          fillAppShellViewport ?
            `flex min-h-0 flex-1 flex-col pb-12 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1.5rem))] sm:pb-16 sm:pt-[max(4rem,calc(env(safe-area-inset-top,0px)+2rem))]`
          : 'py-12 sm:py-16'
        }`}
      >
        <div className={`container-cdl max-w-2xl ${fillAppShellViewport ? 'flex flex-1 flex-col' : ''}`}>
          <Link
            href={campanhasIndexHref}
            prefetch={false}
            className="mb-6 inline-block text-sm text-cdl-blue hover:underline"
          >
            ← Voltar às campanhas
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-cdl-gray-text">
            Link de inscrição inválido.
          </div>
          {fillAppShellViewport ? <div className="min-h-16 flex-1" aria-hidden /> : null}
        </div>
      </div>
    );
  }

  return (
    <EventInscriptionClient
      slug={slug}
      previewRequested={previewRequested}
      resumeInscriptionId={resumeInscriptionId || undefined}
      campanhasIndexHref={campanhasIndexHref}
      campanhaVerHref={campanhaVerHref}
      associeHref={associeHref}
      fillAppShellViewport={fillAppShellViewport}
    />
  );
}

export function CampaignInscriptionContent(props: CampaignInscriptionContentProps) {
  const fallback =
    props.fillAppShellViewport ?
      <div className="flex min-h-[30vh] flex-1 flex-col items-center justify-center pb-12 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1.5rem))]">
        <p className="text-cdl-gray-text">Carregando...</p>
      </div>
    : (
        <p className="p-8 text-cdl-gray-text">Carregando...</p>
      );

  const suspense = (
    <Suspense fallback={fallback}>
      <CampaignInscriptionInner {...props} />
    </Suspense>
  );

  return props.fillAppShellViewport ? <div className="flex min-h-0 flex-1 flex-col">{suspense}</div> : suspense;
}
