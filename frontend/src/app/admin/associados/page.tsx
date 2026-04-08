'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAssociados, deleteAssociado, type Associado } from '@/lib/firestore';

export default function AdminAssociadosPage() {
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [excluirPendente, setExcluirPendente] = useState<Associado | null>(null);

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
    const associadoParaExcluir = associados.find(a => a.id === id);
    if (associadoParaExcluir) {
      setExcluirPendente(associadoParaExcluir);
      setShowDeleteModal(true);
    }
  };

  const confirmarExcluir = async () => {
    if (!excluirPendente) return;
    
    setDeletingId(excluirPendente.id);
    try {
      await deleteAssociado(excluirPendente.id);
      setAssociados(prev => prev.filter(a => a.id !== excluirPendente.id));
      setShowDeleteModal(false);
      setExcluirPendente(null);
    } catch (error) {
      console.error('Erro ao excluir associado:', error);
      alert('Erro ao excluir associado. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelarExcluir = () => {
    setShowDeleteModal(false);
    setExcluirPendente(null);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de Associados</h1>
          <p className="mt-1 text-cdl-gray-text">Gestão de empresas associadas</p>
        </div>
        <Link href="/admin/associados/adicionar" className="btn-primary">
          Adicionar Associado
        </Link>
      </div>

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
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAssociados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-cdl-gray-text">
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
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/associados/editar?id=${encodeURIComponent(associado.id)}`}
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
              : 'Comece adicionando seu primeiro associado.'}
          </p>
          <Link href="/admin/associados/adicionar" className="btn-primary">
            Adicionar Primeiro Associado
          </Link>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && excluirPendente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir o associado <strong>{excluirPendente.nome}</strong> da empresa <strong>{excluirPendente.empresa}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelarExcluir}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarExcluir()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
