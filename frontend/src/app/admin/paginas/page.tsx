'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listCarouselSlides,
  deleteCarouselSlide,
  sortCarouselSlidesAdminList,
  type CarouselSlide,
} from '@/lib/firestore';

export default function AdminPaginasPage() {
  const [list, setList] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCarouselSlides()
      .then((items) => setList(sortCarouselSlidesAdminList(items)))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    if (!confirm('Excluir este slide do carrossel?')) return;
    await deleteCarouselSlide(id);
    setList((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Páginas (Carrossel)</h1>
        <Link href="/admin/paginas/nova" className="btn-primary">
          Novo slide
        </Link>
      </div>
      <p className="mt-2 text-sm text-cdl-gray-text">
        Slides do carrossel inicial do site. Título, descrição, foto e botões.
      </p>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-cdl-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Título</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Ordem</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {list.map((p) => (
              <tr key={p.id!}>
                <td className="px-4 py-3 text-sm text-gray-900">{p.title}</td>
                <td className="px-4 py-3 text-sm text-cdl-gray-text">{p.order}</td>
                <td className="px-4 py-3 text-right text-sm">
                  <Link href={`/admin/paginas/${p.id!}`} className="text-cdl-blue hover:underline mr-3">
                    Editar
                  </Link>
                  <button type="button" onClick={() => remove(p.id!)} className="text-red-600 hover:underline">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-8 text-center text-cdl-gray-text">Nenhum slide cadastrado. Adicione o primeiro para o carrossel aparecer no site.</p>
        )}
      </div>
    </div>
  );
}
