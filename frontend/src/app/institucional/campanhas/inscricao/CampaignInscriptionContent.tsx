'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EventInscriptionClient } from './[slug]/EventInscriptionClient';
import { isCampaignPreviewRequested } from '@/lib/campaign-preview';
import { campaignVerHrefForShell, shellSegmentFromCampanhasIndexHref } from '@/lib/mobile-campaign-hrefs';
import { resolveAppShellHref } from '@/lib/mobile-shell-links';
import { InscriptionPageShell } from '@/components/mobile-web/InscriptionPageShell';

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

  const shellSegment = shellSegmentFromCampanhasIndexHref(campanhasIndexHref);
  const campanhaVerHref = slug
    ? campaignVerHrefForShell(slug, { preview: previewRequested, shellSegment })
    : campanhasIndexHref;
  const atendimentoHrefResolved = resolveAppShellHref(shellSegment, '/atendimento');

  if (!slug) {
    return (
      <InscriptionPageShell fillAppShellViewport={fillAppShellViewport}>
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
      </InscriptionPageShell>
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
      atendimentoHref={atendimentoHrefResolved}
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
