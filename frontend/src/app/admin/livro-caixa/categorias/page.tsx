'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCategoriasLivroCaixa, createCategoriaLivroCaixa, updateCategoriaLivroCaixa, deleteCategoriaLivroCaixa, type CategoriaLivroCaixa } from '@/lib/firestore';

export default function CategoriasLivroCaixaPage() {
  const [categorias, setCategorias] = useState<CategoriaLivroCaixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<CategoriaLivroCaixa | null>(null);
  const [categoriaExcluindo, setCategoriaExcluindo] = useState<CategoriaLivroCaixa | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const data = await getCategoriasLivroCaixa();
        setCategorias(data);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategorias();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategoriaLivroCaixa({
        nome: formData.nome,
        descricao: formData.descricao
      });

      // Recarregar categorias
      const data = await getCategoriasLivroCaixa();
      setCategorias(data);

      setFormData({ nome: '', descricao: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      alert('Erro ao criar categoria');
    }
  };

  const handleEditCategoria = (categoria: CategoriaLivroCaixa) => {
    setCategoriaEditando(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaEditando) return;

    try {
      await updateCategoriaLivroCaixa(categoriaEditando.id, {
        nome: formData.nome,
        descricao: formData.descricao
      });

      // Recarregar categorias
      const data = await getCategoriasLivroCaixa();
      setCategorias(data);

      setFormData({ nome: '', descricao: '' });
      setCategoriaEditando(null);
      setShowEditModal(false);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      alert('Erro ao atualizar categoria');
    }
  };

  const handleDeleteCategoria = (categoria: CategoriaLivroCaixa) => {
    setCategoriaExcluindo(categoria);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!categoriaExcluindo) return;

    try {
      await deleteCategoriaLivroCaixa(categoriaExcluindo.id);

      // Recarregar categorias
      const data = await getCategoriasLivroCaixa();
      setCategorias(data);

      setCategoriaExcluindo(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      alert('Erro ao excluir categoria');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias do Livro Caixa</h1>
          <p className="mt-1 text-cdl-gray-text">Gerencie as categorias de receitas e despesas</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/livro-caixa" className="btn-secondary">
            Voltar para Livro Caixa
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Adicionar Categoria
          </button>
        </div>
      </div>

      {/* Lista de Categorias */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data de Criação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categorias.map((categoria) => (
                <tr key={categoria.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900">{categoria.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {categoria.descricao || <span className="text-gray-400 italic">Sem descrição</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(categoria.created_at?.toDate?.() || categoria.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button 
                      onClick={() => handleEditCategoria(categoria)}
                      className="text-cdl-blue hover:text-cdl-blue-dark mr-3 p-1" 
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteCategoria(categoria)}
                      className="text-red-600 hover:text-red-800 p-1" 
                      title="Excluir"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Adicionar Categoria */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Categoria</h3>
            <form onSubmit={handleAddCategoria} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: Anuidades"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Descreva para que serve esta categoria"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ nome: '', descricao: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Categoria */}
      {showEditModal && categoriaEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Categoria</h3>
            <form onSubmit={handleUpdateCategoria} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: Anuidades"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Descreva para que serve esta categoria"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setCategoriaEditando(null);
                    setFormData({ nome: '', descricao: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Categoria */}
      {showDeleteModal && categoriaExcluindo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Excluir Categoria</h3>
                <p className="text-sm text-gray-600">Tem certeza que deseja excluir esta categoria?</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-medium text-gray-900">{categoriaExcluindo.nome}</p>
              {categoriaExcluindo.descricao && (
                <p className="text-sm text-gray-600 mt-1">{categoriaExcluindo.descricao}</p>
              )}
            </div>
            <p className="text-sm text-red-600 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCategoriaExcluindo(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
