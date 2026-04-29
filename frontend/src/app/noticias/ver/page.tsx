'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NoticiaDetailClient } from '../[slug]/NoticiaDetailClient';

function NewsByQueryContent() {
  const searchParams = useSearchParams();
  const slug = (searchParams.get('slug') ?? searchParams.get('id') ?? '').trim();

  if (!slug) {
    return (
      <div className="py-12 sm:py-16">
        <div className="container-cdl max-w-2xl">
          <Link href="/noticias" className="text-sm text-cdl-blue hover:underline mb-6 inline-block">
            ← Voltar às notícias
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-cdl-gray-text">
            Link da notícia inválido.
          </div>
        </div>
      </div>
    );
  }

  return <NoticiaDetailClient slug={slug} />;
}

export default function NewsByQueryPage() {
  return (
    <Suspense fallback={<p className="p-8 text-cdl-gray-text">Carregando...</p>}>
      <NewsByQueryContent />
    </Suspense>
  );
}
