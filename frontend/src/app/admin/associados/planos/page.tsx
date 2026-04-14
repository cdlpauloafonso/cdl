'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlanos, deletePlano, togglePlanoStatus, type Plano } from '@/lib/firestore-planos';

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadPlanos();
  }, []);

  const loadPlanos = async () => {
    try {
      const data = await getPlanos();
      setPlanos(data);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${nome}"?`)) return;
    
    setDeletingId(id);
    try {
      await deletePlano(id);
      setPlanos(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      alert('Erro ao excluir plano. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (id: string, ativo: boolean) => {
    setTogglingId(id);
    try {
      await togglePlanoStatus(id, !ativo);
      setPlanos(prev => prev.map(p => 
        p.id === id ? { ...p, ativo: !ativo } : p
      ));
    } catch (error) {
      console.error('Erro ao alterar status do plano:', error);
      alert('Erro ao alterar status do plano. Tente novamente.');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredPlanos = planos.filter(plano =>
    plano.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plano.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plano.preco.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cdl-blue"></div>
          <p className="mt-4 text-cdl-gray-text">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
          <p className="mt-1 text-cdl-gray-text">Gestão de planos para associados</p>
        </div>
        <Link href="/admin/associados/planos/adicionar" className="btn-primary">
          Adicionar Plano
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nome, descrição ou preço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredPlanos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl text-gray-300 mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Nenhum plano encontrado' : 'Nenhum plano cadastrado'}
            </h3>
            <p className="text-cdl-gray-text mb-6">
              {searchTerm ? 'Tente buscar com outros termos.' : 'Comece adicionando seu primeiro plano.'}
            </p>
            <Link href="/admin/associados/planos/adicionar" className="btn-primary">
              Adicionar Primeiro Plano
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredPlanos.map((plano) => (
              <li key={plano.id} className="px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{plano.nome}</h3>
                      <button
                        onClick={() => handleToggleStatus(plano.id, plano.ativo)}
                        disabled={togglingId === plano.id}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          plano.ativo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        {togglingId === plano.id ? '...' : plano.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                    <p className="text-cdl-blue font-semibold mt-1">
                      {plano.preco} <span className="text-gray-600 font-normal">({plano.periodicidade})</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-2">{plano.descricao}</p>
                    {plano.beneficios && plano.beneficios.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {plano.beneficios.length} benefício(s) cadastrado(s)
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-500">
                      {plano.created_at ? new Date(plano.created_at.seconds * 1000).toLocaleDateString('pt-BR') : '—'}
                    </span>
                    <Link
                      href={`/admin/associados/planos/editar/${plano.id}`}
                      className="text-cdl-blue hover:underline text-sm font-medium"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(plano.id, plano.nome)}
                      disabled={deletingId === plano.id}
                      className="text-red-600 hover:underline text-sm font-medium disabled:opacity-50"
                    >
                      {deletingId === plano.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
