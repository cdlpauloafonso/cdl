'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listNews, deleteNews, updateNews, type NewsItemFirestore } from '@/lib/firestore';
import { formatNewsPublishedDate } from '@/lib/news-date';

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

export default function AdminNoticiasPage() {
  const [list, setList] = useState<NewsItemFirestore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNews(false, 100)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    if (!confirm('Excluir esta notícia?')) return;
    await deleteNews(id);
    setList((prev) => prev.filter((n) => n.id !== id));
  }

  async function togglePublished(id: string, currentStatus: boolean) {
    try {
      await updateNews(id, { published: !currentStatus });
      setList((prev) => 
        prev.map((n) => 
          n.id === id ? { ...n, published: !currentStatus } : n
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status da notícia:', error);
      alert('Erro ao atualizar status da notícia. Tente novamente.');
    }
  }

  const stats = useMemo(() => {
    const total = list.length;
    const published = list.filter((n) => n.published).length;
    const drafts = total - published;
    const totalViews = list.reduce((acc, n) => acc + (n.viewCount ?? 0), 0);
    return { total, published, drafts, totalViews };
  }, [list]);

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notícias</h1>
        <Link href="/admin/noticias/nova" className="btn-primary w-full sm:w-auto">
          Nova notícia
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cdl-gray-text">Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{stats.total}</p>
          <p className="mt-0.5 text-xs text-cdl-gray-text">Até 100 itens carregados</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">Publicadas</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-green-800">{stats.published}</p>
          <p className="mt-0.5 text-xs text-cdl-gray-text">Visíveis no site</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Rascunhos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-800">{stats.drafts}</p>
          <p className="mt-0.5 text-xs text-cdl-gray-text">Não publicadas</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cdl-blue">Visualizações</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-cdl-blue">{stats.totalViews}</p>
          <p className="mt-0.5 text-xs text-cdl-gray-text">Soma nas notícias listadas (até 100)</p>
        </div>
      </div>

      <div className="mt-6 space-y-2 md:hidden">
        {list.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-cdl-gray-text">
            Nenhuma notícia encontrada.
          </p>
        ) : (
          list.map((n) => (
            <article key={n.id!} className="rounded-xl border border-gray-200 bg-white p-3">
              <h2 className="line-clamp-2 text-sm font-semibold text-gray-900">{n.title}</h2>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    n.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {n.published ? 'Publicado' : 'Rascunho'}
                </span>
                <span className="text-xs text-cdl-gray-text">
                  {n.publishedAt ? formatNewsPublishedDate(n.publishedAt, 'short') : '—'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => togglePublished(n.id!, n.published || false)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    n.published
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {n.published ? 'Despublicar' : 'Publicar'}
                </button>
                <Link
                  href={`/admin/noticias/${n.id!}`}
                  title="Editar notícia"
                  aria-label="Editar notícia"
                  className={`${iconBtn} bg-cdl-blue/10 text-cdl-blue ring-1 ring-cdl-blue/15 hover:bg-cdl-blue/15`}
                >
                  <EditIcon />
                </Link>
                <button
                  type="button"
                  onClick={() => remove(n.id!)}
                  title="Excluir notícia"
                  aria-label="Excluir notícia"
                  className={`${iconBtn} text-red-600 ring-1 ring-red-200/80 hover:bg-red-50`}
                >
                  <TrashIcon />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-cdl-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Título</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {list.map((n) => (
              <tr key={n.id!}>
                <td className="px-4 py-3 text-sm text-gray-900">{n.title}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    n.published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {n.published ? 'Publicado' : 'Rascunho'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-cdl-gray-text">
                  {n.publishedAt ? formatNewsPublishedDate(n.publishedAt, 'short') : '—'}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex flex-nowrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => togglePublished(n.id!, n.published || false)}
                      className={`inline-flex h-8 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
                        n.published
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {n.published ? 'Despublicar' : 'Publicar'}
                    </button>
                    <Link
                      href={`/admin/noticias/${n.id!}`}
                      title="Editar notícia"
                      aria-label="Editar notícia"
                      className={`${iconBtn} bg-cdl-blue/10 text-cdl-blue ring-1 ring-cdl-blue/15 hover:bg-cdl-blue/15`}
                    >
                      <EditIcon />
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(n.id!)}
                      title="Excluir notícia"
                      aria-label="Excluir notícia"
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
        {list.length === 0 && (
          <p className="p-8 text-center text-cdl-gray-text">Nenhuma notícia encontrada.</p>
        )}
      </div>
    </div>
  );
}
