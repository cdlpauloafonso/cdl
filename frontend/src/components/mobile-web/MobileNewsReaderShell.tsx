import Link from 'next/link';
import type { ReactNode } from 'react';

export function MobileNewsReaderToolbar({
  noticiasIndexHref,
  onShareClick,
  shareDisabled,
  sharing,
}: {
  noticiasIndexHref: string;
  onShareClick: () => void;
  shareDisabled: boolean;
  sharing: boolean;
}) {
  return (
    <div className="sticky top-[env(safe-area-inset-top,0px)] z-30 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#172554]/95 px-3 py-2.5 pr-14 backdrop-blur-md">
      <Link
        href={noticiasIndexHref}
        prefetch={false}
        className="-ml-0.5 inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl px-1.5 text-[13px] font-semibold text-white/95 hover:bg-white/10 active:bg-white/15"
      >
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Notícias</span>
      </Link>

      <button
        type="button"
        onClick={() => void onShareClick()}
        disabled={shareDisabled || sharing}
        aria-label={sharing ? 'Compartilhando…' : 'Compartilhar'}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/90 hover:bg-white/10 disabled:opacity-40 active:bg-white/15"
      >
        {sharing ?
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
        : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        }
      </button>
    </div>
  );
}

export function MobileNewsReaderSurface({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col rounded-t-[1.75rem] bg-gradient-to-b from-slate-100 to-[#eef2fb] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-6 text-slate-900 shadow-[0_-14px_48px_rgba(15,23,42,0.45)]">
      {children}
    </div>
  );
}
