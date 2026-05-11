'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCampaigns, deleteCampaignById, countEventInscriptions, updateCampaign, type Campaign } from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { formatEventDateForDisplay } from '@/lib/event-datetime';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventoParaExcluir, setEventoParaExcluir] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingRegistrationId, setTogglingRegistrationId] = useState<string | null>(null);
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
            .filter((ev) => !!ev.id && ev.registrationConfig?.type === 'form')
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

  function abrirConfirmacaoExclusao(ev: Campaign) {
    setError('');
    setEventoParaExcluir(ev);
    setShowDeleteModal(true);
  }

  function cancelarExclusao() {
    setShowDeleteModal(false);
    setEventoParaExcluir(null);
  }

  async function confirmarExclusao() {
    const id = eventoParaExcluir?.id;
    if (!id) return;
    try {
      setDeletingId(id);
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('Você precisa estar logado como administrador');
        return;
      }
      const idTokenResult = await user.getIdTokenResult();
      const isClaimAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin);
      if (!isClaimAdmin) {
        const db = getFirestore();
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          setError('Acesso não autorizado');
          return;
        }
      }
      await deleteCampaignById(id);
      setItems((s) => s.filter((c) => c.id !== id));
      setShowDeleteModal(false);
      setEventoParaExcluir(null);
    } catch {
      setError('Erro ao excluir evento');
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleRegistrationClosed(ev: Campaign) {
    if (!ev.id) return;
    const hasRegistrationConfigured =
      (ev.registrationConfig?.type === 'form' && (ev.registrationConfig.fieldKeys?.length ?? 0) > 0) ||
      (ev.registrationConfig?.type === 'external' && Boolean(ev.registrationConfig.url?.trim())) ||
      Boolean(ev.registrationUrl?.trim());
    if (!hasRegistrationConfigured) return;
    const next = !ev.registrationClosed;
    try {
      setTogglingRegistrationId(ev.id);
      setError('');
      await updateCampaign(ev.id, { registrationClosed: next });
      setItems((prev) => prev.map((x) => (x.id === ev.id ? { ...x, registrationClosed: next } : x)));
    } catch {
      setError('Erro ao atualizar status da inscrição do evento');
    } finally {
      setTogglingRegistrationId(null);
    }
  }

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
                  const hasRegistrationConfigured =
                    (ev.registrationConfig?.type === 'form' && (ev.registrationConfig.fieldKeys?.length ?? 0) > 0) ||
                    (ev.registrationConfig?.type === 'external' && Boolean(ev.registrationConfig.url?.trim())) ||
                    Boolean(ev.registrationUrl?.trim());
                  const hasFormRegistration = ev.registrationConfig?.type === 'form';
                  const inscritos = inscritosPorEvento[ev.id ?? ''] ?? 0;
                  const inscricaoEncerrada = Boolean(ev.registrationClosed);
                  return (
                    <article key={ev.id} className="rounded-lg border border-gray-200 bg-white p-2">
                      <div className="min-w-0">
                        <h3 className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold text-gray-900">
                          <span className="truncate">{ev.title}</span>
                          {ev.published === false && (
                            <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                              Rascunho
                            </span>
                          )}
                        </h3>
                        {ev.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-cdl-gray-text">{ev.description}</p>
                        )}
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
                        {hasRegistrationConfigured && (
                          <p>
                            <strong>Inscrição:</strong> {inscricaoEncerrada ? 'encerrada' : 'aberta'}
                          </p>
                        )}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {hasFormRegistration && (
                          <Link
                            href={`/admin/eventos/inscritos?eventId=${ev.id}`}
                            className="inline-flex h-8 items-center rounded-md bg-emerald-50 px-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100/80"
                          >
                            Inscritos
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => void toggleRegistrationClosed(ev)}
                          disabled={togglingRegistrationId === ev.id || !hasRegistrationConfigured}
                          title={
                            !hasRegistrationConfigured
                              ? 'Sem inscrição configurada neste evento'
                              : inscricaoEncerrada
                                ? 'Reabrir inscrição ao público'
                                : 'Encerrar inscrição ao público'
                          }
                          className={`inline-flex h-8 items-center rounded-md px-2 text-xs font-medium ring-1 disabled:opacity-50 ${
                            !hasRegistrationConfigured
                              ? 'cursor-not-allowed bg-gray-50 text-gray-400 ring-gray-100'
                              : inscricaoEncerrada
                                ? 'bg-emerald-50 text-emerald-900 ring-emerald-100'
                                : 'bg-amber-50 text-amber-900 ring-amber-100'
                          }`}
                        >
                          {!hasRegistrationConfigured
                            ? '—'
                            : togglingRegistrationId === ev.id
                              ? '…'
                              : inscricaoEncerrada
                                ? 'Reabrir'
                                : 'Encerrar'}
                        </button>
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
                        <button
                          type="button"
                          onClick={() => abrirConfirmacaoExclusao(ev)}
                          disabled={deletingId === ev.id}
                          title="Excluir evento"
                          aria-label="Excluir evento"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-700 ring-1 ring-red-100 disabled:opacity-50"
                        >
                          {deletingId === ev.id ? (
                            '…'
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
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
                        className="w-[1%] min-w-[12rem] px-2 py-2 text-right font-semibold text-gray-900 whitespace-nowrap lg:min-w-[14rem]"
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((ev) => {
                      const hasRegistrationConfigured =
                        (ev.registrationConfig?.type === 'form' && (ev.registrationConfig.fieldKeys?.length ?? 0) > 0) ||
                        (ev.registrationConfig?.type === 'external' && Boolean(ev.registrationConfig.url?.trim())) ||
                        Boolean(ev.registrationUrl?.trim());
                      const hasFormRegistration = ev.registrationConfig?.type === 'form';
                      const inscritos = inscritosPorEvento[ev.id ?? ''] ?? 0;
                      const inscricaoEncerrada = Boolean(ev.registrationClosed);
                      return (
                        <tr key={ev.id} className="hover:bg-gray-50/80">
                          <td className="px-3 py-2 align-middle">
                            <span className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                              <span>{ev.title}</span>
                              {ev.published === false && (
                                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                                  Rascunho
                                </span>
                              )}
                            </span>
                            {ev.description && (
                              <p className="text-cdl-gray-text mt-0.5 line-clamp-2 max-w-md text-xs">{ev.description}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 align-middle text-gray-700 whitespace-nowrap">{ev.category || '—'}</td>
                          <td className="px-3 py-2 align-middle text-gray-700 whitespace-nowrap">{ev.date ? formatEventDateForDisplay(ev.date) : '—'}</td>
                          <td className="px-3 py-2 align-middle text-gray-700 whitespace-nowrap">
                            {inscritos}
                            {hasRegistrationConfigured && (
                              <span
                                className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  inscricaoEncerrada ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {inscricaoEncerrada ? 'encerrada' : 'aberta'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              {hasFormRegistration && (
                                <Link
                                  href={`/admin/eventos/inscritos?eventId=${ev.id}`}
                                  className="inline-flex h-8 shrink-0 items-center rounded-md bg-emerald-50 px-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100/80 transition-colors hover:bg-emerald-100"
                                >
                                  Inscritos
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => void toggleRegistrationClosed(ev)}
                                disabled={togglingRegistrationId === ev.id || !hasRegistrationConfigured}
                                title={
                                  !hasRegistrationConfigured
                                    ? 'Sem inscrição configurada neste evento'
                                    : inscricaoEncerrada
                                      ? 'Reabrir inscrição ao público'
                                      : 'Encerrar inscrição ao público'
                                }
                                className={`inline-flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium ring-1 transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                                  !hasRegistrationConfigured
                                    ? 'cursor-not-allowed bg-gray-50 text-gray-400 ring-gray-100'
                                    : inscricaoEncerrada
                                      ? 'bg-emerald-50 text-emerald-900 ring-emerald-100 hover:bg-emerald-100'
                                      : 'bg-amber-50 text-amber-900 ring-amber-100 hover:bg-amber-100'
                                }`}
                              >
                                {!hasRegistrationConfigured
                                  ? '—'
                                  : togglingRegistrationId === ev.id
                                    ? '…'
                                    : inscricaoEncerrada
                                      ? 'Reabrir'
                                      : 'Encerrar'}
                              </button>
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
                              <button
                                type="button"
                                onClick={() => abrirConfirmacaoExclusao(ev)}
                                disabled={deletingId === ev.id}
                                title="Excluir evento"
                                aria-label="Excluir evento"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700 ring-1 ring-red-100 transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                {deletingId === ev.id ? (
                                  '…'
                                ) : (
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                )}
                              </button>
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
          {error && !showDeleteModal && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </>
      )}

      {showDeleteModal && eventoParaExcluir && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmar-exclusao-evento-titulo"
          onClick={() => {
            if (!deletingId) cancelarExclusao();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
              <p className="text-sm font-semibold text-amber-900">Área sensível — administrador</p>
              <p className="mt-1 text-xs text-amber-800">
                Esta ação altera dados oficiais do site. Prossiga somente se tiver autorização e certeza do impacto.
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-7 w-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              <h3 id="confirmar-exclusao-evento-titulo" className="text-center text-lg font-bold text-gray-900">
                Excluir evento?
              </h3>
              <p className="mt-3 text-center text-sm text-gray-600">
                O evento <strong className="text-gray-900">{eventoParaExcluir.title}</strong> será removido da listagem e
                da página pública. <span className="font-medium text-gray-800">Não é possível desfazer.</span>
              </p>
              {eventoParaExcluir.registrationConfig?.type === 'form' &&
                (eventoParaExcluir.registrationConfig.fieldKeys?.length ?? 0) > 0 && (
                  <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    Este evento usa inscrição pelo site. Após excluir, o link de inscrição deixa de funcionar; dados já
                    enviados podem exigir tratamento separado no Firebase.
                  </p>
                )}
              {error && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelarExclusao}
                  disabled={deletingId !== null}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarExclusao()}
                  disabled={deletingId !== null}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingId ? 'Excluindo...' : 'Sim, excluir definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
