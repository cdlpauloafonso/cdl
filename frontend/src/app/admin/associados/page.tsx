'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAssociados, deleteAssociado, type Associado } from '@/lib/firestore';

type ExcluirPendente = { id: string; nome: string; empresa: string };

export default function AdminAssociadosPage() {
  const router = useRouter();
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [excluirPendente, setExcluirPendente] = useState<ExcluirPendente | null>(null);

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

  const abrirConfirmacaoExcluir = (associado: Associado) => {
    setExcluirPendente({
      id: associado.id,
      nome: associado.nome,
      empresa: associado.empresa,
    });
  };

  const cancelarExcluir = () => {
    setExcluirPendente(null);
  };

  const confirmarExcluir = async () => {
    if (!excluirPendente) return;
    const { id } = excluirPendente;
    setExcluirPendente(null);
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

  const irParaEditar = (associadoId: string) => {
    router.push(`/admin/associados/editar?id=${encodeURIComponent(associadoId)}`);
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
          <h1 className="text-2xl font-bold text-gray-900">Associados</h1>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data de Cadastro</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase w-44">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssociados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-cdl-gray-text">
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
                      {associado.created_at ? new Date(associado.created_at.seconds * 1000).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => irParaEditar(associado.id)}
                          className="inline-flex items-center rounded-lg border border-cdl-blue bg-white px-3 py-1.5 text-xs font-medium text-cdl-blue hover:bg-cdl-blue hover:text-white transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirConfirmacaoExcluir(associado)}
                          disabled={deletingId === associado.id}
                          className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
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

      {excluirPendente && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="excluir-titulo"
          onClick={cancelarExcluir}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="excluir-titulo" className="text-lg font-semibold text-gray-900">
              Excluir associado?
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              Deseja realmente excluir este associado? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
              <p>
                <span className="font-medium text-gray-700">Responsável:</span>{' '}
                {excluirPendente.nome}
              </p>
              <p className="mt-1">
                <span className="font-medium text-gray-700">Empresa:</span>{' '}
                {excluirPendente.empresa}
              </p>
            </div>
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
      )}
    </div>
  );
}
