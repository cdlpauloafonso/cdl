'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

function resolveHomeHref(pathname: string | null): string {
  if (!pathname) return '/';
  const shell = pathname.match(/^(\/m\/[^/]+)/);
  if (shell) return shell[1];
  if (pathname.startsWith('/admin')) return '/admin';
  return '/';
}

/** SVG leve — “mapa” desenhado à mão, tom simpático */
function LostMapIllustration() {
  return (
    <svg
      className="mx-auto h-36 w-full max-w-[200px] text-cdl-blue/90"
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20 118c18-42 52-76 94-94l8 36-36 56-66 2z"
        className="fill-cdl-blue/8 stroke-cdl-blue/25"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M48 102c22-18 48-32 78-40l4 18-32 50-50-28z"
        className="fill-white stroke-cdl-blue/20"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="104" cy="44" r="10" className="fill-cdl-blue-light/30 stroke-cdl-blue" strokeWidth="2" />
      <path
        d="M104 54v18"
        className="stroke-cdl-blue"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function NotFound() {
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);
  const homeHref = resolveHomeHref(pathname ?? null);

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
      <section className="flex min-h-[50vh] items-center justify-center px-6">
        <p className="text-cdl-gray-text">Redirecionando…</p>
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[65vh] flex-col items-center justify-center overflow-hidden px-4 py-12 sm:min-h-[70vh] sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-sky-50/80 via-white to-cdl-gray"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-1/4 h-48 w-48 rounded-full bg-cdl-blue-light/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-12 bottom-1/4 h-40 w-40 rounded-full bg-amber-200/25 blur-3xl"
        aria-hidden
      />

      <div className="animate-fade-in w-full max-w-md text-center">
        <p className="mb-2 font-mono text-sm font-semibold tracking-[0.2em] text-cdl-blue-dark/80">
          404
        </p>
        <h1 className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Esta página foi buscar café e não voltou
        </h1>
        <p className="mt-3 text-balance text-sm leading-relaxed text-cdl-gray-text sm:text-base">
          Ou o link está com saudades do teclado — em todo caso, nada que um clique na página inicial
          não resolva.
        </p>

        <div className="mt-8 animate-slide-up [&>svg]:drop-shadow-sm">
          <LostMapIllustration />
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href={homeHref} className="btn-primary w-full sm:w-auto">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </section>
  );
}
