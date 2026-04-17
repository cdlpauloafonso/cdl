'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createInformativo, type Informativo } from '@/lib/firestore-informativos';

export default function AdicionarInformativoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'aviso' as Informativo['tipo'],
    status: 'ativo' as Informativo['status'],
    data_publicacao: new Date(),
    data_expiracao: undefined as Date | undefined,
    autor: 'Administrador'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.descricao.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await createInformativo(formData);
      router.push('/admin/informativos');
    } catch (error) {
      console.error('Erro ao criar informativo:', error);
      alert('Erro ao criar informativo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adicionar Informativo</h1>
          <p className="mt-1 text-cdl-gray-text">Criar novo comunicado ou aviso</p>
        </div>
        <Link href="/admin/informativos" className="btn-secondary">
          Voltar
        </Link>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="titulo"
              value={formData.titulo}
              onChange={(e) => handleInputChange('titulo', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              placeholder="Digite o título do informativo..."
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
              Descrição <span className="text-red-500">*</span>
            </label>
            <textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              placeholder="Digite a descrição detalhada do informativo..."
              required
            />
          </div>

          {/* Tipo */}
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              id="tipo"
              value={formData.tipo}
              onChange={(e) => handleInputChange('tipo', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              required
            >
              <option value="sistema">Sistema</option>
              <option value="aviso">Aviso</option>
              <option value="manutencao">Manutenção</option>
              <option value="evento">Evento</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              {formData.tipo === 'sistema' && 'Novidades e atualizações da plataforma'}
              {formData.tipo === 'aviso' && 'Comunicados importantes para os usuários'}
              {formData.tipo === 'manutencao' && 'Indisponibilidades programadas do sistema'}
              {formData.tipo === 'evento' && 'Eventos especiais e datas comemorativas'}
            </p>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              required
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="agendado">Agendado</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              {formData.status === 'ativo' && 'Visível imediatamente para todos os usuários'}
              {formData.status === 'inativo' && 'Não visível para os usuários'}
              {formData.status === 'agendado' && 'Será publicado em uma data específica'}
            </p>
          </div>

          {/* Data de Publicação */}
          <div>
            <label htmlFor="data_publicacao" className="block text-sm font-medium text-gray-700 mb-2">
              Data de Publicação <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="data_publicacao"
              value={formData.data_publicacao ? new Date(formData.data_publicacao).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleInputChange('data_publicacao', new Date(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              required
            />
          </div>

          {/* Data de Expiração */}
          <div>
            <label htmlFor="data_expiracao" className="block text-sm font-medium text-gray-700 mb-2">
              Data de Expiração <span className="text-gray-500">(opcional)</span>
            </label>
            <input
              type="datetime-local"
              id="data_expiracao"
              value={formData.data_expiracao ? new Date(formData.data_expiracao).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleInputChange('data_expiracao', e.target.value ? new Date(e.target.value) : undefined)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
            />
            <p className="mt-2 text-sm text-gray-500">
              {formData.data_expiracao 
                ? `O informativo será automaticamente desativado em ${new Date(formData.data_expiracao).toLocaleDateString('pt-BR')} às ${new Date(formData.data_expiracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Se não definida, o informativo permanecerá ativo indefinidamente'
              }
            </p>
          </div>

          {/* Autor */}
          <div>
            <label htmlFor="autor" className="block text-sm font-medium text-gray-700 mb-2">
              Autor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="autor"
              value={formData.autor}
              onChange={(e) => handleInputChange('autor', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              placeholder="Nome do autor do informativo..."
              required
            />
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Link
              href="/admin/informativos"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Informativo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
