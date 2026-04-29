'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getInformativos, deleteInformativo, ativarInformativo, desativarInformativo, type Informativo } from '@/lib/firestore-informativos';

export default function InformativosPage() {
  const [informativos, setInformativos] = useState<Informativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [excluirPendente, setExcluirPendente] = useState<Informativo | null>(null);

  useEffect(() => {
    loadInformativos();
  }, []);

  const loadInformativos = async () => {
    try {
      const data = await getInformativos();
      setInformativos(data);
    } catch (error) {
      console.error('Erro ao carregar informativos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    const informativoParaExcluir = informativos.find(i => i.id === id);
    if (informativoParaExcluir) {
      setExcluirPendente(informativoParaExcluir);
      setShowDeleteModal(true);
    }
  };

  const confirmarExcluir = async () => {
    if (!excluirPendente) return;
    
    setDeletingId(excluirPendente.id);
    try {
      await deleteInformativo(excluirPendente.id);
      setInformativos(prev => prev.filter(i => i.id !== excluirPendente.id));
      setShowDeleteModal(false);
      setExcluirPendente(null);
    } catch (error) {
      console.error('Erro ao excluir informativo:', error);
      alert('Erro ao excluir informativo. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelarExcluir = () => {
    setShowDeleteModal(false);
    setExcluirPendente(null);
  };

  const handleAtivar = async (id: string) => {
    try {
      await ativarInformativo(id);
      setInformativos(prev => prev.map(i => i.id === id ? { ...i, status: 'ativo' } : i));
    } catch (error) {
      console.error('Erro ao ativar informativo:', error);
      alert('Erro ao ativar informativo. Tente novamente.');
    }
  };

  const handleDesativar = async (id: string) => {
    try {
      await desativarInformativo(id);
      setInformativos(prev => prev.map(i => i.id === id ? { ...i, status: 'inativo' } : i));
    } catch (error) {
      console.error('Erro ao desativar informativo:', error);
      alert('Erro ao desativar informativo. Tente novamente.');
    }
  };

  const filteredInformativos = informativos.filter(informativo =>
    informativo.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    informativo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    informativo.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'inativo':
        return 'bg-gray-100 text-gray-800';
      case 'agendado':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'inativo':
        return 'Inativo';
      case 'agendado':
        return 'Agendado';
      default:
        return status;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'sistema':
        return 'bg-blue-100 text-blue-800';
      case 'aviso':
        return 'bg-orange-100 text-orange-800';
      case 'manutencao':
        return 'bg-red-100 text-red-800';
      case 'evento':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoText = (tipo: string) => {
    switch (tipo) {
      case 'sistema':
        return 'Sistema';
      case 'aviso':
        return 'Aviso';
      case 'manutencao':
        return 'Manutenção';
      case 'evento':
        return 'Evento';
      default:
        return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cdl-blue"></div>
          <p className="mt-4 text-cdl-gray-text">Carregando informativos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Informativos</h1>
          <p className="mt-1 text-cdl-gray-text">Gestão de comunicados e avisos</p>
        </div>
        <Link href="/admin/informativos/adicionar" className="btn-primary w-full sm:w-auto">
          Adicionar Informativo
        </Link>
      </div>

      {/* Busca */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por título, descrição ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue sm:h-11 sm:px-4 sm:py-3 sm:pl-10"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-3 shadow sm:p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-2 sm:p-3">
              <svg className="h-4 w-4 text-green-600 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-2.5 sm:ml-4">
              <p className="text-xs font-medium text-gray-600 sm:text-sm">Ativos</p>
              <p className="text-lg font-bold text-gray-900 sm:text-2xl">
                {informativos.filter(i => i.status === 'ativo').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow sm:p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-gray-100 p-2 sm:p-3">
              <svg className="h-4 w-4 text-gray-600 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-2.5 sm:ml-4">
              <p className="text-xs font-medium text-gray-600 sm:text-sm">Inativos</p>
              <p className="text-lg font-bold text-gray-900 sm:text-2xl">
                {informativos.filter(i => i.status === 'inativo').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow sm:p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-2 sm:p-3">
              <svg className="h-4 w-4 text-blue-600 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-2.5 sm:ml-4">
              <p className="text-xs font-medium text-gray-600 sm:text-sm">Sistema</p>
              <p className="text-lg font-bold text-gray-900 sm:text-2xl">
                {informativos.filter(i => i.tipo === 'sistema').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow sm:p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-orange-100 p-2 sm:p-3">
              <svg className="h-4 w-4 text-orange-600 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-2.5 sm:ml-4">
              <p className="text-xs font-medium text-gray-600 sm:text-sm">Avisos</p>
              <p className="text-lg font-bold text-gray-900 sm:text-2xl">
                {informativos.filter(i => i.tipo === 'aviso').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Informativos */}
      <div className="space-y-2 md:hidden">
        {filteredInformativos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-center text-cdl-gray-text">
            {searchTerm ? 'Nenhum informativo encontrado para esta busca.' : 'Nenhum informativo cadastrado.'}
          </p>
        ) : (
          filteredInformativos.map((informativo) => (
            <article key={informativo.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{informativo.titulo}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">{informativo.descricao}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getTipoBadge(informativo.tipo)}`}>
                  {getTipoText(informativo.tipo)}
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadge(informativo.status)}`}>
                  {getStatusText(informativo.status)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Publicação: {informativo.data_publicacao ? new Date(informativo.data_publicacao).toLocaleDateString('pt-BR') : '—'} ·
                Expiração: {informativo.data_expiracao ? new Date(informativo.data_expiracao).toLocaleDateString('pt-BR') : '—'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/admin/informativos/editar/${informativo.id}`}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-cdl-blue hover:bg-cdl-blue/10"
                >
                  Editar
                </Link>
                {informativo.status === 'inativo' ? (
                  <button
                    onClick={() => handleAtivar(informativo.id)}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                  >
                    Ativar
                  </button>
                ) : (
                  <button
                    onClick={() => handleDesativar(informativo.id)}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-50"
                  >
                    Desativar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(informativo.id, informativo.titulo)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg bg-white shadow-lg md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-cdl-gray">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Título</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Expiração</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInformativos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-cdl-gray-text">
                    {searchTerm ? 'Nenhum informativo encontrado para esta busca.' : 'Nenhum informativo cadastrado.'}
                  </td>
                </tr>
              ) : (
                filteredInformativos.map((informativo) => (
                  <tr key={informativo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-xs truncate font-medium">{informativo.titulo}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-sm truncate">{informativo.descricao}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoBadge(informativo.tipo)}`}>
                        {getTipoText(informativo.tipo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {informativo.data_publicacao ? new Date(informativo.data_publicacao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {informativo.data_expiracao 
                        ? new Date(informativo.data_expiracao).toLocaleDateString('pt-BR')
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(informativo.status)}`}>
                        {getStatusText(informativo.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/informativos/editar/${informativo.id}`}
                          className="text-cdl-blue hover:underline"
                        >
                          Editar
                        </Link>
                        {informativo.status === 'inativo' ? (
                          <button
                            onClick={() => handleAtivar(informativo.id)}
                            className="text-green-600 hover:underline"
                          >
                            Ativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDesativar(informativo.id)}
                            className="text-yellow-600 hover:underline"
                          >
                            Desativar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(informativo.id, informativo.titulo)}
                          className="text-red-600 hover:underline"
                        >
                          Excluir
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

      {filteredInformativos.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl text-gray-300 mb-4">📢</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Nenhum informativo encontrado' : 'Nenhum informativo cadastrado'}
          </h3>
          <p className="text-cdl-gray-text mb-6">
            {searchTerm 
              ? 'Tente buscar com outros termos.' 
              : 'Comece adicionando seu primeiro informativo.'
            }
          </p>
          <Link href="/admin/informativos/adicionar" className="btn-primary">
            Adicionar Primeiro Informativo
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
                Tem certeza que deseja excluir o informativo <strong>{excluirPendente.titulo}</strong>? Esta ação não pode ser desfeita.
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
