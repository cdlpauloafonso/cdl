'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAssociados, deleteAssociado, updateAssociado, type Associado } from '@/lib/firestore';

function hasRequiredMissingFields(a: Associado): boolean {
  const isBlank = (v?: string) => !v || !v.trim();
  const cnpjDigits = (a.cnpj || '').replace(/\D/g, '');
  return (
    cnpjDigits.length !== 14 ||
    isBlank(a.nome) ||
    isBlank(a.empresa) ||
    isBlank(a.telefone) ||
    isBlank(a.endereco) ||
    isBlank(a.cidade) ||
    isBlank(a.estado)
  );
}

function labelStatus(status?: string): string {
  if (status === 'desativado') return 'Desativado';
  if (status === 'em_negociacao') return 'Em negociação';
  return 'Ativo';
}

type AssociadoStatus = 'ativo' | 'desativado' | 'em_negociacao';

export default function AdminAssociadosPage() {
  const allFieldKeys = [
    'cnpj',
    'empresa',
    'razao_social',
    'telefone',
    'plano',
    'codigo_spc',
    'endereco',
    'nome',
    'telefone_responsavel',
    'email',
    'quantidade_funcionarios',
    'cep',
    'cidade',
    'estado',
    'status',
  ] as const;
  type VisibleFieldKey = (typeof allFieldKeys)[number];
  const fieldLabel: Record<VisibleFieldKey, string> = {
    status: 'Status',
    nome: 'Nome',
    empresa: 'Empresa',
    razao_social: 'Razão social',
    cnpj: 'CNPJ',
    telefone: 'Telefone Empresa',
    telefone_responsavel: 'Telefone do responsável',
    email: 'Email',
    plano: 'Plano',
    codigo_spc: 'Código SPC',
    quantidade_funcionarios: 'Qtd. funcionários',
    cep: 'CEP',
    endereco: 'Endereço',
    cidade: 'Cidade',
    estado: 'Estado',
  };

  const [associados, setAssociados] = useState<Associado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlano, setSelectedPlano] = useState('todos');
  const [selectedCidade, setSelectedCidade] = useState('todas');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'ativo' | 'desativado' | 'em_negociacao'>('todos');
  const [sortBy, setSortBy] = useState<'nome' | 'empresa' | 'plano' | 'cidade'>('empresa');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [onlyPendingRequired, setOnlyPendingRequired] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleFieldKeys, setVisibleFieldKeys] = useState<VisibleFieldKey[]>([
    'empresa',
    'razao_social',
    'cnpj',
    'telefone',
    'email',
    'plano',
    'codigo_spc',
    'endereco',
    'status',
  ]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    id: string;
    nome: string;
    empresa: string;
    current: AssociadoStatus;
    next: AssociadoStatus;
  } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [excluirPendente, setExcluirPendente] = useState<Associado | null>(null);
  const [visualizacaoPendente, setVisualizacaoPendente] = useState<Associado | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [quickEditDrafts, setQuickEditDrafts] = useState<Record<string, Partial<Record<VisibleFieldKey, string>>>>({});

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

  const handleDelete = async (id: string) => {
    const associadoParaExcluir = associados.find(a => a.id === id);
    if (associadoParaExcluir) {
      setExcluirPendente(associadoParaExcluir);
      setShowDeleteModal(true);
    }
  };

  const handleView = (id: string) => {
    const associado = associados.find((a) => a.id === id);
    if (!associado) return;
    setVisualizacaoPendente(associado);
    setShowViewModal(true);
  };

  const confirmarExcluir = async () => {
    if (!excluirPendente) return;
    
    setDeletingId(excluirPendente.id);
    try {
      await deleteAssociado(excluirPendente.id);
      setAssociados(prev => prev.filter(a => a.id !== excluirPendente.id));
      setSelectedIds(prev => prev.filter((id) => id !== excluirPendente.id));
      setShowDeleteModal(false);
      setExcluirPendente(null);
    } catch (error) {
      console.error('Erro ao excluir associado:', error);
      alert('Erro ao excluir associado. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelarExcluir = () => {
    setShowDeleteModal(false);
    setExcluirPendente(null);
  };

  const confirmarExcluirSelecionados = async () => {
    if (selectedCount === 0) {
      setShowBulkDeleteModal(false);
      return;
    }
    setDeletingBulk(true);
    try {
      const idsToDelete = filteredAssociados.filter((a) => selectedIds.includes(a.id)).map((a) => a.id);
      for (const id of idsToDelete) {
        await deleteAssociado(id);
      }
      setAssociados((prev) => prev.filter((a) => !idsToDelete.includes(a.id)));
      setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error('Erro ao excluir associados selecionados:', error);
      alert('Erro ao excluir associados selecionados. Tente novamente.');
    } finally {
      setDeletingBulk(false);
    }
  };

  const startQuickEditMode = () => {
    setQuickEditDrafts({});
    setQuickEditMode(true);
  };

  const cancelQuickEditMode = () => {
    setQuickEditDrafts({});
    setQuickEditMode(false);
  };

  const getQuickFieldValue = (associado: Associado, key: VisibleFieldKey): string => {
    const draft = quickEditDrafts[associado.id]?.[key];
    if (draft !== undefined) return draft;
    if (key === 'status') return ((associado.status as AssociadoStatus | undefined) ?? 'ativo');
    const value = (associado[key] ?? '').toString();
    return key === 'email' ? value.toLowerCase() : value;
  };

  const updateQuickField = (associadoId: string, key: VisibleFieldKey, value: string) => {
    const normalizedValue = key === 'email' ? value.toLowerCase() : value;
    setQuickEditDrafts((prev) => ({
      ...prev,
      [associadoId]: {
        ...(prev[associadoId] ?? {}),
        [key]: normalizedValue,
      },
    }));
  };

  const concluirQuickEdit = async () => {
    setSavingQuickEdit(true);
    try {
      const updates: Array<{ id: string; data: Partial<Omit<Associado, 'id' | 'created_at'>> }> = [];

      Object.entries(quickEditDrafts).forEach(([id, draft]) => {
        const associadoAtual = associados.find((a) => a.id === id);
        if (!associadoAtual) return;
        const payload: Partial<Omit<Associado, 'id' | 'created_at'>> = {};

        (Object.keys(draft) as VisibleFieldKey[]).forEach((key) => {
          if (key === 'cnpj') return; // exceção solicitada: CNPJ não entra na edição rápida
          const next = draft[key];
          if (next === undefined) return;
          const current =
            key === 'status'
              ? ((associadoAtual.status as AssociadoStatus | undefined) ?? 'ativo')
              : (associadoAtual[key] ?? '').toString();
          if (next === current) return;
          if (key === 'status') {
            payload.status = next as AssociadoStatus;
          } else {
            (payload as Record<string, string>)[key] = next;
          }
        });

        if (Object.keys(payload).length > 0) {
          updates.push({ id, data: payload });
        }
      });

      for (const item of updates) {
        await updateAssociado(item.id, item.data);
      }

      if (updates.length > 0) {
        setAssociados((prev) =>
          prev.map((a) => {
            const changed = updates.find((u) => u.id === a.id);
            return changed ? ({ ...a, ...changed.data } as Associado) : a;
          })
        );
      }

      setQuickEditDrafts({});
      setQuickEditMode(false);
    } catch (error) {
      console.error('Erro ao salvar edição rápida:', error);
      alert('Erro ao salvar alterações rápidas. Tente novamente.');
    } finally {
      setSavingQuickEdit(false);
    }
  };

  const solicitarAlteracaoStatus = (associado: Associado, nextStatus: AssociadoStatus) => {
    const current = (associado.status as AssociadoStatus | undefined) ?? 'ativo';
    if (current === nextStatus) return;
    setStatusChangeTarget({
      id: associado.id,
      nome: associado.nome,
      empresa: associado.empresa,
      current,
      next: nextStatus,
    });
  };

  const confirmarAlteracaoStatus = async () => {
    if (!statusChangeTarget) return;
    setUpdatingStatusId(statusChangeTarget.id);
    try {
      await updateAssociado(statusChangeTarget.id, { status: statusChangeTarget.next });
      setAssociados((prev) =>
        prev.map((a) =>
          a.id === statusChangeTarget.id ? { ...a, status: statusChangeTarget.next } : a
        )
      );
      setStatusChangeTarget(null);
    } catch (error) {
      console.error('Erro ao atualizar status do associado:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const planos = useMemo(
    () => Array.from(new Set(associados.map((a) => a.plano).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [associados]
  );

  const cidades = useMemo(
    () => Array.from(new Set(associados.map((a) => a.cidade).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [associados]
  );
  const statusResumo = useMemo(() => {
    let ativo = 0;
    let desativado = 0;
    let emNegociacao = 0;
    associados.forEach((a) => {
      const status = a.status ?? 'ativo';
      if (status === 'desativado') desativado += 1;
      else if (status === 'em_negociacao') emNegociacao += 1;
      else ativo += 1;
    });
    return {
      total: associados.length,
      ativo,
      desativado,
      emNegociacao,
    };
  }, [associados]);
  const associadosEmNegociacaoCount = useMemo(
    () => associados.filter((a) => (a.status ?? 'ativo') === 'em_negociacao').length,
    [associados]
  );

  const filteredAssociados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const filtered = associados.filter((associado) => {
      const matchSearch =
        !term ||
        associado.nome.toLowerCase().includes(term) ||
        associado.empresa.toLowerCase().includes(term) ||
        (associado.razao_social || '').toLowerCase().includes(term) ||
        associado.cnpj.includes(searchTerm) ||
        associado.email.toLowerCase().includes(term);
      const matchPlano = selectedPlano === 'todos' || associado.plano === selectedPlano;
      const matchCidade = selectedCidade === 'todas' || associado.cidade === selectedCidade;
      const matchStatus = selectedStatus === 'todos' || (associado.status ?? 'ativo') === selectedStatus;
      const matchPendencia = !onlyPendingRequired || hasRequiredMissingFields(associado);
      return matchSearch && matchPlano && matchCidade && matchStatus && matchPendencia;
    });

    return filtered.sort((a, b) => {
      const aValue = (a[sortBy] || '').toString().toLowerCase();
      const bValue = (b[sortBy] || '').toString().toLowerCase();
      const comparison = aValue.localeCompare(bValue, 'pt-BR');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [associados, searchTerm, selectedPlano, selectedCidade, selectedStatus, sortBy, sortDirection, onlyPendingRequired]);

  const selectedCount = useMemo(
    () => filteredAssociados.filter((a) => selectedIds.includes(a.id)).length,
    [filteredAssociados, selectedIds]
  );

  const allFilteredSelected = filteredAssociados.length > 0 && selectedCount === filteredAssociados.length;
  const displayedFieldKeys = allFieldKeys.filter((k) => visibleFieldKeys.includes(k));
  const associadosParaExportar = useMemo(
    () =>
      selectedCount > 0
        ? filteredAssociados.filter((a) => selectedIds.includes(a.id))
        : filteredAssociados,
    [filteredAssociados, selectedIds, selectedCount]
  );

  function exportarCsv() {
    if (associadosParaExportar.length === 0) return;
    if (displayedFieldKeys.length === 0) {
      alert('Selecione ao menos um campo visível para exportar.');
      return;
    }
    setExportingCsv(true);
    try {
      const headers = ['Nº', ...displayedFieldKeys.map((k) => fieldLabel[k])];
      const escapeCsv = (value: string) => {
        const v = (value ?? '').toString();
        if (/[",;\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
        return v;
      };
      const lines = [
        headers.join(';'),
        ...associadosParaExportar.map((a, index) =>
          [String(index + 1), ...displayedFieldKeys
            .map((k) => (k === 'status' ? labelStatus(a.status) : (a[k] ?? '').toString()))]
            .map(escapeCsv)
            .join(';')
        ),
      ];
      const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `associados-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
    }
  }

  async function exportarPdf() {
    if (associadosParaExportar.length === 0) return;
    if (displayedFieldKeys.length === 0) {
      alert('Selecione ao menos um campo visível para exportar.');
      return;
    }
    setExportingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const lineH = 3.6;
      let y = margin;

      const headers = ['Nº', ...displayedFieldKeys.map((k) => fieldLabel[k])];
      const colW = (pageW - margin * 2) / headers.length;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Lista de Associados', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR')} · ${associadosParaExportar.length} registro(s)`,
        margin,
        y
      );
      y += 6;

      const drawHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        headers.forEach((h, i) => {
          const x = margin + i * colW;
          doc.rect(x, y, colW, 7);
          const lines = doc.splitTextToSize(h, colW - 2) as string[];
          doc.text(lines[0] ?? h, x + 1, y + 4.5);
        });
        y += 7;
        doc.setFont('helvetica', 'normal');
      };

      const ensureRowSpace = (rowH: number) => {
        if (y + rowH > pageH - margin) {
          doc.addPage();
          y = margin;
          drawHeader();
        }
      };

      drawHeader();

      associadosParaExportar.forEach((a, index) => {
        const rowValues = [String(index + 1), ...displayedFieldKeys.map((k) =>
          k === 'status' ? labelStatus(a.status) : (a[k] ?? '—').toString()
        )];
        const wrapped = rowValues.map((v) => doc.splitTextToSize(v, colW - 2) as string[]);
        const maxLines = Math.max(1, ...wrapped.map((w) => w.length));
        const rowH = Math.max(6, maxLines * lineH + 2);
        ensureRowSpace(rowH);

        wrapped.forEach((lines, i) => {
          const x = margin + i * colW;
          doc.rect(x, y, colW, rowH);
          lines.forEach((line, idx) => {
            doc.text(line, x + 1, y + 4 + idx * lineH);
          });
        });
        y += rowH;
      });

      doc.save(`associados-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Não foi possível exportar o PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

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
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="mb-5 flex flex-col gap-2.5 xl:mb-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Lista de Associados</h1>
          <p className="mt-1 text-cdl-gray-text">Gestão de empresas associadas</p>
        </div>
        <div className="flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2 xl:w-auto xl:justify-end">
          {!quickEditMode ? (
            <button
              type="button"
              onClick={startQuickEditMode}
              className="btn-secondary shrink-0 !px-3 !py-2 text-xs sm:!px-4 sm:!py-2 sm:text-sm"
            >
              Modo de edição rápida
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void concluirQuickEdit()}
                disabled={savingQuickEdit}
                className="btn-primary shrink-0 !px-3 !py-2 text-xs disabled:opacity-50 sm:!px-4 sm:!py-2 sm:text-sm"
              >
                {savingQuickEdit ? 'Salvando...' : 'Concluir'}
              </button>
              <button
                type="button"
                onClick={cancelQuickEditMode}
                disabled={savingQuickEdit}
                className="btn-secondary shrink-0 !px-3 !py-2 text-xs disabled:opacity-50 sm:!px-4 sm:!py-2 sm:text-sm"
              >
                Cancelar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void exportarPdf()}
            disabled={exportingPdf || filteredAssociados.length === 0}
            className="btn-secondary shrink-0 !px-3 !py-2 text-xs disabled:opacity-50 sm:!px-4 sm:!py-2 sm:text-sm"
          >
            {exportingPdf ? 'Exportando PDF...' : 'Exportar PDF'}
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            disabled={exportingCsv || filteredAssociados.length === 0}
            className="btn-secondary shrink-0 !px-3 !py-2 text-xs disabled:opacity-50 sm:!px-4 sm:!py-2 sm:text-sm"
          >
            {exportingCsv ? 'Exportando CSV...' : 'Exportar CSV'}
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={deletingBulk}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              {deletingBulk ? 'Excluindo...' : 'Excluir'}
            </button>
          )}
          <Link href="/admin/associados/adicionar" className="btn-primary shrink-0 !px-3 !py-2 text-center text-xs sm:!px-4 sm:!py-2 sm:text-sm">
            Adicionar Associado
          </Link>
        </div>
      </div>

      <div className="mb-5 space-y-3 sm:mb-6 sm:space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-xs text-cdl-gray-text uppercase tracking-wide">Total cadastrados</p>
                <p className="text-lg font-semibold text-gray-900 sm:text-xl">{statusResumo.total}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-xs text-green-700 uppercase tracking-wide">Ativo</p>
                <p className="text-lg font-semibold text-green-900 sm:text-xl">{statusResumo.ativo}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-xs text-amber-700 uppercase tracking-wide">Em negociação</p>
                <p className="text-lg font-semibold text-amber-900 sm:text-xl">{statusResumo.emNegociacao}</p>
              </div>
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-xs text-gray-700 uppercase tracking-wide">Desativado</p>
                <p className="text-lg font-semibold text-gray-900 sm:text-xl">{statusResumo.desativado}</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome, empresa, razão social, CNPJ ou email..."
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
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 lg:gap-3">
              <select
                value={selectedPlano}
                onChange={(e) => setSelectedPlano(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue lg:h-10 lg:px-3 lg:py-2"
              >
                <option value="todos">Todos os planos</option>
                {planos.map((plano) => (
                  <option key={plano} value={plano}>{plano}</option>
                ))}
              </select>
              <select
                value={selectedCidade}
                onChange={(e) => setSelectedCidade(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue lg:h-10 lg:px-3 lg:py-2"
              >
                <option value="todas">Todas as cidades</option>
                {cidades.map((cidade) => (
                  <option key={cidade} value={cidade}>{cidade}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(
                    e.target.value as 'todos' | 'ativo' | 'desativado' | 'em_negociacao'
                  )
                }
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue lg:h-10 lg:px-3 lg:py-2"
              >
                <option value="todos">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="desativado">Desativado</option>
                <option value="em_negociacao">Em negociação</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'nome' | 'empresa' | 'plano' | 'cidade')}
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue lg:h-10 lg:px-3 lg:py-2"
              >
                <option value="nome">Ordenar por Nome</option>
                <option value="empresa">Ordenar por Empresa</option>
                <option value="plano">Ordenar por Plano</option>
                <option value="cidade">Ordenar por Cidade</option>
              </select>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue lg:h-10 lg:px-3 lg:py-2"
              >
                <option value="asc">Ordem: A-Z</option>
                <option value="desc">Ordem: Z-A</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPlano('todos');
                  setSelectedCidade('todas');
                  setSelectedStatus('todos');
                  setSortBy('empresa');
                  setSortDirection('asc');
                  setOnlyPendingRequired(false);
                }}
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 lg:h-10 lg:px-3 lg:py-2"
              >
                Limpar filtros
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700 sm:text-sm">
              <input
                type="checkbox"
                checked={onlyPendingRequired}
                onChange={(e) => setOnlyPendingRequired(e.target.checked)}
              />
              Auditoria: exibir apenas cadastros com campos obrigatórios pendentes
            </label>
            {associadosEmNegociacaoCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedStatus('em_negociacao')}
                className="flex w-full text-left rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 hover:bg-amber-100 sm:w-fit sm:px-3 sm:text-sm"
              >
                Existem associados em negociação ({associadosEmNegociacaoCount}). Clique para visualizar.
              </button>
            )}
            <div className="rounded-lg border border-gray-200 bg-white p-2.5 sm:p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">Campos visíveis na tabela</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleFieldKeys([...allFieldKeys])}
                    className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 sm:px-2.5 sm:py-1.5 sm:text-xs"
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleFieldKeys([])}
                    className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 sm:px-2.5 sm:py-1.5 sm:text-xs"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2">
                {allFieldKeys.map((k) => (
                  <label key={k} className="inline-flex items-center gap-1.5 text-xs text-gray-700 sm:gap-2 sm:text-sm">
                    <input
                      type="checkbox"
                      checked={visibleFieldKeys.includes(k)}
                      onChange={(e) =>
                        setVisibleFieldKeys((prev) =>
                          e.target.checked
                            ? [...prev, k]
                            : prev.filter((x) => x !== k)
                        )
                      }
                    />
                    {fieldLabel[k]}
                  </label>
                ))}
              </div>
            </div>
          </div>

      <div className="w-full max-w-full overflow-hidden rounded-lg bg-white shadow-lg">
            <div className="space-y-2 p-2.5 lg:hidden">
              {filteredAssociados.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-cdl-gray-text">
                  {searchTerm ? 'Nenhum associado encontrado para esta busca.' : 'Nenhum associado cadastrado.'}
                </div>
              ) : (
                filteredAssociados.map((associado) => (
                  <article
                    key={associado.id}
                    className={`rounded-lg border p-2.5 ${
                      (associado.status ?? 'ativo') === 'em_negociacao'
                        ? 'border-amber-200 bg-amber-50/70'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(associado.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, associado.id] : prev.filter((id) => id !== associado.id)
                            );
                          }}
                        />
                        Selecionar
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleView(associado.id)}
                          aria-label="Ver associado"
                          title="Ver"
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-700 hover:bg-gray-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <Link
                          href={`/admin/associados/editar?id=${encodeURIComponent(associado.id)}`}
                          aria-label="Editar associado"
                          title="Editar"
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-cdl-blue hover:bg-cdl-blue/10"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(associado.id)}
                          disabled={deletingId === associado.id}
                          aria-label="Excluir associado"
                          title="Excluir"
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {displayedFieldKeys.map((k) => {
                        if (quickEditMode && k !== 'cnpj' && k !== 'status') {
                          return (
                            <div key={k} className="rounded-md bg-gray-50 p-1.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{fieldLabel[k]}</p>
                              <input
                                type={k === 'email' ? 'email' : 'text'}
                                value={getQuickFieldValue(associado, k)}
                                onChange={(e) => updateQuickField(associado.id, k, e.target.value)}
                                className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                              />
                            </div>
                          );
                        }
                        if (k === 'status') {
                          const statusValue = ((associado.status as AssociadoStatus | undefined) ?? 'ativo');
                          return (
                            <div key={k} className="rounded-md bg-gray-50 p-1.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{fieldLabel[k]}</p>
                              {quickEditMode ? (
                                <select
                                  value={getQuickFieldValue(associado, k) || 'ativo'}
                                  onChange={(e) => updateQuickField(associado.id, k, e.target.value)}
                                  className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                                >
                                  <option value="ativo">Ativo</option>
                                  <option value="desativado">Desativado</option>
                                  <option value="em_negociacao">Em negociação</option>
                                </select>
                              ) : (
                                <select
                                  value={statusValue}
                                  disabled={updatingStatusId === associado.id}
                                  onChange={(e) => solicitarAlteracaoStatus(associado, e.target.value as AssociadoStatus)}
                                  className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-60"
                                >
                                  <option value="ativo">Ativo</option>
                                  <option value="desativado">Desativado</option>
                                  <option value="em_negociacao">Em negociação</option>
                                </select>
                              )}
                            </div>
                          );
                        }
                        const rawValue = (associado[k] ?? '').toString().trim();
                        const value = k === 'email' ? rawValue.toLowerCase() : rawValue;
                        return (
                          <div key={k} className="rounded-md bg-gray-50 p-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{fieldLabel[k]}</p>
                            <p className="mt-0.5 break-words text-xs text-gray-800">{value || '—'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="hidden w-full max-w-full overflow-hidden lg:block">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-cdl-gray">
                  <tr>
                    <th className="w-10 px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const ids = filteredAssociados.map((a) => a.id);
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
                          } else {
                            const idsSet = new Set(filteredAssociados.map((a) => a.id));
                            setSelectedIds((prev) => prev.filter((id) => !idsSet.has(id)));
                          }
                        }}
                      />
                    </th>
                    {displayedFieldKeys.map((k) => (
                      <th key={k} className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <span className="block break-words">{fieldLabel[k]}</span>
                      </th>
                    ))}
                    <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAssociados.length === 0 ? (
                    <tr>
                      <td colSpan={displayedFieldKeys.length + 2} className="px-2 py-8 text-center text-cdl-gray-text">
                        {searchTerm ? 'Nenhum associado encontrado para esta busca.' : 'Nenhum associado cadastrado.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAssociados.map((associado) => (
                      <tr
                        key={associado.id}
                        className={`hover:bg-gray-50 ${
                          (associado.status ?? 'ativo') === 'em_negociacao'
                            ? 'bg-amber-50/70'
                            : ''
                        }`}
                      >
                        <td className="px-2 py-3 text-sm text-gray-900 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(associado.id)}
                            onChange={(e) => {
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, associado.id]
                                  : prev.filter((id) => id !== associado.id)
                              );
                            }}
                          />
                        </td>
                        {displayedFieldKeys.map((k) => {
                          if (quickEditMode) {
                            const value = getQuickFieldValue(associado, k);
                            if (k === 'cnpj') {
                              return (
                                <td key={k} className="px-2 py-3 text-sm text-gray-900 align-top">
                                  <span title="CNPJ não pode ser alterado na edição rápida">
                                    {(associado.cnpj ?? '').toString().trim() || '—'}
                                  </span>
                                </td>
                              );
                            }
                            if (k === 'status') {
                              return (
                                <td key={k} className="px-2 py-3 text-sm text-gray-900 align-top">
                                  <select
                                    value={value || 'ativo'}
                                    onChange={(e) => updateQuickField(associado.id, k, e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-1 py-1 text-xs leading-tight bg-white"
                                  >
                                    <option value="ativo">Ativo</option>
                                    <option value="desativado">Desativado</option>
                                    <option value="em_negociacao">Em negociação</option>
                                  </select>
                                </td>
                              );
                            }
                            return (
                              <td key={k} className="px-2 py-3 text-sm text-gray-900 align-top">
                                <input
                                  type={k === 'email' ? 'email' : 'text'}
                                  value={value}
                                  onChange={(e) => updateQuickField(associado.id, k, e.target.value)}
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                                />
                              </td>
                            );
                          }
                          if (k === 'status') {
                            const statusValue = ((associado.status as AssociadoStatus | undefined) ?? 'ativo');
                            const disabled = updatingStatusId === associado.id;
                            return (
                              <td key={k} className="px-2 py-3 text-sm text-gray-900 align-top">
                                <select
                                  value={statusValue}
                                  disabled={disabled}
                                  onChange={(e) =>
                                    solicitarAlteracaoStatus(
                                      associado,
                                      e.target.value as AssociadoStatus
                                    )
                                  }
                                  className="w-full rounded-md border border-gray-300 px-1 py-1 text-xs leading-tight bg-white disabled:opacity-60"
                                  title="Alterar status do associado"
                                >
                                  <option value="ativo">Ativo</option>
                                  <option value="desativado">Desativado</option>
                                  <option value="em_negociacao">Em negociação</option>
                                </select>
                              </td>
                            );
                          }
                          const rawValue = (associado[k] ?? '').toString().trim();
                          const value = k === 'email' ? rawValue.toLowerCase() : rawValue;
                          return (
                            <td key={k} className="px-2 py-3 text-sm text-gray-900 align-top">
                              <span className="block break-words">{value || '—'}</span>
                            </td>
                          );
                        })}
                        <td className="px-2 py-3 text-sm text-right align-top">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleView(associado.id)}
                              aria-label="Ver associado"
                              title="Ver"
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-700 hover:bg-gray-100"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <Link
                              href={`/admin/associados/editar?id=${encodeURIComponent(associado.id)}`}
                              aria-label="Editar associado"
                              title="Editar"
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-cdl-blue hover:bg-cdl-blue/10"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleDelete(associado.id)}
                              disabled={deletingId === associado.id}
                              aria-label="Excluir associado"
                              title="Excluir"
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === associado.id ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
                                  <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-75" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
                                </svg>
                              )}
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
            {searchTerm || selectedPlano !== 'todos' || selectedCidade !== 'todas' || selectedStatus !== 'todos'
              ? 'Nenhum associado encontrado'
              : 'Nenhum associado cadastrado'}
          </h3>
          <p className="text-cdl-gray-text mb-6">
            {searchTerm || selectedPlano !== 'todos' || selectedCidade !== 'todas' || selectedStatus !== 'todos'
              ? 'Ajuste os filtros ou tente outra busca.'
              : 'Comece adicionando seu primeiro associado.'}
          </p>
          <Link href="/admin/associados/adicionar" className="btn-primary">
            Adicionar Primeiro Associado
          </Link>
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
                Tem certeza que deseja excluir o associado <strong>{excluirPendente.nome}</strong> da empresa <strong>{excluirPendente.empresa}</strong>? Esta ação não pode ser desfeita.
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

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 max-w-lg mx-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">DANGER · área sensível</p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir vários associados?</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir <strong>{selectedCount}</strong> associado(s) selecionado(s)? Esta ação não pode ser desfeita.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={deletingBulk}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarExcluirSelecionados()}
                  disabled={deletingBulk}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingBulk ? 'Excluindo...' : 'Sim, excluir selecionados'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && visualizacaoPendente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Dados do Associado</h3>
                <p className="text-sm text-cdl-gray-text mt-1">
                  {visualizacaoPendente.nome || '—'} · {visualizacaoPendente.empresa || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setVisualizacaoPendente(null);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                ['Nome', visualizacaoPendente.nome],
                ['Empresa', visualizacaoPendente.empresa],
                ['Razão social', visualizacaoPendente.razao_social || '—'],
                ['CNPJ', visualizacaoPendente.cnpj],
                ['Telefone Empresa', visualizacaoPendente.telefone],
                ['Telefone do responsável', visualizacaoPendente.telefone_responsavel || '—'],
                ['Email', visualizacaoPendente.email],
                ['Plano', visualizacaoPendente.plano || '—'],
                ['Código SPC', visualizacaoPendente.codigo_spc || '—'],
                ['Qtd. funcionários', visualizacaoPendente.quantidade_funcionarios || '—'],
                ['CEP', visualizacaoPendente.cep || '—'],
                ['Endereço', visualizacaoPendente.endereco || '—'],
                ['Cidade', visualizacaoPendente.cidade || '—'],
                ['Estado', visualizacaoPendente.estado || '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-gray-900 break-words">{value as string}</p>
                </div>
              ))}

              <div className="md:col-span-2 rounded-lg border border-gray-200 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Observações</p>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap break-words">
                  {visualizacaoPendente.observacoes || '—'}
                </p>
              </div>

              <div className="md:col-span-2 rounded-lg border border-gray-200 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Aniversariantes</p>
                {visualizacaoPendente.aniversariantes?.length ? (
                  <ul className="space-y-1 text-gray-900">
                    {visualizacaoPendente.aniversariantes.map((a, idx) => (
                      <li key={`${a.nome}-${idx}`}>
                        {a.nome || '—'} — {a.data || '—'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-900">—</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {statusChangeTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmar alteração de status</h3>
              <p className="text-sm text-gray-600">
                Deseja alterar o status de <strong>{statusChangeTarget.nome}</strong> ({statusChangeTarget.empresa}) de{' '}
                <strong>{labelStatus(statusChangeTarget.current)}</strong> para{' '}
                <strong>{labelStatus(statusChangeTarget.next)}</strong>?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusChangeTarget(null)}
                  disabled={Boolean(updatingStatusId)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarAlteracaoStatus()}
                  disabled={Boolean(updatingStatusId)}
                  className="rounded-lg bg-cdl-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {updatingStatusId ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
