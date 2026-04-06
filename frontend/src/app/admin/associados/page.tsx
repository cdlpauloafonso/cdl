'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAssociados, deleteAssociado, type Associado } from '@/lib/firestore';

export default function AdminAssociadosPage() {
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadAssociados();
  }, []);

  const loadAssociados = async () => {
    try {
      const data = await getAssociados();
      setAssociados(data);
    } catch (error) {
      console.error('Erro ao carregar associados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o associado "${nome}"?`)) return;
    
    setDeletingId(id);
    try {
      await deleteAssociado(id);
      setAssociados(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Erro ao excluir associado:', error);
      alert('Erro ao excluir associado. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAssociados = associados.filter(associado =>
    associado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associado.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associado.cnpj.includes(searchTerm) ||
    associado.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cdl-blue"></div>
          <p className="mt-4 text-cdl-gray-text">Carregando associados...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-8">
        {/* Menu Lateral */}
        <div className="w-64 flex-shrink-0">
          <nav className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Menu</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin/associados"
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-cdl-blue text-white"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Associados
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/associados/planos"
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Planos
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Associados</h1>
              <p className="mt-1 text-cdl-gray-text">Gestão de empresas associadas</p>
            </div>
            <Link href="/admin/associados/adicionar" className="btn-primary">
              Adicionar Associado
            </Link>
          </div>

          {/* Busca */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome, empresa, CNPJ ou email..."
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

          {/* Tabela de Associados */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-cdl-gray">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">CNPJ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Telefone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Plano</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Aniversariantes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data de Cadastro</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAssociados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-cdl-gray-text">
                        {searchTerm ? 'Nenhum associado encontrado para esta busca.' : 'Nenhum associado cadastrado.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAssociados.map((associado) => (
                      <tr key={associado.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{associado.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{associado.empresa}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{associado.cnpj}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{associado.telefone}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{associado.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{associado.plano}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {associado.aniversariantes && associado.aniversariantes.length > 0 ? (
                            <div className="space-y-1">
                              {associado.aniversariantes.map((aniversariante, index) => (
                                <div key={index} className="text-xs">
                                  <strong>{aniversariante.nome}</strong>
                                  {aniversariante.data && ` - ${new Date(aniversariante.data).toLocaleDateString('pt-BR')}`}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {associado.created_at ? new Date(associado.created_at.seconds * 1000).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/associados/editar/${associado.id}`}
                              className="text-cdl-blue hover:underline"
                            >
                              Editar
                            </Link>
                            <button
                              onClick={() => handleDelete(associado.id, associado.nome)}
                              disabled={deletingId === associado.id}
                              className="text-red-600 hover:underline disabled:opacity-50"
                            >
                              {deletingId === associado.id ? 'Excluindo...' : 'Excluir'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {filteredAssociados.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Nenhum associado encontrado' : 'Nenhum associado cadastrado'}
              </h3>
              <p className="text-cdl-gray-text mb-6">
                {searchTerm 
                  ? 'Tente buscar com outros termos.' 
                  : 'Comece adicionando seu primeiro associado.'
                }
              </p>
              <Link href="/admin/associados/adicionar" className="btn-primary">
                Adicionar Primeiro Associado
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
