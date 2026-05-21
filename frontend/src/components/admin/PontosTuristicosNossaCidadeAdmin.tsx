'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getNossaCidadeCMS, setNossaCidadeCMS, type PontoTuristicoCMS } from '@/lib/firestore';
import { ensureAdminForClientWrite } from '@/lib/admin-client-write-guard';
import { DEFAULT_PONTOS_TURISTICOS_LIST } from '@/components/institucional/PontosTuristicosSection';
import {
  labelPontoTuristicoIcon,
  sortPontosTuristicos,
} from '@/lib/nossa-cidade-pontos-metadata';
import type { PontoTuristicoIconKind } from '@/lib/firestore';

const iconBtn =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors';

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'h-4 w-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'h-4 w-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8"
      />
    </svg>
  );
}

function initialPontosFromCms(cms: Awaited<ReturnType<typeof getNossaCidadeCMS>>): PontoTuristicoCMS[] {
  if (cms == null) {
    return sortPontosTuristicos(
      DEFAULT_PONTOS_TURISTICOS_LIST.map((p, i) => ({
        ...p,
        iconKind: p.iconKind as PontoTuristicoIconKind,
        order: i,
      }))
    );
  }
  const raw = cms.pontosTuristicos;
  if (!raw?.length) return [];
  return sortPontosTuristicos(raw.map((p, i) => ({ ...p, order: p.order ?? i })));
}

export function PontosTuristicosNossaCidadeAdmin() {
  const [pontos, setPontos] = useState<PontoTuristicoCMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const cms = await getNossaCidadeCMS();
    setPontos(initialPontosFromCms(cms));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cms = await getNossaCidadeCMS();
        if (!cancelled) setPontos(initialPontosFromCms(cms));
      } catch {
        if (!cancelled) setPontos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => ({ total: pontos.length }), [pontos.length]);

  async function persistPontos(next: PontoTuristicoCMS[]) {
    const authErr = await ensureAdminForClientWrite();
    if (authErr) {
      alert(authErr);
      return;
    }
    try {
      const cms = await getNossaCidadeCMS();
      await setNossaCidadeCMS({
        excerpt: cms?.excerpt ?? '',
        content: cms?.content ?? '',
        pontosTuristicos: sortPontosTuristicos(next.map((p, i) => ({ ...p, order: i }))),
      });
      await reload();
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Erro ao salvar';
      alert(
        raw.includes('permission') || raw.includes('Permission')
          ? 'Sem permissão no Firestore. Publique as regras com o match /nossaCidade/.'
          : raw
      );
    }
  }

  async function movePonto(id: string, dir: -1 | 1) {
    const index = pontos.findIndex((p) => p.id === id);
    const to = index + dir;
    if (index < 0 || to < 0 || to >= pontos.length) return;
    setMovingId(id);
    try {
      const next = [...pontos];
      const [row] = next.splice(index, 1);
      next.splice(to, 0, row);
      await persistPontos(next);
    } finally {
      setMovingId(null);
    }
  }

  async function removePonto(p: PontoTuristicoCMS) {
    if (!confirm(`Remover o ponto «${p.nome || 'sem nome'}»?`)) return;
    await persistPontos(pontos.filter((x) => x.id !== p.id));
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-500">Carregando pontos turísticos…</div>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-gray-900 sm:text-lg">Pontos turísticos</h2>
          <p className="mt-0.5 text-xs leading-snug text-cdl-gray-text sm:text-sm sm:leading-normal">
            Lista dos cartões na página pública. Use o ícone de lápis para texto, imagem e ícone.
          </p>
        </div>
        <Link
          href="/admin/nossa-cidade/pontos/novo"
          className="shrink-0 rounded-lg bg-cdl-blue px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-cdl-blue-dark sm:py-2"
        >
          Adicionar ponto
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cdl-gray-text">Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{stats.total}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 md:hidden">
        {pontos.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-cdl-gray-text">
            Nenhum ponto cadastrado.
          </p>
        ) : (
          pontos.map((p, index) => (
            <article key={p.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  {p.imageSrc ? (
                    <img src={p.imageSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{p.nome || 'Sem nome'}</h3>
                  {p.descricaoCurta ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-cdl-gray-text">{p.descricaoCurta}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {labelPontoTuristicoIcon(p.iconKind)}
                    </span>
                    <span className="text-[11px] text-cdl-gray-text">Ordem {index + 1}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={movingId === p.id || index === 0}
                  onClick={() => void movePonto(p.id, -1)}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Subir
                </button>
                <button
                  type="button"
                  disabled={movingId === p.id || index >= pontos.length - 1}
                  onClick={() => void movePonto(p.id, 1)}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Descer
                </button>
                <Link
                  href={`/admin/nossa-cidade/pontos/${p.id}`}
                  title="Editar ponto"
                  aria-label="Editar ponto"
                  className={`${iconBtn} bg-cdl-blue/10 text-cdl-blue ring-1 ring-cdl-blue/15 hover:bg-cdl-blue/15`}
                >
                  <EditIcon />
                </Link>
                <button
                  type="button"
                  onClick={() => void removePonto(p)}
                  title="Excluir ponto"
                  aria-label="Excluir ponto"
                  className={`${iconBtn} text-red-600 ring-1 ring-red-200/80 hover:bg-red-50`}
                >
                  <TrashIcon />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-cdl-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Ponto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Ícone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Ordem</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pontos.map((p, index) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                      {p.imageSrc ? (
                        <img src={p.imageSrc} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">—</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{p.nome || 'Sem nome'}</p>
                      {p.descricaoCurta ? (
                        <p className="line-clamp-1 max-w-md text-xs text-cdl-gray-text">{p.descricaoCurta}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{labelPontoTuristicoIcon(p.iconKind)}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-gray-700">{index + 1}</td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex flex-nowrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={movingId === p.id || index === 0}
                      onClick={() => void movePonto(p.id, -1)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      title="Subir"
                      aria-label="Subir ordem"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={movingId === p.id || index >= pontos.length - 1}
                      onClick={() => void movePonto(p.id, 1)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      title="Descer"
                      aria-label="Descer ordem"
                    >
                      ↓
                    </button>
                    <Link
                      href={`/admin/nossa-cidade/pontos/${p.id}`}
                      title="Editar ponto"
                      aria-label="Editar ponto"
                      className={`${iconBtn} bg-cdl-blue/10 text-cdl-blue ring-1 ring-cdl-blue/15 hover:bg-cdl-blue/15`}
                    >
                      <EditIcon />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void removePonto(p)}
                      title="Excluir ponto"
                      aria-label="Excluir ponto"
                      className={`${iconBtn} text-red-600 ring-1 ring-red-200/80 hover:bg-red-50`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pontos.length === 0 && (
          <p className="p-8 text-center text-cdl-gray-text">Nenhum ponto cadastrado.</p>
        )}
      </div>
    </section>
  );
}
