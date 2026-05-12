'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type MobileWebSubPageChromeProps = {
  backHref: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Páginas filhas dentro de `/m/:token/` — mesmo “card” clarinho sobre fundo `#0b1224`
 * do layout, alinhado à home MobileCDLHome.
 */
export function MobileWebSubPageChrome({
  backHref,
  backLabel = 'Início',
  title,
  subtitle,
  children,
}: MobileWebSubPageChromeProps) {
  return (
    <div className="relative isolate flex min-h-0 flex-1 flex-col text-slate-100">
      <header className="relative shrink-0 overflow-hidden px-4 pb-6 pt-1">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.28),transparent),linear-gradient(180deg,#172554_0%,#0b1224_100%)]"
          aria-hidden
        />
        <div className="relative">
          <Link
            href={backHref}
            prefetch={false}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-semibold text-cyan-100 backdrop-blur hover:bg-white/15"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-[1.35rem]">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-[20rem] text-xs leading-snug text-slate-400">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <main className="relative -mt-2 flex min-h-0 flex-1 flex-col rounded-t-[1.75rem] bg-gradient-to-b from-slate-100 to-[#eef2fb] px-4 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pt-6 text-slate-900 shadow-[0_-12px_40px_rgba(15,23,42,0.35)]">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
