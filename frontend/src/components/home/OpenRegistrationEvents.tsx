'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCampaignsWithOpenInscriptions } from '@/lib/open-inscription-campaigns';
import type { Campaign } from '@/lib/firestore';
import { formatEventDateForDisplay } from '@/lib/event-datetime';
import {
  campaignInscriptionPageUrl,
  campaignPublicPageUrl,
} from '@/lib/campaign-preview';
import { getEffectiveRegistration, hrefForExternalRegistration } from '@/lib/event-registration-fields';
import { resolveAppShellHref } from '@/lib/mobile-shell-links';

export type OpenRegistrationEventsProps = {
  mobileShell?: boolean;
  shellSegment?: string | null;
};

export function OpenRegistrationEvents({
  mobileShell = false,
  shellSegment = null,
}: OpenRegistrationEventsProps) {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listCampaignsWithOpenInscriptions()
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

  function eventHref(c: Campaign): string {
    const slug = c.id ?? '';
    const reg = getEffectiveRegistration(c);
    if (reg.kind === 'external') {
      return hrefForExternalRegistration(reg.url);
    }
    const path =
      reg.kind === 'form'
        ? campaignInscriptionPageUrl(slug)
        : campaignPublicPageUrl(slug);
    return resolveAppShellHref(shellSegment, path);
  }

  const verTodosHref = resolveAppShellHref(shellSegment, '/institucional/campanhas');

  const sectionHeader = (
    <div className={`flex items-end justify-between gap-2 ${mobileShell ? 'mb-3 px-0.5' : 'mb-8'}`}>
      <div className={mobileShell ? '' : 'text-center sm:text-left w-full sm:w-auto'}>
        {mobileShell ? (
          <h2 id="open-registration-events-heading" className="text-base font-bold text-slate-900">
            Eventos
          </h2>
        ) : (
          <>
            <h2 id="open-registration-events-heading" className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Eventos
            </h2>
            <p className="mt-2 text-cdl-gray-text text-sm sm:text-base">
              Participe dos eventos da CDL Paulo Afonso — inscreva-se agora.
            </p>
          </>
        )}
      </div>
      <Link
        href={verTodosHref}
        prefetch={false}
        className={`shrink-0 font-semibold text-cdl-blue hover:underline ${mobileShell ? 'text-xs' : 'text-sm'}`}
      >
        Ver todos
      </Link>
    </div>
  );

  const outerClass = mobileShell ? 'mt-8' : 'py-12 sm:py-16 bg-white';
  const innerClass = mobileShell ? '' : 'container-cdl';

  return (
    <section className={outerClass}>
      <div className={innerClass}>
        {sectionHeader}

        {loading ? (
          <p className={`text-cdl-gray-text ${mobileShell ? 'text-sm' : 'text-center'}`}>Carregando eventos…</p>
        ) : items.length === 0 ? (
          <div
            className={`rounded-xl border border-gray-200 bg-cdl-gray/20 px-4 py-6 text-center ${mobileShell ? 'text-sm' : ''}`}
          >
            <p className="text-cdl-gray-text">
              Nenhum evento com inscrições abertas no momento.
            </p>
            <Link
              href={verTodosHref}
              prefetch={false}
              className="mt-3 inline-block text-sm font-semibold text-cdl-blue hover:underline"
            >
              Ver campanhas e eventos
            </Link>
          </div>
        ) : (
          <ul className={`flex w-full flex-col ${mobileShell ? 'gap-3' : 'gap-4'}`} role="list">
            {items.map((event) => (
              <li key={event.id} className="w-full">
                <EventOpenCard event={event} href={eventHref(event)} mobileShell={mobileShell} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EventOpenCard({
  event,
  href,
  mobileShell = false,
}: {
  event: Campaign;
  href: string;
  mobileShell?: boolean;
}) {
  const reg = getEffectiveRegistration(event);
  const external = reg.kind === 'external';
  const linkProps = external
    ? { href, target: '_blank' as const, rel: 'noopener noreferrer' as const }
    : { href };

  const ctaLabel = external ? 'Inscrever-se' : 'Fazer inscrição';

  const imageWidthClass = mobileShell
    ? 'w-[8.75rem] max-w-[38%]'
    : 'w-[11.25rem] sm:w-[14rem] md:w-[16.75rem]';

  const contentInsetClass = mobileShell
    ? 'left-[8.75rem]'
    : 'left-[11.25rem] sm:left-[14rem] md:left-[16.75rem]';

  const imageWrapClass = `relative aspect-video shrink-0 overflow-hidden border-r border-slate-200/80 bg-slate-100 ${imageWidthClass}`;

  return (
    <Link
      {...linkProps}
      prefetch={false}
      className={`group relative block w-full overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:border-cdl-blue/35 hover:shadow-md active:scale-[0.995] ${
        mobileShell ?
          'border-slate-200/90 shadow-slate-900/[0.04]'
        : 'border-gray-200/90 hover:shadow-lg'
      }`}
    >
      <div className={imageWrapClass}>
        {event.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-black/5 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cdl-blue/25 via-cdl-blue/10 to-slate-50">
            <svg
              className={`text-cdl-blue/45 ${mobileShell ? 'h-8 w-8' : 'h-10 w-10'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <span className="absolute left-2 top-2 z-[1] rounded-full bg-emerald-600/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm sm:text-[10px]">
          Abertas
        </span>
      </div>

      <div
        className={`absolute inset-y-0 right-0 flex min-w-0 flex-col overflow-hidden ${contentInsetClass} ${
          mobileShell ? 'justify-center gap-2 py-2 pl-3.5 pr-9' : 'py-2.5 pl-3.5 pr-11 sm:py-3 sm:pl-4 sm:pr-12'
        }`}
      >
        {mobileShell ? (
          <>
            <h3 className="line-clamp-3 text-[15px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-cdl-blue">
              {event.title}
            </h3>
            <span className="w-fit text-xs font-semibold text-cdl-blue">
              {ctaLabel}
              {external ? ' ↗' : ' →'}
            </span>
          </>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden">
              {event.category ? (
                <span className="w-fit max-w-full truncate rounded-full bg-cdl-blue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cdl-blue">
                  {event.category}
                </span>
              ) : null}

              <h3 className="line-clamp-2 text-base font-bold leading-tight text-gray-900 transition-colors group-hover:text-cdl-blue sm:text-lg">
                {event.title}
              </h3>

              {event.description ? (
                <p className="line-clamp-2 min-h-0 text-xs leading-snug text-cdl-gray-text sm:text-sm">
                  {event.description}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100/90 pt-1.5 text-cdl-gray-text">
              <p className="flex min-w-0 items-center gap-1 truncate">
                <svg className="h-3 w-3 shrink-0 text-cdl-blue/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="truncate text-[11px] font-medium sm:text-xs">
                  {formatEventDateForDisplay(event.date)}
                </span>
              </p>
              <span className="shrink-0 text-xs font-semibold text-cdl-blue sm:text-sm">
                {ctaLabel}
                {external ? ' ↗' : ''}
              </span>
            </div>
          </>
        )}
      </div>

      <span
        className={`pointer-events-none absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/90 text-slate-500 shadow-sm transition-all group-hover:border-cdl-blue/30 group-hover:bg-cdl-blue group-hover:text-white ${
          mobileShell ? 'right-2.5 h-7 w-7' : 'right-3 h-8 w-8 sm:right-4 sm:h-9 sm:w-9'
        }`}
        aria-hidden
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}
