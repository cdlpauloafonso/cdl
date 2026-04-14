'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type LegacyRouteRedirect =
  | { kind: 'campanha'; slug: string }
  | { kind: 'inscricao'; slug: string }
  | null;

function getLegacyRouteRedirect(pathname: string): LegacyRouteRedirect {
  const normalized = pathname.replace(/\/+$/, '');
  const inscricaoMatch = normalized.match(/^\/institucional\/campanhas\/inscricao\/([^/]+)$/);
  if (inscricaoMatch?.[1]) {
    return { kind: 'inscricao', slug: inscricaoMatch[1] };
  }
  const campanhaMatch = normalized.match(/^\/institucional\/campanhas\/([^/]+)$/);
  if (campanhaMatch?.[1]) {
    const slug = campanhaMatch[1];
    if (slug !== 'ver' && slug !== 'inscricao') {
      return { kind: 'campanha', slug };
    }
  }
  return null;
}

export default function NotFound() {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const redirect = getLegacyRouteRedirect(window.location.pathname);
    if (!redirect) return;

    setRedirecting(true);
    const slug = encodeURIComponent(decodeURIComponent(redirect.slug));
    const target =
      redirect.kind === 'campanha'
        ? `/institucional/campanhas/ver?slug=${slug}`
        : `/institucional/campanhas/inscricao?slug=${slug}`;
    window.location.replace(target);
  }, []);

  if (redirecting) {
    return (
      <main className="min-h-[50vh] flex items-center justify-center px-6">
        <p className="text-cdl-gray-text">Redirecionando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-lg text-center rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-red-700 mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Página não encontrada</h1>
        <p className="text-cdl-gray-text mb-6">
          O link pode estar desatualizado ou o conteúdo foi movido.
        </p>
        <Link href="/institucional/campanhas" className="btn-primary inline-block">
          Ir para campanhas e eventos
        </Link>
      </div>
    </main>
  );
}

