'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { MobileHeroHeaderBackdrop } from '@/components/mobile-web/MobileHeroHeaderBackdrop';

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
  backLabel,
  title,
  subtitle,
  children,
}: MobileWebSubPageChromeProps) {
  const showBackText = !!(backLabel && backLabel.trim().length > 0);

  return (
    <div className="relative isolate flex min-h-0 flex-1 flex-col text-slate-100">
      <MobileHeroHeaderBackdrop variant="subpage" />
      <header className="relative z-10 shrink-0 overflow-x-hidden px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+0.25rem)]">
        <div className="relative">
          <Link
            href={backHref}
            prefetch={false}
            aria-label={showBackText ? undefined : 'Voltar ao início do app'}
            className={
              showBackText
                ? 'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-semibold text-cyan-100 backdrop-blur hover:bg-white/15'
                : 'inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg font-semibold leading-none text-cyan-100 backdrop-blur hover:bg-white/15'
            }
          >
            {showBackText ? (
              <>
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{backLabel}</span>
              </>
            ) : (
              <span aria-hidden className="-mt-px">
                &lt;
              </span>
            )}
          </Link>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-[1.35rem]">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-[20rem] text-xs leading-snug text-slate-400">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <main className="relative z-10 -mt-2 flex min-h-0 flex-1 flex-col rounded-t-[1.75rem] bg-gradient-to-b from-slate-100 to-[#eef2fb] px-4 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pt-6 text-slate-900 shadow-[0_-12px_40px_rgba(15,23,42,0.35)]">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
