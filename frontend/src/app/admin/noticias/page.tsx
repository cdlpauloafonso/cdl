'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listNews, deleteNews, updateNews, type NewsItemFirestore } from '@/lib/firestore';

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

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notícias</h1>
        <Link href="/admin/noticias/nova" className="btn-primary">
          Nova notícia
        </Link>
      </div>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                  {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <button
                    type="button"
                    onClick={() => togglePublished(n.id!, n.published || false)}
                    className={`mr-3 px-3 py-1 text-xs font-medium rounded transition-colors ${
                      n.published
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {n.published ? 'Despublicar' : 'Publicar'}
                  </button>
                  <Link href={`/admin/noticias/${n.id!}`} className="text-cdl-blue hover:underline mr-3">
                    Editar
                  </Link>
                  <button type="button" onClick={() => remove(n.id!)} className="text-red-600 hover:underline">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-8 text-center text-cdl-gray-text">Nenhuma notícia publicada.</p>
        )}
      </div>
    </div>
  );
}
