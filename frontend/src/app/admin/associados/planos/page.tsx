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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlanos.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl text-gray-300 mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Nenhum plano encontrado' : 'Nenhum plano cadastrado'}
            </h3>
            <p className="text-cdl-gray-text mb-6">
              {searchTerm 
                ? 'Tente buscar com outros termos.' 
                : 'Comece adicionando seu primeiro plano.'
              }
            </p>
            <Link href="/admin/associados/planos/adicionar" className="btn-primary">
              Adicionar Primeiro Plano
            </Link>
          </div>
        ) : (
          filteredPlanos.map((plano) => (
            <div key={plano.id} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              <div className={`h-2 ${plano.ativo ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plano.nome}</h3>
                    <p className="text-2xl font-bold text-cdl-blue mt-2">{plano.preco}</p>
                    <p className="text-sm text-gray-600">{plano.periodicidade}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(plano.id, plano.ativo)}
                      disabled={togglingId === plano.id}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        plano.ativo 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {togglingId === plano.id ? '...' : plano.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-3">{plano.descricao}</p>

                {plano.beneficios && plano.beneficios.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Benefícios:</h4>
                    <ul className="space-y-1">
                      {plano.beneficios.slice(0, 3).map((beneficio, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {beneficio}
                        </li>
                      ))}
                      {plano.beneficios.length > 3 && (
                        <li className="text-sm text-gray-500">
                          +{plano.beneficios.length - 3} benefícios...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {plano.created_at ? new Date(plano.created_at.seconds * 1000).toLocaleDateString('pt-BR') : '—'}
                  </div>
                  <div className="flex gap-2">
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
