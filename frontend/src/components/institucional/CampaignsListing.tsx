'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCampaignsByCreatedAtDesc, type Campaign } from '@/lib/firestore';
import { formatEventDateForDisplay } from '@/lib/event-datetime';
import { resolveAppShellHref } from '@/lib/mobile-shell-links';

export type CampaignsListingProps = {
  title: string;
  description: string;
  loadingLabel: string;
  /** Lista compacta (corpo já envolve MobileWebSubPageChrome). */
  mobileShell?: boolean;
  shellSegment?: string | null;
  /** Quando dentro do chrome mobile: não repetir giant H1. */
  hideStandaloneHeader?: boolean;
};

export function CampaignsListing({
  title,
  description,
  loadingLabel,
  mobileShell = false,
  shellSegment = null,
  hideStandaloneHeader = false,
}: CampaignsListingProps) {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listCampaignsByCreatedAtDesc()
      .then((list) => {
        if (mounted) setItems(list);
      })
      .catch(() => {
        if (mounted) setItems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function hrefParaVer(slug: string): string {
    const base = `/institucional/campanhas/ver?slug=${encodeURIComponent(slug)}`;
    return resolveAppShellHref(shellSegment, base);
  }

  const associeLink = resolveAppShellHref(shellSegment, '/associe-se');
  const atendimentoHref = resolveAppShellHref(shellSegment, '/atendimento');

  return (
    <div className={mobileShell ? '' : 'py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30'}>
      <div className={mobileShell ? 'w-full' : 'container-cdl'}>
        {!hideStandaloneHeader && title && (
          <div className={`text-center ${mobileShell ? '' : 'mb-12'}`}>
            <h1 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">{title}</h1>
            {description ? (
              <p className="mx-auto max-w-3xl text-lg text-cdl-gray-text sm:text-xl">{description}</p>
            ) : null}
          </div>
        )}

        {loading ?
          <p className={`text-center text-cdl-gray-text ${mobileShell ? 'py-8 text-sm' : ''}`}>{loadingLabel}</p>
        : <>
            <div
              className={
                mobileShell ?
                  'grid grid-cols-2 gap-2.5'
                : 'mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8'
              }
            >
              {items.map((event) => {
                const id = event.id ?? '';
                return (
                  <Link
                    key={event.id}
                    href={hrefParaVer(id)}
                    prefetch={false}
                    className={
                      mobileShell ?
                        'group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-900/[0.04] transition-all hover:border-cdl-blue/35 hover:shadow-lg'
                      : 'group block overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-cdl-blue/30 hover:shadow-lg'
                    }
                  >
                    <div className={`relative overflow-hidden ${mobileShell ? 'h-36' : 'h-48'}`}>
                      {event.image ?
                        <>
                          <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
                          <div className="absolute right-3 top-3">
                            <span className="rounded-full bg-cdl-blue px-2.5 py-0.5 text-[10px] font-semibold text-white">
                              {event.category}
                            </span>
                          </div>
                        </>
                      : <>
                          <div className="absolute inset-0 bg-gradient-to-br from-cdl-blue/20 to-cdl-blue-dark/20" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-cdl-blue/10">
                              <svg className="h-8 w-8 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <p className="text-xs font-medium text-cdl-gray-text">
                              {formatEventDateForDisplay(event.date)}
                            </p>
                          </div>
                          <div className="absolute right-3 top-3">
                            <span className="rounded-full bg-cdl-blue px-2.5 py-0.5 text-[10px] font-semibold text-white">
                              {event.category}
                            </span>
                          </div>
                        </>
                      }
                    </div>

                    <div className={mobileShell ? 'p-4' : 'p-6'}>
                      <h3
                        className={`mb-2 font-bold text-gray-900 transition-colors group-hover:text-cdl-blue ${mobileShell ? 'text-[15px] leading-snug' : 'mb-3 text-xl'}`}
                      >
                        {event.title}
                      </h3>
                      <p
                        className={`mb-4 leading-relaxed text-cdl-gray-text ${mobileShell ? 'line-clamp-3 text-[12px]' : 'text-sm'}`}
                      >
                        {event.description}
                      </p>
                      <div className="border-t border-gray-100 pt-3">
                        <p className="flex items-center gap-2 text-xs text-cdl-gray-text">
                          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {formatEventDateForDisplay(event.date)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className={mobileShell ? 'mt-8 w-full text-left' : 'mt-16 text-center'}>
              <div
                className={
                  mobileShell ?
                    'rounded-2xl bg-gradient-to-r from-cdl-blue to-cdl-blue-dark p-5 text-white'
                  : 'inline-block rounded-xl bg-gradient-to-r from-cdl-blue to-cdl-blue-dark p-8 text-white'
                }
              >
                <h2 className={`font-bold ${mobileShell ? 'mb-2 text-base' : 'mb-3 text-2xl'}`}>
                  Quer participar dos nossos eventos?
                </h2>
                <p className={`mb-5 text-blue-100 ${mobileShell ? 'text-[13px] leading-snug' : 'mb-6 max-w-2xl'}`}>
                  Entre em contato e fique por dentro das campanhas e eventos da CDL Paulo Afonso.
                </p>
                <div className={`flex gap-3 ${mobileShell ? 'flex-col' : 'flex-col justify-center gap-4 sm:flex-row'}`}>
                  <Link href={atendimentoHref} prefetch={false} className="btn-secondary bg-white text-cdl-blue hover:bg-gray-100">
                    Entre em contato
                  </Link>
                  <Link
                    href={associeLink}
                    prefetch={false}
                    className="btn-secondary border-2 border-white text-white hover:bg-white/10"
                  >
                    Associe-se
                  </Link>
                </div>
              </div>
            </div>
          </>
        }
      </div>
    </div>
  );
}
