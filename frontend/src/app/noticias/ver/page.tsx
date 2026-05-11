'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NoticiaDetailClient } from '../[slug]/NoticiaDetailClient';

/**
 * Slug: `?slug=` / `?id=` ou último segmento de `/noticias/:slug`.
 * Com export estático + Netlify, `/noticias/qualquer-coisa` reescreve para `ver.html` mas o
 * pathname no browser continua `/noticias/qualquer-coisa`.
 *
 * `/noticias/ver` sem query segue inválido (rota auxiliar); notícia com slug `ver` use `?slug=ver`.
 */
function resolveNewsSlug(searchParams: URLSearchParams, pathname: string | null): string {
  const fromQuery = (searchParams.get('slug') ?? searchParams.get('id') ?? '').trim();
  if (fromQuery) return fromQuery;

  if (!pathname) return '';
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'noticias' || parts.length < 2) return '';
  const last = parts[parts.length - 1];
  if (parts.length === 2 && last === 'ver') return '';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function NewsByQueryContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const slug = resolveNewsSlug(searchParams, pathname).trim();

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
