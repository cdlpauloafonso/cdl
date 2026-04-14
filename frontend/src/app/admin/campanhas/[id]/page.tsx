'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCampaign, updateCampaign, Campaign } from '@/lib/firestore';

export default function AdminCampanhaEditPage() {
  const params = useParams();
  const id = params.id as string;
  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getCampaign(id);
        if (mounted) setCampanha(c);
      } catch {
        if (mounted) setError('Erro ao carregar campanha');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;
  if (!campanha) {
    return (
      <div>
        <Link href="/admin/campanhas" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">← Voltar às campanhas</Link>
        <div className="mt-8 p-8 rounded-xl border border-gray-200 bg-white text-center">
          <p className="text-cdl-gray-text">Campanha não encontrada.</p>
        </div>
      </div>
    );
  }

  async function handleSave() {
    if (!campanha) return;
    setSaving(true);
    setError('');
    try {
      await updateCampaign(id, campanha);
    } catch {
      setError('Erro ao salvar campanha');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link href="/admin/campanhas" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">← Voltar às campanhas</Link>

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Editar campanha</h1>
        <p className="text-cdl-gray-text mb-6">Visualização e edição da campanha</p>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações da Campanha</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input value={campanha.title} onChange={(e) => setCampanha({ ...campanha, title: e.target.value })} className="mt-1 block w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input value={campanha.category} onChange={(e) => setCampanha({ ...campanha, category: e.target.value })} className="mt-1 block w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data/Período</label>
                <input value={campanha.date} onChange={(e) => setCampanha({ ...campanha, date: e.target.value })} className="mt-1 block w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={campanha.description} onChange={(e) => setCampanha({ ...campanha, description: e.target.value })} className="mt-1 block w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Completa</label>
                <textarea value={campanha.fullDescription} onChange={(e) => setCampanha({ ...campanha, fullDescription: e.target.value })} className="mt-1 block w-full rounded-lg border px-3 py-2" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Edição via interface</h3>
                <p className="text-sm text-cdl-gray-text mb-3">Edite os campos acima e clique em salvar para atualizar a campanha no Firebase.</p>
                <p className="text-sm text-cdl-gray-text">A edição via código ainda funciona e pode ser usada como backup.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
            <Link href={`/institucional/campanhas/ver?slug=${encodeURIComponent(campanha.id)}`} target="_blank" className="btn-secondary">Ver página pública</Link>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
