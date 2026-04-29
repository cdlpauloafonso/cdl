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
          <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">Modelos de Contrato</h1>
              <p className="text-gray-600 mt-1">Gerencie os modelos de contrato para agendamentos</p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                onClick={handleCreate}
                className="w-full rounded-lg bg-cdl-blue px-4 py-2 text-sm text-white transition-colors hover:bg-cdl-blue-dark sm:w-auto"
              >
                + Novo Modelo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 p-3 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Modelos Cadastrados</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {contratos.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Nenhum modelo de contrato encontrado. Crie seu primeiro modelo.
              </div>
            ) : (
              contratos.map((contrato) => (
                <div key={contrato.id} className="p-3 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{contrato.nome}</h3>
                      <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                        {contrato.campos?.length || 0} campos • {contrato.imagens?.length || 0} imagens
                      </p>
                      <div className="mt-1.5 sm:mt-2">
                        <span className="text-xs text-gray-500 sm:text-sm">
                          Criado em: {new Date(contrato.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 sm:ml-4 sm:gap-2">
                      <button
                        onClick={() => handleEdit(contrato)}
                        className="rounded-lg px-3 py-1 text-xs text-cdl-blue transition-colors hover:bg-cdl-blue/10 sm:text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(contrato.id!)}
                        className="rounded-lg px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 sm:text-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="w-full max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-lg">
            {/* Header com botões sempre visíveis */}
            <div className="flex flex-col gap-2 border-b border-gray-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                {selectedContrato ? 'Editar Modelo' : 'Novo Modelo'}
              </h2>
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2">
                <button
                  type="submit"
                  form="contrato-form"
                  disabled={isSubmitting}
                  className="rounded-lg bg-cdl-blue px-3 py-2 text-xs text-white transition-colors hover:bg-cdl-blue-dark disabled:opacity-50 sm:px-4 sm:text-sm"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-200 sm:px-4 sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Mensagem de Sucesso */}
            {showSuccessMessage && (
              <div className="mx-3 mt-2 rounded-lg border border-green-200 bg-green-50 p-2 sm:mx-6 sm:mt-4 sm:p-3">
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
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
              {/* Coluna Esquerda - Campos Dinâmicos e Imagens */}
              <div className="w-full border-b border-gray-200 p-3 overflow-y-auto lg:w-1/3 lg:border-b-0 lg:border-r lg:p-6">
                {/* Campos Dinâmicos */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Campos Dinâmicos
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCampo}
                      className="rounded bg-cdl-blue px-2.5 py-1 text-xs text-white hover:bg-cdl-blue-dark sm:px-3 sm:text-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                    <div className="space-y-1.5 sm:space-y-2">
                    {formData.campos.map((campo) => (
                      <div key={campo} className="flex items-center justify-between rounded bg-gray-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                        <span className="text-xs font-mono sm:text-sm">{'{'}{campo}{'}'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCampo(campo)}
                          className="text-xs text-red-600 hover:text-red-800 sm:text-sm"
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
                      className="rounded bg-cdl-blue px-2.5 py-1 text-xs text-white hover:bg-cdl-blue-dark sm:px-3 sm:text-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                    <div className="space-y-1.5 sm:space-y-2">
                    {formData.imagens.map((url, index) => (
                      <div key={index} className="flex items-center justify-between rounded bg-gray-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                        <span className="truncate text-xs sm:text-sm">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImagem(url)}
                          className="ml-2 text-xs text-red-600 hover:text-red-800 sm:text-sm"
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
              <div className="flex-1 overflow-y-auto p-3 lg:p-6">
                <form id="contrato-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Contrato
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conteúdo do Contrato
                    </label>
                    <div className="overflow-hidden rounded-lg border border-gray-300">
                      <div className="border-b border-gray-300 bg-gray-50 px-2.5 py-2 sm:px-3">
                        <div className="flex gap-1.5 sm:gap-2">
                          <button type="button" className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 sm:text-sm">
                            Negrito
                          </button>
                          <button type="button" className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 sm:text-sm">
                            Itálico
                          </button>
                          <button type="button" className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 sm:text-sm">
                            Título
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={formData.conteudo}
                        onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                        rows={15}
                        className="w-full resize-none border-0 px-3 py-2 text-sm focus:ring-0"
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
