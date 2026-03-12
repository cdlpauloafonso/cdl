'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createContrato, updateContrato, deleteContrato, listContratos, Contrato } from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';

export default function ContratosPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    nome: '',
    conteudo: '',
    campos: [] as string[],
    imagens: [] as string[]
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAuth();
    }
  }, [mounted]);

  const checkAuth = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cdl_admin_token') : null;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    setIsAuthenticated(true);
    loadContratos();
  };

  const loadContratos = async () => {
    try {
      const contratosList = await listContratos();
      setContratos(contratosList);
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedContrato(null);
    setFormData({
      nome: '',
      conteudo: '',
      campos: [],
      imagens: []
    });
    setShowModal(true);
  };

  const handleEdit = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setFormData({
      nome: contrato.nome,
      conteudo: contrato.conteudo,
      campos: contrato.campos || [],
      imagens: contrato.imagens || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;

    try {
      await deleteContrato(id);
      await loadContratos();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const contratoData = {
        nome: formData.nome,
        conteudo: formData.conteudo,
        campos: formData.campos,
        imagens: formData.imagens,
        criado_em: new Date().toISOString()
      };

      if (selectedContrato) {
        await updateContrato(selectedContrato.id!, contratoData);
      } else {
        await createContrato(contratoData);
      }

      await loadContratos();
      
      // Mostrar mensagem de sucesso sem fechar o modal
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCampo = () => {
    const campo = prompt('Nome do campo (ex: nome_cliente, data_evento):');
    if (campo && !formData.campos.includes(campo)) {
      setFormData({ ...formData, campos: [...formData.campos, campo] });
    }
  };

  const handleRemoveCampo = (campo: string) => {
    setFormData({ 
      ...formData, 
      campos: formData.campos.filter(c => c !== campo) 
    });
  };

  const handleAddImagem = () => {
    // Implementar upload de imagem futuramente
    const url = prompt('URL da imagem:');
    if (url) {
      setFormData({ ...formData, imagens: [...formData.imagens, url] });
    }
  };

  const handleRemoveImagem = (url: string) => {
    setFormData({ 
      ...formData, 
      imagens: formData.imagens.filter(img => img !== url) 
    });
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando contratos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Modelos de Contrato</h1>
              <p className="text-gray-600 mt-1">Gerencie os modelos de contrato para agendamentos</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors"
              >
                + Novo Modelo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Modelos Cadastrados</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {contratos.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Nenhum modelo de contrato encontrado. Crie seu primeiro modelo.
              </div>
            ) : (
              contratos.map((contrato) => (
                <div key={contrato.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{contrato.nome}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {contrato.campos?.length || 0} campos • {contrato.imagens?.length || 0} imagens
                      </p>
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">
                          Criado em: {new Date(contrato.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(contrato)}
                        className="px-3 py-1 text-cdl-blue hover:bg-cdl-blue/10 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(contrato.id!)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Formulário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header com botões sempre visíveis */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedContrato ? 'Editar Modelo' : 'Novo Modelo'}
              </h2>
              <div className="flex gap-2">
                <button
                  type="submit"
                  form="contrato-form"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Mensagem de Sucesso */}
            {showSuccessMessage && (
              <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Salvo com sucesso!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo em duas colunas */}
            <div className="flex flex-1 overflow-hidden">
              {/* Coluna Esquerda - Campos Dinâmicos e Imagens */}
              <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
                {/* Campos Dinâmicos */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Campos Dinâmicos
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCampo}
                      className="px-3 py-1 text-sm bg-cdl-blue text-white rounded hover:bg-cdl-blue-dark"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.campos.map((campo) => (
                      <div key={campo} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm font-mono">{'{'}{campo}{'}'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCampo(campo)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    {formData.campos.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-4">
                        Nenhum campo dinâmico adicionado
                      </div>
                    )}
                  </div>
                </div>

                {/* Imagens */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Imagens
                    </label>
                    <button
                      type="button"
                      onClick={handleAddImagem}
                      className="px-3 py-1 text-sm bg-cdl-blue text-white rounded hover:bg-cdl-blue-dark"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.imagens.map((url, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImagem(url)}
                          className="text-red-600 hover:text-red-800 text-sm ml-2"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    {formData.imagens.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-4">
                        Nenhuma imagem adicionada
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna Direita - Nome e Conteúdo */}
              <div className="flex-1 p-6 overflow-y-auto">
                <form id="contrato-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Contrato
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conteúdo do Contrato
                    </label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                        <div className="flex gap-2">
                          <button type="button" className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">
                            Negrito
                          </button>
                          <button type="button" className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">
                            Itálico
                          </button>
                          <button type="button" className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">
                            Título
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={formData.conteudo}
                        onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                        rows={15}
                        className="w-full px-3 py-2 border-0 focus:ring-0 resize-none"
                        placeholder="Digite o conteúdo do contrato aqui. Use {nome_cliente}, {data_evento} como campos dinâmicos..."
                        required
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
