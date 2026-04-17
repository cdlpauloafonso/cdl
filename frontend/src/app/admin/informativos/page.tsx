'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function InformativosPage() {
  const [informativos, setInformativos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simulação de dados - substituir com dados reais do Firestore
    const mockInformativos = [
      {
        id: '1',
        titulo: 'Novo Sistema de Associados',
        descricao: 'Lançamento da nova plataforma de gestão de associados com recursos avançados.',
        data_publicacao: new Date(),
        status: 'ativo',
        tipo: 'sistema'
      },
      {
        id: '2',
        titulo: 'Mudança no Horário de Funcionamento',
        descricao: 'A partir de segunda-feira, o horário de atendimento será das 8h às 17h.',
        data_publicacao: new Date(Date.now() - 86400000),
        status: 'ativo',
        tipo: 'aviso'
      },
      {
        id: '3',
        titulo: 'Manutenção Programada',
        descricao: 'Sistema indisponível no domingo das 2h às 6h para manutenção.',
        data_publicacao: new Date(Date.now() - 172800000),
        status: 'inativo',
        tipo: 'manutencao'
      }
    ];
    setInformativos(mockInformativos);
    setLoading(false);
  }, []);

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Informativos</h1>
          <p className="mt-1 text-cdl-gray-text">Gestão de comunicados e avisos</p>
        </div>
        <Link href="/admin/informativos/adicionar" className="btn-primary">
          Adicionar Informativo
        </Link>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por título, descrição ou tipo..."
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

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ativos</p>
              <p className="text-2xl font-bold text-gray-900">
                {informativos.filter(i => i.status === 'ativo').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inativos</p>
              <p className="text-2xl font-bold text-gray-900">
                {informativos.filter(i => i.status === 'inativo').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sistema</p>
              <p className="text-2xl font-bold text-gray-900">
                {informativos.filter(i => i.tipo === 'sistema').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avisos</p>
              <p className="text-2xl font-bold text-gray-900">
                {informativos.filter(i => i.tipo === 'aviso').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Informativos */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-cdl-gray">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Título</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInformativos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-cdl-gray-text">
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
                            className="text-green-600 hover:underline"
                          >
                            Ativar
                          </button>
                        ) : (
                          <button
                            className="text-yellow-600 hover:underline"
                          >
                            Desativar
                          </button>
                        )}
                        <button
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
    </div>
  );
}
