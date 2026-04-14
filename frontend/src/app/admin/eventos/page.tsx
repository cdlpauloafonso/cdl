'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCampaigns, deleteCampaignById, countEventInscriptions, type Campaign } from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getEffectiveRegistration } from '@/lib/event-registration-fields';

export default function AdminEventosPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventoParaExcluir, setEventoParaExcluir] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inscritosPorEvento, setInscritosPorEvento] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await listCampaigns();
        if (!mounted) return;
        setItems(list);
        const countEntries = await Promise.all(
          list
            .filter((ev) => !!ev.id && getEffectiveRegistration(ev).kind === 'form')
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

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-gray-600 mt-1">Campanhas e eventos cadastrados no site.</p>
        </div>
        <Link href="/admin/eventos/novo" className="btn-primary shrink-0 self-start">
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
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900">
                        Título
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        Categoria
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        Data / período
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        Inscritos
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900 text-right whitespace-nowrap">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((ev) => {
                      const reg = getEffectiveRegistration(ev);
                      const inscritos = inscritosPorEvento[ev.id ?? ''] ?? 0;
                      return (
                        <tr key={ev.id} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3 align-top">
                            <span className="font-medium text-gray-900">{ev.title}</span>
                            {ev.description && (
                              <p className="text-cdl-gray-text text-xs mt-1 line-clamp-2 max-w-md">{ev.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-gray-700 whitespace-nowrap">{ev.category || '—'}</td>
                          <td className="px-4 py-3 align-top text-gray-700 whitespace-nowrap">{ev.date || '—'}</td>
                          <td className="px-4 py-3 align-top text-gray-700 whitespace-nowrap">{inscritos}</td>
                          <td className="px-4 py-3 align-top text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
                              <Link
                                href={`/institucional/campanhas/ver?slug=${encodeURIComponent(ev.id)}`}
                                target="_blank"
                                className="inline-block px-2 py-1.5 text-cdl-blue hover:bg-cdl-blue/10 rounded-md text-xs sm:text-sm"
                              >
                                Ver
                              </Link>
                              {reg.kind === 'form' && (
                                <>
                                  <Link
                                    href={`/admin/eventos/inscritos?eventId=${ev.id}`}
                                    className="inline-block px-2 py-1.5 text-emerald-800 hover:bg-emerald-50 rounded-md text-xs sm:text-sm font-medium"
                                  >
                                    Ver inscritos
                                  </Link>
                                  <Link
                                    href={`/institucional/campanhas/inscricao?slug=${encodeURIComponent(ev.id)}`}
                                    target="_blank"
                                    className="inline-block px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md text-xs sm:text-sm"
                                  >
                                    Inscrição
                                  </Link>
                                </>
                              )}
                              <Link
                                href={`/admin/campanhas/edit?id=${ev.id}`}
                                aria-label="Editar evento"
                                title="Editar"
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-cdl-blue hover:bg-cdl-blue/10"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </Link>
                              <button
                                type="button"
                                onClick={() => abrirConfirmacaoExclusao(ev)}
                                disabled={deletingId === ev.id}
                                aria-label="Excluir evento"
                                title="Excluir"
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId === ev.id ? (
                                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
                                    <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-75" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
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
              {getEffectiveRegistration(eventoParaExcluir).kind === 'form' && (
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
