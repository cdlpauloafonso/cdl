'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Transacao = {
  id: number;
  data: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  valor: number;
  status: 'confirmado' | 'pendente';
};

export default function LivroCaixaPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0], // Data atual em formato YYYY-MM-DD
    descricao: '',
    categoria: 'Anuidades',
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    metodoPagamento: 'dinheiro' as 'pix' | 'cartao' | 'dinheiro',
    status: 'confirmado' as 'confirmado' | 'pendente',
  });
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [ordenarPor, setOrdenarPor] = useState('data');

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setTransacoes([
        {
          id: 1,
          data: '20/04/2026',
          descricao: 'Pagamento de anuidade - Tech Solutions',
          tipo: 'entrada',
          categoria: 'Anuidades',
          valor: 850.00,
          status: 'confirmado'
        },
        {
          id: 2,
          data: '19/04/2026',
          descricao: 'Aluguel do auditório',
          tipo: 'saida',
          categoria: 'Aluguel',
          valor: 500.00,
          status: 'confirmado'
        },
        {
          id: 3,
          data: '18/04/2026',
          descricao: 'Pagamento de anuidade - Comércio Local',
          tipo: 'entrada',
          categoria: 'Anuidades',
          valor: 650.00,
          status: 'pendente'
        },
        {
          id: 4,
          data: '17/04/2026',
          descricao: 'Material de escritório',
          tipo: 'saida',
          categoria: 'Despesas',
          valor: 120.50,
          status: 'confirmado'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'valor') {
      // Aplicar máscara monetária brasileira
      const numeros = value.replace(/\D/g, '');
      if (numeros === '') {
        setFormData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      
      // Converter para centavos e formatar
      const centavos = parseInt(numeros);
      const reais = centavos / 100;
      const formatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(reais);
      
      setFormData(prev => ({ ...prev, [field]: formatado }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica para salvar a transação
    console.log('Nova transação:', formData);
    // Resetar formulário
    setFormData({
      data: new Date().toISOString().split('T')[0],
      descricao: '',
      categoria: 'Anuidades',
      tipo: 'entrada',
      valor: '',
      metodoPagamento: 'dinheiro',
      status: 'confirmado',
    });
    setShowAddModal(false);
  };

  const exportarPdf = async () => {
    setExportingPdf(true);
    try {
      // Simular exportação PDF
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Exportando PDF com filtro:', { categoria: filtroCategoria, ordenar: ordenarPor, dados: transacoesFiltradas });
      // Aqui você implementaria a lógica real de exportação PDF
      alert('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportarCsv = () => {
    setExportingCsv(true);
    try {
      // Criar CSV com dados filtrados
      const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Método Pagamento'];
      const csvContent = [
        headers.join(','),
        ...transacoesFiltradas.map(transacao => [
          transacao.data,
          `"${transacao.descricao}"`,
          transacao.categoria,
          transacao.tipo,
          transacao.valor.toFixed(2),
          transacao.status,
          transacao.metodoPagamento || 'N/A'
        ].join(','))
      ].join('\n');

      // Criar blob e download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `livro-caixa-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar CSV');
    } finally {
      setExportingCsv(false);
    }
  };

  const totalEntradas = transacoes
    .filter(t => t.tipo === 'entrada' && t.status === 'confirmado')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalSaidas = transacoes
    .filter(t => t.tipo === 'saida' && t.status === 'confirmado')
    .reduce((sum, t) => sum + t.valor, 0);

  const saldo = totalEntradas - totalSaidas;

  // Calcular saldo do dia (transações de hoje)
  const hoje = new Date().toLocaleDateString('pt-BR');
  const transacoesHoje = transacoes.filter(t => t.data === hoje);
  const entradasHoje = transacoesHoje
    .filter(t => t.tipo === 'entrada' && t.status === 'confirmado')
    .reduce((sum, t) => sum + t.valor, 0);
  const saidasHoje = transacoesHoje
    .filter(t => t.tipo === 'saida' && t.status === 'confirmado')
    .reduce((sum, t) => sum + t.valor, 0);
  const saldoHoje = entradasHoje - saidasHoje;

  // Filtrar e ordenar transações
  const transacoesFiltradas = transacoes
    .filter(transacao => {
      if (filtroCategoria === 'todas') return true;
      return transacao.categoria === filtroCategoria;
    })
    .sort((a, b) => {
      switch (ordenarPor) {
        case 'data':
          // Ordenar por data (mais recente primeiro)
          return new Date(b.data).getTime() - new Date(a.data).getTime();
        case 'valor':
          // Ordenar por valor (maior primeiro)
          return b.valor - a.valor;
        case 'descricao':
          // Ordenar por descrição (alfabético)
          return a.descricao.localeCompare(b.descricao);
        default:
          return 0;
      }
    });

  const categoriasDisponiveis = ['todas', 'Anuidades', 'Aluguel', 'Consulta Balcão', 'Despesas', 'Eventos', 'Outros'];

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
          <h1 className="text-2xl font-bold text-gray-900">Livro Caixa</h1>
          <p className="mt-1 text-cdl-gray-text">Gerencie as finanças da CDL</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportarPdf}
            disabled={exportingPdf || transacoesFiltradas.length === 0}
            className="btn-secondary disabled:opacity-50"
          >
            {exportingPdf ? 'Exportando PDF...' : 'Exportar PDF'}
          </button>
          <button
            onClick={exportarCsv}
            disabled={exportingCsv || transacoesFiltradas.length === 0}
            className="btn-secondary disabled:opacity-50"
          >
            {exportingCsv ? 'Exportando CSV...' : 'Exportar CSV'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Adicionar Transação
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Total Entradas</p>
              <p className="text-2xl font-bold text-emerald-800 mt-2">
                R$ {totalEntradas.toFixed(2)}
              </p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Receitas confirmadas</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Total Saídas</p>
              <p className="text-2xl font-bold text-red-800 mt-2">
                R$ {totalSaidas.toFixed(2)}
              </p>
              <p className="text-xs text-red-600 mt-1 font-medium">Despesas confirmadas</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Saldo do Dia</p>
              <p className={`text-2xl font-bold mt-2 ${saldoHoje >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                R$ {saldoHoje.toFixed(2)}
              </p>
              <p className={`text-xs mt-1 font-medium ${saldoHoje >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {saldoHoje >= 0 ? 'Dia positivo' : 'Dia negativo'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
              saldoHoje >= 0 
                ? 'bg-gradient-to-br from-blue-400 to-indigo-600' 
                : 'bg-gradient-to-br from-red-400 to-red-600'
            }`}>
              <svg className={`w-6 h-6 text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Saldo Atual</p>
              <p className={`text-2xl font-bold mt-2 ${saldo >= 0 ? 'text-purple-800' : 'text-red-800'}`}>
                R$ {saldo.toFixed(2)}
              </p>
              <p className={`text-xs mt-1 font-medium ${saldo >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {saldo >= 0 ? 'Caixa positivo' : 'Caixa negativo'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
              saldo >= 0 
                ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                : 'bg-gradient-to-br from-red-400 to-red-600'
            }`}>
              <svg className={`w-6 h-6 text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Categoria</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {categoriasDisponiveis.map(categoria => (
                <option key={categoria} value={categoria}>
                  {categoria === 'todas' ? 'Todas as categorias' : categoria}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="data">Data (mais recente)</option>
              <option value="valor">Valor (maior primeiro)</option>
              <option value="descricao">Descrição (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transacoesFiltradas.map((transacao) => (
                <tr key={transacao.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{transacao.data}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{transacao.descricao}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{transacao.categoria}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transacao.tipo === 'entrada' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {transacao.tipo === 'entrada' ? '+' : '-'}R$ {transacao.valor.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transacao.status === 'confirmado' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transacao.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-cdl-blue hover:text-cdl-blue-dark mr-3 p-1" title="Editar">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button className="text-red-600 hover:text-red-800 p-1" title="Excluir">
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

      {/* Modal de Adicionar Transação */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Transação</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input 
                  type="date" 
                  value={formData.data}
                  onChange={(e) => handleInputChange('data', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input 
                  type="text" 
                  placeholder="Descrição da transação" 
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select 
                  value={formData.categoria}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option>Anuidades</option>
                  <option>Aluguel</option>
                  <option>Consulta Balcão</option>
                  <option>Despesas</option>
                  <option>Eventos</option>
                  <option>Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="tipo" 
                      value="entrada" 
                      checked={formData.tipo === 'entrada'}
                      onChange={(e) => handleInputChange('tipo', e.target.value)}
                      className="mr-2" 
                    />
                    Entrada
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="tipo" 
                      value="saida" 
                      checked={formData.tipo === 'saida'}
                      onChange={(e) => handleInputChange('tipo', e.target.value)}
                      className="mr-2" 
                    />
                    Saída
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input 
                  type="text" 
                  placeholder="R$ 0,00" 
                  value={formData.valor}
                  onChange={(e) => handleInputChange('valor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  style={{ MozAppearance: 'textfield' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="metodoPagamento" 
                      value="pix" 
                      checked={formData.metodoPagamento === 'pix'}
                      onChange={(e) => handleInputChange('metodoPagamento', e.target.value)}
                      className="mr-2" 
                    />
                    PIX
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="metodoPagamento" 
                      value="cartao" 
                      checked={formData.metodoPagamento === 'cartao'}
                      onChange={(e) => handleInputChange('metodoPagamento', e.target.value)}
                      className="mr-2" 
                    />
                    Cartão
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="metodoPagamento" 
                      value="dinheiro" 
                      checked={formData.metodoPagamento === 'dinheiro'}
                      onChange={(e) => handleInputChange('metodoPagamento', e.target.value)}
                      className="mr-2" 
                    />
                    Dinheiro
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="status" 
                      value="confirmado" 
                      checked={formData.status === 'confirmado'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="mr-2" 
                    />
                    Confirmado
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="status" 
                      value="pendente" 
                      checked={formData.status === 'pendente'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="mr-2" 
                    />
                    Pendente
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
    </div>
  );
}
