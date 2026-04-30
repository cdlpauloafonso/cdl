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
      <p className="p-6 text-cdl-gray-text">Carregando informativos...</p>
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

      {filteredInformativos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-cdl-gray-text">
          {searchTerm ? 'Nenhum informativo encontrado para esta busca.' : 'Nenhum informativo cadastrado.'}
        </div>
      ) : (
        <div className="w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="space-y-2 p-2 md:hidden">
            {filteredInformativos.map((informativo) => (
              <article key={informativo.id} className="rounded-lg border border-gray-200 bg-white p-2">
              <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{informativo.titulo}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">{informativo.descricao}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-snug text-gray-700">
                <p>
                  <strong>Tipo:</strong> {getTipoText(informativo.tipo)}
                </p>
                <p>
                  <strong>Status:</strong> {getStatusText(informativo.status)}
                </p>
                <p>
                  <strong>Publicação:</strong>{' '}
                  {informativo.data_publicacao ? new Date(informativo.data_publicacao).toLocaleDateString('pt-BR') : '—'}
                </p>
                <p>
                  <strong>Expiração:</strong>{' '}
                  {informativo.data_expiracao ? new Date(informativo.data_expiracao).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getTipoBadge(informativo.tipo)}`}>
                  {getTipoText(informativo.tipo)}
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadge(informativo.status)}`}>
                  {getStatusText(informativo.status)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/admin/informativos/editar/${informativo.id}`}
                  className="inline-flex h-8 items-center rounded-md bg-cdl-blue/10 px-2 text-xs font-medium text-cdl-blue ring-1 ring-cdl-blue/15"
                >
                  Editar
                </Link>
                {informativo.status === 'inativo' ? (
                  <button
                    onClick={() => handleAtivar(informativo.id)}
                    className="inline-flex h-8 items-center rounded-md bg-emerald-50 px-2 text-xs font-medium text-emerald-900 ring-1 ring-emerald-100"
                  >
                    Ativar
                  </button>
                ) : (
                  <button
                    onClick={() => handleDesativar(informativo.id)}
                    className="inline-flex h-8 items-center rounded-md bg-amber-50 px-2 text-xs font-medium text-amber-900 ring-1 ring-amber-100"
                  >
                    Desativar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(informativo.id, informativo.titulo)}
                  className="inline-flex h-8 items-center rounded-md bg-red-50 px-2 text-xs font-medium text-red-700 ring-1 ring-red-100"
                >
                  Excluir
                </button>
              </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 font-semibold text-gray-900">Título</th>
                  <th className="px-3 py-2 font-semibold text-gray-900">Tipo</th>
                  <th className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">Publicação</th>
                  <th className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">Expiração</th>
                  <th className="px-3 py-2 font-semibold text-gray-900">Status</th>
                  <th className="w-[1%] min-w-[13rem] px-2 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInformativos.map((informativo) => (
                  <tr key={informativo.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2 align-middle">
                      <p className="max-w-md truncate font-medium text-gray-900">{informativo.titulo}</p>
                      {informativo.descricao && (
                        <p className="text-cdl-gray-text mt-0.5 line-clamp-2 max-w-md text-xs">{informativo.descricao}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getTipoBadge(informativo.tipo)}`}>
                        {getTipoText(informativo.tipo)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle text-gray-700 whitespace-nowrap">
                      {informativo.data_publicacao ? new Date(informativo.data_publicacao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-3 py-2 align-middle text-gray-700 whitespace-nowrap">
                      {informativo.data_expiracao ? new Date(informativo.data_expiracao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadge(informativo.status)}`}>
                        {getStatusText(informativo.status)}
                      </span>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Link
                          href={`/admin/informativos/editar/${informativo.id}`}
                          className="inline-flex h-8 shrink-0 items-center rounded-md bg-cdl-blue/10 px-2 text-xs font-medium text-cdl-blue ring-1 ring-cdl-blue/15"
                        >
                          Editar
                        </Link>
                        {informativo.status === 'inativo' ? (
                          <button
                            onClick={() => handleAtivar(informativo.id)}
                            className="inline-flex h-8 shrink-0 items-center rounded-md bg-emerald-50 px-2 text-xs font-medium text-emerald-900 ring-1 ring-emerald-100"
                          >
                            Ativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDesativar(informativo.id)}
                            className="inline-flex h-8 shrink-0 items-center rounded-md bg-amber-50 px-2 text-xs font-medium text-amber-900 ring-1 ring-amber-100"
                          >
                            Desativar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(informativo.id, informativo.titulo)}
                          className="inline-flex h-8 shrink-0 items-center rounded-md bg-red-50 px-2 text-xs font-medium text-red-700 ring-1 ring-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
