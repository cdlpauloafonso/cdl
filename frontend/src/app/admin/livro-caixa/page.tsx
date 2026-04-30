'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getCategoriasLivroCaixa, 
  getTransacoesLivroCaixa, 
  createTransacaoLivroCaixa, 
  updateTransacaoLivroCaixa, 
  deleteTransacaoLivroCaixa, 
  converterValorMonetario,
  type CategoriaLivroCaixa, 
  type TransacaoLivroCaixa 
} from '@/lib/firestore';

function getTodayInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForStorage(inputDate: string): string {
  if (!inputDate) return '';
  if (inputDate.includes('/')) return inputDate;
  const [year, month, day] = inputDate.split('-');
  if (!year || !month || !day) return inputDate;
  return `${day}/${month}/${year}`;
}

function formatDateForInput(storedDate: string): string {
  if (!storedDate) return getTodayInputDate();
  if (storedDate.includes('-')) return storedDate;
  const [day, month, year] = storedDate.split('/');
  if (!day || !month || !year) return getTodayInputDate();
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseTransactionDateToTime(value: string): number {
  if (!value) return Number.NaN;
  if (value.includes('/')) {
    const [day, month, year] = value.split('/').map((part) => parseInt(part, 10));
    if (!day || !month || !year) return Number.NaN;
    return new Date(year, month - 1, day).getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export default function LivroCaixaPage() {
  const [transacoes, setTransacoes] = useState<TransacaoLivroCaixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransacaoId, setEditingTransacaoId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaLivroCaixa[]>([]);
  const [formData, setFormData] = useState({
    data: getTodayInputDate(),
    descricao: '',
    categoria: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    metodoPagamento: 'dinheiro' as 'pix' | 'cartao' | 'dinheiro',
    status: 'confirmado' as 'confirmado' | 'pendente',
  });
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('data');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar transações reais do Firestore
        const transacoesData = await getTransacoesLivroCaixa();
        setTransacoes(transacoesData);
      } catch (error) {
        console.error('Erro ao carregar transações:', error);
        // Em caso de erro, começar com array vazio
        setTransacoes([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        // Carregar apenas categorias reais do Firestore
        const categoriasData = await getCategoriasLivroCaixa();
        setCategorias(categoriasData);
        
        // Atualizar categoria padrão se a atual não existir
        if (categoriasData.length > 0 && !categoriasData.find(cat => cat.nome === formData.categoria)) {
          setFormData(prev => ({ ...prev, categoria: categoriasData[0].nome }));
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        // Em caso de erro, deixar array vazio para mostrar que não há categorias
        setCategorias([]);
      }
    };

    loadCategorias();
  }, [formData.categoria]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar formulário
      if (!formData.descricao?.trim()) {
        alert('Descrição é obrigatória');
        return;
      }
      if (!formData.categoria?.trim()) {
        alert('Categoria é obrigatória');
        return;
      }
      if (!formData.valor?.trim()) {
        alert('Valor é obrigatório');
        return;
      }
      
      // Converter valor monetário para número
      const valorNumerico = converterValorMonetario(formData.valor);
      
      // Preparar dados para salvar
      const dadosTransacao = {
        data: formatDateForStorage(formData.data),
        descricao: formData.descricao.trim(),
        categoria: formData.categoria.trim(),
        tipo: formData.tipo,
        valor: valorNumerico,
        metodo_pagamento: formData.metodoPagamento,
        status: formData.status
      };
      
      // Salvar no Firestore (criação ou edição)
      if (editingTransacaoId) {
        await updateTransacaoLivroCaixa(editingTransacaoId, dadosTransacao);
      } else {
        await createTransacaoLivroCaixa(dadosTransacao);
      }
      
      // Recarregar transações
      const transacoesAtualizadas = await getTransacoesLivroCaixa();
      setTransacoes(transacoesAtualizadas);
      
      // Resetar formulário
      setFormData({
        data: getTodayInputDate(),
        descricao: '',
        categoria: categorias.length > 0 ? categorias[0].nome : '',
        tipo: 'entrada',
        valor: '',
        metodoPagamento: 'dinheiro',
        status: 'confirmado',
      });
      setEditingTransacaoId(null);
      setShowAddModal(false);
      
      alert(editingTransacaoId ? 'Transação atualizada com sucesso!' : 'Transação cadastrada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar transação');
    }
  };

  const handleEditTransacao = async (transacao: TransacaoLivroCaixa) => {
    try {
      // Abrir modal de edição com dados preenchidos
      setEditingTransacaoId(transacao.id);
      setFormData({
        data: formatDateForInput(transacao.data),
        descricao: transacao.descricao,
        categoria: transacao.categoria,
        tipo: transacao.tipo,
        valor: transacao.valor.toFixed(2),
        metodoPagamento: transacao.metodo_pagamento,
        status: transacao.status,
      });
      setShowAddModal(true);
    } catch (error) {
      console.error('Erro ao preparar edição:', error);
      alert('Erro ao preparar edição');
    }
  };

  const handleDeleteTransacao = async (transacao: TransacaoLivroCaixa) => {
    try {
      if (confirm(`Tem certeza que deseja excluir a transação "${transacao.descricao}"?`)) {
        await deleteTransacaoLivroCaixa(transacao.id);
        
        // Recarregar transações
        const transacoesAtualizadas = await getTransacoesLivroCaixa();
        setTransacoes(transacoesAtualizadas);
        
        alert('Transação excluída com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      alert(error instanceof Error ? error.message : 'Erro ao excluir transação');
    }
  };

  const exportarPdf = async () => {
    setExportingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const dataGeracao = new Date();

      doc.setFontSize(16);
      doc.text('Livro Caixa - CDL', 14, 16);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${dataGeracao.toLocaleDateString('pt-BR')} ${dataGeracao.toLocaleTimeString('pt-BR')}`, 14, 22);

      const resumo = [
        `Entradas: R$ ${totalEntradas.toFixed(2)}`,
        `Saidas: R$ ${totalSaidas.toFixed(2)}`,
        `Saldo: R$ ${saldo.toFixed(2)}`,
      ];
      doc.text(resumo.join(' | '), 14, 30);

      let y = 40;
      doc.setFontSize(11);
      doc.text('Data', 14, y);
      doc.text('Descricao', 42, y);
      doc.text('Categoria', 106, y);
      doc.text('Valor', 158, y);
      doc.text('Status', 184, y);
      y += 4;
      doc.line(14, y, 196, y);
      y += 6;

      doc.setFontSize(9);
      for (const transacao of transacoesFiltradas) {
        if (y > 280) {
          doc.addPage();
          y = 16;
        }

        const valorFormatado = `${transacao.tipo === 'entrada' ? '+' : '-'}R$ ${transacao.valor.toFixed(2)}`;
        doc.text(transacao.data || '-', 14, y);
        doc.text((transacao.descricao || '-').slice(0, 34), 42, y);
        doc.text((transacao.categoria || '-').slice(0, 22), 106, y);
        doc.text(valorFormatado, 158, y);
        doc.text(transacao.status || '-', 184, y);
        y += 6;
      }

      doc.save(`livro-caixa-${new Date().toISOString().split('T')[0]}.pdf`);
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
          transacao.metodo_pagamento || 'N/A'
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

  // Debug para verificar valores reais
  console.log('Valores reais calculados:', {
    totalTransacoes: transacoes.length,
    totalEntradas,
    totalSaidas,
    saldo,
    saldoHoje,
    hoje,
    transacoesHoje: transacoesHoje.length
  });

  // Filtrar e ordenar transações
  const transacoesFiltradas = transacoes
    .filter(transacao => {
      if (filtroCategoria === 'todas') return true;
      return transacao.categoria === filtroCategoria;
    })
    .filter((transacao) => {
      if (!filtroDataInicio && !filtroDataFim) return true;
      const transacaoTime = parseTransactionDateToTime(transacao.data);
      if (Number.isNaN(transacaoTime)) return false;

      if (filtroDataInicio) {
        const inicioTime = parseTransactionDateToTime(filtroDataInicio);
        if (!Number.isNaN(inicioTime) && transacaoTime < inicioTime) return false;
      }

      if (filtroDataFim) {
        const fimTime = parseTransactionDateToTime(filtroDataFim);
        if (!Number.isNaN(fimTime) && transacaoTime > fimTime) return false;
      }

      return true;
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
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="mb-6 flex flex-col gap-3 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Livro Caixa</h1>
          <p className="mt-1 text-cdl-gray-text">Gerencie as finanças da CDL</p>
        </div>
        <div className="hidden w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2 md:flex lg:w-auto lg:gap-3">
          <Link href="/admin/livro-caixa/categorias" className="btn-secondary shrink-0 whitespace-nowrap !px-3 !py-2 text-xs sm:!px-4 sm:!py-2 sm:text-sm">
            Gerenciar Categorias
          </Link>
          <button
            onClick={exportarPdf}
            disabled={exportingPdf || transacoesFiltradas.length === 0}
            className="btn-secondary shrink-0 whitespace-nowrap !px-3 !py-2 text-xs disabled:opacity-50 sm:!px-4 sm:!py-2 sm:text-sm"
          >
            {exportingPdf ? 'Exportando PDF...' : 'Exportar PDF'}
          </button>
          <button
            onClick={exportarCsv}
            disabled={exportingCsv || transacoesFiltradas.length === 0}
            className="btn-secondary shrink-0 whitespace-nowrap !px-3 !py-2 text-xs disabled:opacity-50 sm:!px-4 sm:!py-2 sm:text-sm"
          >
            {exportingCsv ? 'Exportando CSV...' : 'Exportar CSV'}
          </button>
          <button
            onClick={() => {
              setEditingTransacaoId(null);
              setFormData((prev) => ({ ...prev, data: getTodayInputDate() }));
              setShowAddModal(true);
            }}
            className="btn-primary shrink-0 whitespace-nowrap !px-3 !py-2 text-xs sm:!px-4 sm:!py-2 sm:text-sm"
          >
            Adicionar Transação
          </button>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:hidden">
        <Link href="/admin/livro-caixa/categorias" className="btn-secondary !px-3 !py-2 text-xs">
          Gerenciar Categorias
        </Link>
        <button
          onClick={exportarPdf}
          disabled={exportingPdf || transacoesFiltradas.length === 0}
          className="btn-secondary !px-3 !py-2 text-xs disabled:opacity-50"
        >
          {exportingPdf ? 'Exportando PDF...' : 'Exportar PDF'}
        </button>
        <button
          onClick={exportarCsv}
          disabled={exportingCsv || transacoesFiltradas.length === 0}
          className="btn-secondary !px-3 !py-2 text-xs disabled:opacity-50"
        >
          {exportingCsv ? 'Exportando CSV...' : 'Exportar CSV'}
        </button>
        <button
          onClick={() => {
            setEditingTransacaoId(null);
            setFormData((prev) => ({ ...prev, data: getTodayInputDate() }));
            setShowAddModal(true);
          }}
          className="btn-primary !px-3 !py-2 text-xs"
        >
          Adicionar Transação
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:mb-8 lg:grid-cols-4 lg:gap-6">
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 shadow-sm transition-all duration-300 hover:shadow-lg lg:p-6 lg:hover:shadow-xl lg:hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide lg:text-sm">Receitas</p>
              <p className="mt-1 text-lg font-bold text-emerald-800 lg:mt-2 lg:text-2xl">
                R$ {totalEntradas.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-emerald-600 lg:mt-1 lg:text-xs">Receitas confirmadas</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow lg:h-12 lg:w-12 lg:shadow-lg">
              <svg className="h-4 w-4 text-white lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-3 shadow-sm transition-all duration-300 hover:shadow-lg lg:p-6 lg:hover:shadow-xl lg:hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide lg:text-sm">Despesas</p>
              <p className="mt-1 text-lg font-bold text-red-800 lg:mt-2 lg:text-2xl">
                R$ {totalSaidas.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-red-600 lg:mt-1 lg:text-xs">Despesas confirmadas</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow lg:h-12 lg:w-12 lg:shadow-lg">
              <svg className="h-4 w-4 text-white lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-100 p-3 shadow-sm transition-all duration-300 hover:shadow-lg lg:p-6 lg:hover:shadow-xl lg:hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide lg:text-sm">Saldo do Dia</p>
              <p className={`mt-1 text-lg font-bold lg:mt-2 lg:text-2xl ${saldoHoje >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                R$ {saldoHoje.toFixed(2)}
              </p>
              <p className={`mt-0.5 text-[10px] font-medium lg:mt-1 lg:text-xs ${saldoHoje >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {saldoHoje >= 0 ? 'Dia positivo' : 'Dia negativo'}
              </p>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full shadow lg:h-12 lg:w-12 lg:shadow-lg ${
              saldoHoje >= 0 
                ? 'bg-gradient-to-br from-blue-400 to-indigo-600' 
                : 'bg-gradient-to-br from-red-400 to-red-600'
            }`}>
              <svg className="h-4 w-4 text-white lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-3 shadow-sm transition-all duration-300 hover:shadow-lg lg:p-6 lg:hover:shadow-xl lg:hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide lg:text-sm">Saldo Atual</p>
              <p className={`mt-1 text-lg font-bold lg:mt-2 lg:text-2xl ${saldo >= 0 ? 'text-purple-800' : 'text-red-800'}`}>
                R$ {saldo.toFixed(2)}
              </p>
              <p className={`mt-0.5 text-[10px] font-medium lg:mt-1 lg:text-xs ${saldo >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {saldo >= 0 ? 'Caixa positivo' : 'Caixa negativo'}
              </p>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full shadow lg:h-12 lg:w-12 lg:shadow-lg ${
              saldo >= 0 
                ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                : 'bg-gradient-to-br from-red-400 to-red-600'
            }`}>
              <svg className="h-4 w-4 text-white lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-2.5 lg:mb-6 lg:p-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-2.5 lg:grid-cols-4 lg:gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700 lg:text-sm">Filtrar por Categoria</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs lg:h-10 lg:px-3 lg:py-2 lg:text-sm"
            >
              <option value="todas">Todas as categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.nome}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            {categorias.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                <Link href="/admin/livro-caixa/categorias" className="text-cdl-blue hover:underline">
                  Cadastre categorias para filtrar
                </Link>
              </p>
            )}
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700 lg:text-sm">Data inicial</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs lg:h-10 lg:px-3 lg:py-2 lg:text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700 lg:text-sm">Data final</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs lg:h-10 lg:px-3 lg:py-2 lg:text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700 lg:text-sm">Ordenar por</label>
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs lg:h-10 lg:px-3 lg:py-2 lg:text-sm"
            >
              <option value="data">Data (mais recente)</option>
              <option value="valor">Valor (maior primeiro)</option>
              <option value="descricao">Descrição (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3 lg:px-6 lg:py-4">
          <h2 className="text-lg font-semibold text-gray-900">Transações</h2>
        </div>
        <div className="space-y-2 p-2.5 md:hidden">
          {transacoesFiltradas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-cdl-gray-text">
              Nenhuma transação encontrada.
            </p>
          ) : (
            transacoesFiltradas.map((transacao) => (
              <article key={transacao.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{transacao.descricao}</p>
                    <p className="text-xs text-gray-500">{transacao.data} · {transacao.categoria}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    transacao.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {transacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {transacao.tipo === 'entrada' ? '+' : '-'}R$ {transacao.valor.toFixed(2)}
                  </p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    transacao.status === 'confirmado' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {transacao.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <button
                    onClick={() => handleEditTransacao(transacao)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-cdl-blue hover:bg-cdl-blue/10"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteTransacao(transacao)}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 hover:bg-red-50"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
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
                    <button 
                      onClick={() => handleEditTransacao(transacao)}
                      className="text-cdl-blue hover:text-cdl-blue-dark mr-3 p-1" 
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteTransacao(transacao)}
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

      {/* Modal de Adicionar Transação */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="mx-3 w-full max-w-md rounded-lg bg-white p-6 sm:mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTransacaoId ? 'Editar Transação' : 'Adicionar Transação'}
            </h3>
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
                  disabled={categorias.length === 0}
                >
                  {categorias.length === 0 ? (
                    <option value="">Nenhuma categoria cadastrada</option>
                  ) : (
                    categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.nome}>
                        {categoria.nome}
                      </option>
                    ))
                  )}
                </select>
                {categorias.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    <Link href="/admin/livro-caixa/categorias" className="text-cdl-blue hover:underline">
                      Cadastre categorias primeiro
                    </Link>
                  </p>
                )}
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
                  type="submit"
                  className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTransacaoId(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
