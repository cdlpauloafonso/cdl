'use client';

import Link from 'next/link';
import type { ServicoDisplayItem } from '@/lib/servicos-page-data';
import { resolveAppShellHref } from '@/lib/mobile-shell-links';

export type ServiciosViewProps = {
  services: ServicoDisplayItem[];
  /** Prefixo `/m/:token`; reescreve links internos do shell quando definido */
  shellSegment?: string | null;
  mobileShell?: boolean;
};

export function ServiciosView({ services, shellSegment = null, mobileShell = false }: ServiciosViewProps) {
  const hrefFor = (raw: string | undefined, slug: string) => raw || `/servicos/${slug}`;
  const resolveInternal = (h: string) => resolveAppShellHref(shellSegment, h);

  return (
    <div className={mobileShell ? 'pb-2' : undefined}>
      {!mobileShell && (
        <>
          <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
          <p className="mt-4 max-w-2xl text-lg text-cdl-gray-text">
            Hub de serviços para empresas: SPC, certificado digital, vagas e mais. Apoio ao comércio local.
          </p>
        </>
      )}
      <div
        className={
          mobileShell ?
            'mt-1 grid grid-cols-2 gap-2.5'
          : 'mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-8'
        }
      >
        {services.map((s) => {
          const target = resolveInternal(hrefFor(s.href, s.slug));

          const iconGlyph = (
            <svg
              className={
                mobileShell ?
                  'h-7 w-7 text-cdl-blue transition-transform group-hover:scale-105 group-active:scale-95'
                : 'h-5 w-5 text-cdl-blue transition-colors group-hover:text-white md:h-6 md:w-6'
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          );

          const mobileTile = (
            <>
              <div className="flex aspect-square w-full max-w-[4.25rem] items-center justify-center rounded-2xl bg-gradient-to-br from-cdl-blue/12 to-cdl-blue-dark/15 ring-1 ring-cdl-blue/12">
                {iconGlyph}
              </div>
              <h2 className="mt-2 line-clamp-2 min-h-[2.5rem] text-center text-[11px] font-bold leading-tight text-slate-900 transition-colors group-hover:text-cdl-blue">
                {s.title}
              </h2>
              {s.external ?
                <span className="sr-only">Abre em nova aba</span>
              : null}
            </>
          );

          const cardContent = (
            <>
              <div className="mb-3 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cdl-blue/10 transition-colors group-hover:bg-cdl-blue md:h-12 md:w-12">
                  {iconGlyph}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-cdl-blue">{s.title}</h2>
                </div>
              </div>
              <p className="mb-4 text-base text-cdl-gray-text">{s.description}</p>
              <span className="inline-flex items-center text-sm font-medium text-cdl-blue transition-all group-hover:gap-2">
                Saiba mais
                <svg
                  className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </>
          );

          const panelClsDesktop = 'group block rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-cdl-blue/30 hover:shadow-md';
          const panelClsMobileIcon =
            'group flex flex-col items-center rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm shadow-slate-900/[0.04] transition-colors hover:border-cdl-blue/35 active:scale-[0.98] active:opacity-95';

          if (mobileShell) {
            if (s.external) {
              return (
                <a
                  key={s.id}
                  href={s.href || 'https://sistema.spc.org.br/spc/controleacesso/autenticacao/entry.action'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={panelClsMobileIcon}
                >
                  {mobileTile}
                </a>
              );
            }
            return (
              <Link key={s.id} href={target} prefetch={false} className={panelClsMobileIcon}>
                {mobileTile}
              </Link>
            );
          }

          if (s.external) {
            return (
              <a
                key={s.id}
                href={s.href || 'https://sistema.spc.org.br/spc/controleacesso/autenticacao/entry.action'}
                target="_blank"
                rel="noopener noreferrer"
                className={panelClsDesktop}
              >
                {cardContent}
              </a>
            );
          }

          return (
            <Link key={s.id} href={target} prefetch={false} className={panelClsDesktop}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
