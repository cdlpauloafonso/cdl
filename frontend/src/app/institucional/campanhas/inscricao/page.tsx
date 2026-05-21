'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EventInscriptionClient } from './[slug]/EventInscriptionClient';
import { isCampaignPreviewRequested } from '@/lib/campaign-preview';

function EventInscriptionByQueryContent() {
  const searchParams = useSearchParams();
  const slug = (searchParams.get('slug') ?? searchParams.get('id') ?? '').trim();
  const previewRequested = isCampaignPreviewRequested(searchParams.get('preview'));
  const resumeInscriptionId = (searchParams.get('inscriptionId') ?? searchParams.get('inscricao') ?? '').trim();

  if (!slug) {
    return (
      <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
        <div className="container-cdl max-w-2xl">
          <Link href="/institucional/campanhas" className="text-sm text-cdl-blue hover:underline mb-6 inline-block">
            ← Voltar às campanhas
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-cdl-gray-text">
            Link de inscrição inválido.
          </div>
        </div>
      </div>
    );
  }

  return (
    <EventInscriptionClient
      slug={slug}
      previewRequested={previewRequested}
      resumeInscriptionId={resumeInscriptionId || undefined}
    />
  );
}

export default function EventInscriptionByQueryPage() {
  return (
    <Suspense fallback={<p className="p-8 text-cdl-gray-text">Carregando...</p>}>
      <EventInscriptionByQueryContent />
    </Suspense>
  );
}

