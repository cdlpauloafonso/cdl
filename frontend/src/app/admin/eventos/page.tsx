'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCampaigns, countEventInscriptions, type Campaign } from '@/lib/firestore';
import { formatEventDateForDisplay } from '@/lib/event-datetime';
import { campaignPublicPageUrl } from '@/lib/campaign-preview';
import { hasEventFormRegistration, hasEventRegistrationConfigured } from '@/lib/event-registration-fields';
import { EVENT_ADMIN_LIST_PATH, eventSubPageHref } from '@/lib/event-admin-navigation';

/** Ordenação decrescente pela data do evento (mais recentes primeiro); texto livre não parseável usa createdAt. */
function millisFromCreatedAt(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'string') return new Date(v).getTime() || 0;
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof v === 'object' && v !== null && typeof (v as { seconds?: number }).seconds === 'number') {
    return (v as { seconds: number }).seconds * 1000;
  }
  return 0;
}

function parseEventDateForSort(raw: string | undefined): number | null {
  const s = (raw ?? '').trim();
  if (!s) return null;

  const isoDt = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})/);
  if (isoDt) {
    const y = parseInt(isoDt[1].slice(0, 4), 10);
    const mo = parseInt(isoDt[1].slice(5, 7), 10) - 1;
    const day = parseInt(isoDt[1].slice(8, 10), 10);
    const hh = parseInt(isoDt[2], 10);
    const mm = parseInt(isoDt[3], 10);
    const t = new Date(y, mo, day, hh, mm).getTime();
    return Number.isNaN(t) ? null : t;
  }

  const isoStart = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoStart) {
    const t = new Date(isoStart[1]).getTime();
    return Number.isNaN(t) ? null : t;
  }

  const br = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (br) {
    const d = parseInt(br[1], 10);
    const m = parseInt(br[2], 10) - 1;
    let y = parseInt(br[3], 10);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    const t = new Date(y, m, d).getTime();
    return Number.isNaN(t) ? null : t;
  }

  return null;
}

function sortCampaignsByEventDateDesc(list: Campaign[]): Campaign[] {
  return [...list].sort((a, b) => {
    const pa = parseEventDateForSort(a.date);
    const pb = parseEventDateForSort(b.date);
    const ka = pa ?? millisFromCreatedAt(a.createdAt);
    const kb = pb ?? millisFromCreatedAt(b.createdAt);
    if (ka !== kb) return kb - ka;
    return (a.title || '').localeCompare(b.title || '', 'pt-BR');
  });
}

export default function AdminEventosPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inscritosPorEvento, setInscritosPorEvento] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await listCampaigns();
        if (!mounted) return;
        setItems(sortCampaignsByEventDateDesc(list));
        const countEntries = await Promise.all(
          list
            .filter((ev) => !!ev.id && hasEventFormRegistration(ev))
            .map(async (ev) => {
              try {
                const total = await countEventInscriptions(ev.id as string);
                return [ev.id as string, total] as const;
              } catch {
                return [ev.id as string, 0] as const;
              }
            })
        );
        if (!mounted) return;
        setInscritosPorEvento(Object.fromEntries(countEntries));
      } catch {
        if (mounted) setError('Erro ao carregar eventos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="mb-5 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-gray-600 mt-1">Campanhas e eventos cadastrados no site.</p>
        </div>
        <Link href="/admin/eventos/novo" className="btn-primary w-full shrink-0 self-start text-center sm:w-auto">
          Criar evento
        </Link>
      </div>

      {loading ? (
        <p className="p-6 text-cdl-gray-text">Carregando eventos...</p>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-cdl-gray-text">
              Nenhum evento cadastrado. Use <strong className="text-gray-800">Criar evento</strong> para adicionar.
            </div>
          ) : (
            <div className="w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="space-y-2 p-2 md:hidden">
                {items.map((ev) => {
                  const hasRegistration = hasEventRegistrationConfigured(ev);
                  const hasFormRegistration = hasEventFormRegistration(ev);
                  const inscritos = inscritosPorEvento[ev.id ?? ''] ?? 0;
                  const inscricaoEncerrada = Boolean(ev.registrationClosed);
                  return (
                    <article key={ev.id} className="rounded-lg border border-gray-200 bg-white p-2">
                      <div className="min-w-0">
                        <h3 className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold text-gray-900">
                          <span className="truncate">{ev.title}</span>
                          {ev.published === false && (
                            <>
                              <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                                Rascunho
                              </span>
                              {ev.id && (
                                <Link
                                  href={campaignPublicPageUrl(ev.id, { preview: true })}
                                  className="shrink-0 rounded-md bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-gray-900"
                                >
                                  Ver rascunho
                                </Link>
                              )}
                            </>
                          )}
                        </h3>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-snug text-gray-700">
                        <p>
                          <strong>Categoria:</strong> {ev.category || '—'}
                        </p>
                        <p>
                          <strong>Data:</strong> {ev.date ? formatEventDateForDisplay(ev.date) : '—'}
                        </p>
                        <p>
                          <strong>Inscritos:</strong> {inscritos}
                        </p>
                        {hasRegistration && (
                          <p>
                            <strong>Inscrição:</strong> {inscricaoEncerrada ? 'encerrada' : 'aberta'}
                          </p>
                        )}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        <Link
                          href={`/admin/eventos/${ev.id}`}
                          className="inline-flex h-8 items-center rounded-md bg-slate-100 px-2.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/80 hover:bg-slate-200"
                        >
                          Detalhes
                        </Link>
                        {hasFormRegistration && (
                          <Link
                            href={eventSubPageHref('inscritos', ev.id!, EVENT_ADMIN_LIST_PATH)}
                            className="inline-flex h-8 items-center rounded-md bg-emerald-50 px-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100/80"
                          >
                            Inscritos
                          </Link>
                        )}
                        <Link
                          href={`/admin/campanhas/edit?id=${ev.id}`}
                          title="Editar evento"
                          aria-label="Editar evento"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-cdl-blue/10 text-cdl-blue ring-1 ring-cdl-blue/15"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th scope="col" className="px-3 py-2 font-semibold text-gray-900">
                        Título
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">
                        Categoria
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">
                        Data
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">
                        Inscritos
                      </th>
                      <th
                        scope="col"
                        className="w-[1%] min-w-[15.5rem] px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap"
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((ev) => {
                      const hasRegistration = hasEventRegistrationConfigured(ev);
                      const hasFormRegistration = hasEventFormRegistration(ev);
                      const inscritos = inscritosPorEvento[ev.id ?? ''] ?? 0;
                      const inscricaoEncerrada = Boolean(ev.registrationClosed);
                      return (
                        <tr key={ev.id} className="hover:bg-gray-50/80">
                          <td className="px-3 py-2 align-middle">
                            <span className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                              <span>{ev.title}</span>
                              {ev.published === false && (
                                <>
                                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                                    Rascunho
                                  </span>
                                  {ev.id && (
                                    <Link
                                      href={campaignPublicPageUrl(ev.id, { preview: true })}
                                      className="rounded-md bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-gray-900"
                                    >
                                      Ver rascunho
                                    </Link>
                                  )}
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700 whitespace-nowrap">{ev.category || '—'}</td>
                          <td className="px-3 py-2 align-middle text-gray-700 whitespace-nowrap">
                            {ev.date ? formatEventDateForDisplay(ev.date) : '—'}
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700 whitespace-nowrap">
                            {inscritos}
                            {hasRegistration && (
                              <span
                                className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  inscricaoEncerrada ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {inscricaoEncerrada ? 'encerrada' : 'aberta'}
                              </span>
                            )}
                          </td>
                          <td className="min-w-[15.5rem] px-3 py-2 align-middle">
                            <div className="flex flex-nowrap items-center justify-end gap-1.5">
                              <Link
                                href={`/admin/eventos/${ev.id}`}
                                className="inline-flex h-8 shrink-0 items-center rounded-md bg-slate-100 px-2.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/80 transition-colors hover:bg-slate-200"
                              >
                                Detalhes
                              </Link>
                              {hasFormRegistration && (
                                <Link
                                  href={eventSubPageHref('inscritos', ev.id!, EVENT_ADMIN_LIST_PATH)}
                                  className="inline-flex h-8 shrink-0 items-center rounded-md bg-emerald-50 px-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100/80 transition-colors hover:bg-emerald-100"
                                >
                                  Inscritos
                                </Link>
                              )}
                              <Link
                                href={`/admin/campanhas/edit?id=${ev.id}`}
                                title="Editar evento"
                                aria-label="Editar evento"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cdl-blue/10 text-cdl-blue ring-1 ring-cdl-blue/15 transition-colors hover:bg-cdl-blue/15"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
