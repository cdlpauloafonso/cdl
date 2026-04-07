'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getPlanoById, updatePlano, type Plano } from '@/lib/firestore-planos';

export default function EditarPlanoPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<Plano | null>(null);

  useEffect(() => {
    loadPlano();
  }, [id]);

  const loadPlano = async () => {
    try {
      const data = await getPlanoById(id);
      if (data) {
        setPlano(data);
      } else {
        setError('Plano não encontrado.');
      }
    } catch (err) {
      console.error('Erro ao carregar plano:', err);
      setError('Erro ao carregar plano.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plano) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { id: _, created_at, updated_at, ...updateData } = plano;
      await updatePlano(id, updateData);
      
      // Mostrar sucesso e redirecionar
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.push('/admin/associados/planos');
      }, 2000);
      
    } catch (err) {
      console.error('Erro ao atualizar plano:', err);
      setError('Erro ao atualizar plano. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPlano(prev => prev ? ({
      ...prev,
      [name]: value
    }) : null);
  };

  const handleBeneficioChange = (index: number, value: string) => {
    if (!plano) return;
    const novosBeneficios = [...plano.beneficios];
    novosBeneficios[index] = value;
    setPlano(prev => prev ? ({
      ...prev,
      beneficios: novosBeneficios
    }) : null);
  };

  const addBeneficio = () => {
    if (!plano) return;
    setPlano(prev => prev ? ({
      ...prev,
      beneficios: [...prev.beneficios, '']
    }) : null);
  };

  const removeBeneficio = (index: number) => {
    if (!plano) return;
    const novosBeneficios = plano.beneficios.filter((_, i) => i !== index);
    setPlano(prev => prev ? ({
      ...prev,
      beneficios: novosBeneficios
    }) : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cdl-blue"></div>
          <p className="mt-4 text-cdl-gray-text">Carregando plano...</p>
        </div>
      </div>
    );
  }

  if (!plano) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl text-gray-300 mb-4">😞</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Plano não encontrado</h3>
          <p className="text-cdl-gray-text mb-6">O plano que você está tentando editar não foi encontrado.</p>
          <Link href="/admin/associados/planos" className="btn-primary">
            Voltar para Lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/associados/planos"
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Plano</h1>
            <p className="mt-1 text-cdl-gray-text">Atualizar informações do plano</p>
          </div>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 21l-1-1m0 0l-1 1m6-6V6a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2z" />
            </svg>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Plano *
            </label>
            <input
              type="text"
              name="nome"
              value={plano.nome}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              placeholder="Ex: Plano Básico"
              required
            />
          </div>

          {/* Preço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preço *
            </label>
            <input
              type="text"
              name="preco"
              value={plano.preco}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              placeholder="Ex: R$ 99,90/mês"
              required
            />
          </div>

          {/* Periodicidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Periodicidade *
            </label>
            <select
              name="periodicidade"
              value={plano.periodicidade}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              required
            >
              <option value="">Selecione...</option>
              <option value="Mensal">Mensal</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="ativo"
                checked={plano.ativo}
                onChange={(e) => setPlano(prev => prev ? ({ ...prev, ativo: e.target.checked }) : null)}
                className="h-4 w-4 text-cdl-blue focus:ring-cdl-blue border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Plano ativo
              </label>
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição *
          </label>
          <textarea
            name="descricao"
            value={plano.descricao}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
            placeholder="Descreva os detalhes do plano..."
            required
          />
        </div>

        {/* Benefícios */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Benefícios
          </label>
          <div className="space-y-2">
            {plano.beneficios.map((beneficio, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={beneficio}
                  onChange={(e) => handleBeneficioChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  placeholder="Descreva um benefício..."
                />
                {plano.beneficios.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBeneficio(index)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addBeneficio}
              className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors"
            >
              + Adicionar Benefício
            </button>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Atualizar Plano'}
          </button>
          <Link
            href="/admin/associados/planos"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Plano Atualizado!</h3>
              <p className="text-gray-600 mb-6">O plano foi atualizado com sucesso.</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
