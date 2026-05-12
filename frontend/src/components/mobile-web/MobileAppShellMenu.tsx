'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

export type MobileAppShellMenuItem = {
  href: string;
  label: string;
  subtitle?: string;
};

type MobileAppShellMenuProps = {
  items: readonly MobileAppShellMenuItem[];
  shellHref: (path: string) => string;
  /** Rótulo curto só no botão (acessível) */
  openButtonLabel?: string;
  /**
   * Botão fixo no canto superior direito (zonas seguras), acima do conteúdo — para shell `/m/` em todas as telas.
   * Deve ficar abaixo do overlay (`z-[100]`) quando o drawer estiver aberto.
   */
  floating?: boolean;
};

const DRAWER_TRANSITION_MS = 320;

export function MobileAppShellMenu({
  items,
  shellHref,
  openButtonLabel = 'Abrir menu',
  floating = false,
}: MobileAppShellMenuProps) {
  const pathname = usePathname();
  const panelId = useId();
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const menuIsActiveRef = useRef(false);

  useEffect(() => {
    menuIsActiveRef.current = open;
  }, [open]);

  const requestClose = useCallback(() => {
    if (!menuIsActiveRef.current) return;
    setLeaving(true);
    setEntered(false);
  }, []);

  const openMenu = useCallback(() => {
    setLeaving(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    requestClose();
  }, [pathname, requestClose]);

  useEffect(() => {
    if (!open || leaving) return undefined;

    setEntered(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntered(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, leaving]);

  useEffect(() => {
    if (!open || !leaving) return undefined;
    const t = window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
      setEntered(false);
      openBtnRef.current?.focus();
    }, DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [open, leaving]);

  useEffect(() => {
    if (!(open || leaving)) return undefined;
    const prevHtml = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    let focusTimer = 0;
    if (open && !leaving) {
      focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 65);
    }
    return () => {
      window.clearTimeout(focusTimer);
      document.documentElement.style.overflow = prevHtml || '';
    };
  }, [open, leaving]);

  useEffect(() => {
    if (!open || leaving) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, leaving, requestClose]);

  const overlayActive = open || leaving;
  const reveal = entered && !leaving;

  return (
    <>
      <button
        ref={openBtnRef}
        type="button"
        aria-expanded={open && !leaving ? entered : false}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => openMenu()}
        className={
          floating ?
            `fixed top-[max(0.625rem,env(safe-area-inset-top,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))] z-[90] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/12 text-white shadow-lg shadow-black/25 backdrop-blur-md transition-colors hover:bg-white/18 active:scale-[0.98]`
          : `relative z-[60] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/15 active:scale-[0.98]`
        }
      >
        <span className="sr-only">{openButtonLabel}</span>
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {overlayActive ? (
        <div className="fixed inset-0 z-[100] isolate" role="presentation">
          <button
            type="button"
            tabIndex={-1}
            className={`absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-[320ms] ease-out motion-reduce:transition-none ${
              reveal ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-label="Fechar menu"
            onClick={() => requestClose()}
          />

          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`absolute right-0 top-0 flex h-[100dvh] w-[min(20rem,calc(100vw-2.5rem))] flex-col border-l border-white/10 bg-gradient-to-b from-[#172554] to-[#0b1224] shadow-2xl shadow-black/40 transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transform-none motion-reduce:transition-none ${
              reveal ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div
              className={`flex items-center justify-between gap-2 border-b border-white/10 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top,0px))] transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                reveal ? 'opacity-100 motion-safe:delay-75 motion-reduce:delay-0' : 'opacity-0'
              }`}
            >
              <div className="min-w-0">
                <p id={titleId} className="text-sm font-bold text-white">
                  Menu
                </p>
                <p className="text-[11px] text-slate-400">CDL Paulo Afonso</p>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => requestClose()}
                className="inline-flex h-10 min-w-[2.75rem] items-center justify-center rounded-lg border border-white/15 bg-white/10 text-[12px] font-semibold text-cyan-100 backdrop-blur hover:bg-white/15"
              >
                Fechar
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3" aria-label="Navegação do app">
              <ul className={`space-y-0.5 transition-opacity duration-200 ease-out motion-reduce:transition-none ${reveal ? 'opacity-100 motion-safe:delay-100 motion-reduce:delay-0' : 'opacity-0'}`}>
                {items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={shellHref(item.href)}
                      prefetch={false}
                      className="flex flex-col rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/10 active:bg-white/[0.12]"
                      onClick={() => requestClose()}
                    >
                      <span className="text-[14px] font-semibold text-white">{item.label}</span>
                      {item.subtitle ? (
                        <span className="mt-0.5 text-[11px] leading-snug text-slate-400">{item.subtitle}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div
              className={`border-t border-white/10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                reveal ? 'opacity-100 motion-safe:delay-[120ms] motion-reduce:delay-0' : 'opacity-0'
              }`}
            >
              <Link
                href="/"
                prefetch={false}
                className="flex w-full items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 py-3 text-[12px] font-semibold text-cyan-200 hover:bg-white/10"
                onClick={() => requestClose()}
              >
                Site completo
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
