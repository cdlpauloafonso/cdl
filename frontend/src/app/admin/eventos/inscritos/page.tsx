'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteEventInscription,
  getCampaign,
  listEventInscriptions,
  updateEventInscriptionFields,
  updateEventInscriptionPaymentStatus,
  type Campaign,
  type EventInscriptionRecord,
  type EventInscriptionPaymentStatus,
} from '@/lib/firestore';
import {
  getEffectiveRegistration,
  labelForInscriptionField,
  sortInscriptionFieldKeys,
} from '@/lib/event-registration-fields';
import { getEffectivePayment } from '@/lib/event-payment-fields';

function collectColumnKeys(
  reg: ReturnType<typeof getEffectiveRegistration>,
  rows: (EventInscriptionRecord & { id: string })[]
): string[] {
  if (reg.kind !== 'form') return [];
  const base = sortInscriptionFieldKeys(reg.keys);
  const seen = new Set(base);
  const extra: string[] = [];
  for (const row of rows) {
    for (const k of Object.keys(row.fields || {})) {
      if (!seen.has(k)) {
        seen.add(k);
        extra.push(k);
      }
    }
  }
  extra.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...base, ...extra];
}

function formatDateBr(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function paymentStatusOf(row: EventInscriptionRecord): EventInscriptionPaymentStatus {
  return row.paymentStatus === 'paid' ? 'paid' : 'pending';
}

export default function AdminEventoInscritosPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';

  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<(EventInscriptionRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterCidade, setFilterCidade] = useState('todas');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterPayment, setFilterPayment] = useState<'all' | EventInscriptionPaymentStatus>('all');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([]);
  const [showPaymentColumn, setShowPaymentColumn] = useState(true);
  const [showDateColumn, setShowDateColumn] = useState(true);
  const [showSignatureColumn, setShowSignatureColumn] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharingPublicLink, setSharingPublicLink] = useState(false);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [quickEditDrafts, setQuickEditDrafts] = useState<Record<string, Record<string, string>>>({});
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [paymentConfirmTarget, setPaymentConfirmTarget] = useState<{
    inscriptionId: string;
    nextStatus: EventInscriptionPaymentStatus;
  } | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      setError('Nenhum evento selecionado.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const c = await getCampaign(eventId);
      setCampanha(c);
      if (!c) {
        setError('Evento não encontrado.');
        setRows([]);
        return;
      }
      const reg = getEffectiveRegistration(c, { ignoreRegistrationClosed: true });
      if (reg.kind !== 'form') {
        setError('Este evento não utiliza inscrição pelo formulário do site.');
        setRows([]);
        return;
      }
      const list = await listEventInscriptions(eventId);
      setRows(list);
    } catch {
      setError('Erro ao carregar inscrições.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const reg = campanha
    ? getEffectiveRegistration(campanha, { ignoreRegistrationClosed: true })
    : { kind: 'none' as const };
  const eventHasConfiguredPayment = useMemo(
    () => (campanha ? getEffectivePayment(campanha).kind !== 'none' : false),
    [campanha]
  );
  const displayPaymentColumn = eventHasConfiguredPayment && showPaymentColumn;
  const publicListUrl = useMemo(() => {
    if (!eventId || typeof window === 'undefined') return '';
    return `${window.location.origin}/institucional/eventos/inscritos?eventId=${encodeURIComponent(eventId)}`;
  }, [eventId]);

  useEffect(() => {
    if (!eventHasConfiguredPayment && sortBy === 'paymentStatus') {
      setSortBy('createdAt');
    }
  }, [eventHasConfiguredPayment, sortBy]);

  useEffect(() => {
    if (!eventHasConfiguredPayment) {
      setShowPaymentColumn(false);
      setFilterPayment('all');
    }
  }, [eventHasConfiguredPayment]);

  const columnKeys = useMemo(() => {
    if (!campanha) return [];
    const r = getEffectiveRegistration(campanha, { ignoreRegistrationClosed: true });
    if (r.kind !== 'form') return [];
    return collectColumnKeys(r, rows).filter((k) => k !== 'observacoes');
  }, [campanha, rows]);

  useEffect(() => {
    setVisibleColumnKeys((prev) => {
      if (columnKeys.length === 0) return [];
      if (prev.length === 0) return [...columnKeys];
      const prevSet = new Set(prev);
      const kept = columnKeys.filter((k) => prevSet.has(k));
      return kept.length > 0 ? kept : [...columnKeys];
    });
  }, [columnKeys]);

  const displayedColumnKeys = useMemo(
    () => columnKeys.filter((k) => visibleColumnKeys.includes(k)),
    [columnKeys, visibleColumnKeys]
  );

  useEffect(() => {
    if (sortBy === 'createdAt' || sortBy === 'paymentStatus') return;
    if (!displayedColumnKeys.includes(sortBy)) {
      setSortBy('createdAt');
    }
  }, [sortBy, displayedColumnKeys]);

  const hasCidade = columnKeys.includes('cidade');
  const hasEstado = columnKeys.includes('estado');

  const cidadesUnicas = useMemo(() => {
    if (!hasCidade) return [];
    const s = new Set<string>();
    for (const r of rows) {
      const v = (r.fields?.cidade || '').trim();
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows, hasCidade]);

  const estadosUnicos = useMemo(() => {
    if (!hasEstado) return [];
    const s = new Set<string>();
    for (const r of rows) {
      const v = (r.fields?.estado || '').trim();
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows, hasEstado]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let list = rows.filter((r) => {
      if (hasCidade && filterCidade !== 'todas') {
        const v = (r.fields?.cidade || '').trim();
        if (v !== filterCidade) return false;
      }
      if (hasEstado && filterEstado !== 'todos') {
        const v = (r.fields?.estado || '').trim();
        if (v !== filterEstado) return false;
      }
      if (filterPayment !== 'all' && paymentStatusOf(r) !== filterPayment) {
        return false;
      }
      if (!term) return true;
      const blob = [
        r.createdAt,
        paymentStatusOf(r) === 'paid' ? 'pago' : 'pendente',
        ...Object.values(r.fields || {}).map((x) => String(x)),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(term);
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'createdAt') {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return sortDirection === 'desc' ? tb - ta : ta - tb;
      }
      if (sortBy === 'paymentStatus') {
        const va = paymentStatusOf(a) === 'paid' ? 'pago' : 'pendente';
        const vb = paymentStatusOf(b) === 'paid' ? 'pago' : 'pendente';
        const cmp = va.localeCompare(vb, 'pt-BR');
        return sortDirection === 'desc' ? -cmp : cmp;
      }
      const va = (a.fields?.[sortBy] || '').toString().toLowerCase();
      const vb = (b.fields?.[sortBy] || '').toString().toLowerCase();
      const cmp = va.localeCompare(vb, 'pt-BR');
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [rows, searchTerm, sortBy, sortDirection, filterCidade, filterEstado, filterPayment, hasCidade, hasEstado]);

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.includes(r.id));
  const selectedCount = selectedIds.length;

  function askChangePaymentStatus(
    row: EventInscriptionRecord & { id: string },
    nextStatus: EventInscriptionPaymentStatus
  ) {
    const current = paymentStatusOf(row);
    if (current === nextStatus) return;
    setPaymentConfirmTarget({ inscriptionId: row.id, nextStatus });
  }

  async function handleChangePaymentStatus(
    inscriptionId: string,
    nextStatus: EventInscriptionPaymentStatus
  ) {
    if (!eventId) return;
    setUpdatingPaymentId(inscriptionId);
    setError('');
    try {
      await updateEventInscriptionPaymentStatus(eventId, inscriptionId, nextStatus);
      setRows((prev) =>
        prev.map((x) => (x.id === inscriptionId ? { ...x, paymentStatus: nextStatus } : x))
      );
      setPaymentConfirmTarget(null);
    } catch {
      setError('Não foi possível atualizar o status de pagamento.');
    } finally {
      setUpdatingPaymentId(null);
    }
  }

  async function handleDeleteSelected() {
    if (!eventId || selectedIds.length === 0) return;
    setDeletingSelected(true);
    setError('');
    try {
      await Promise.all(selectedIds.map((id) => deleteEventInscription(eventId, id)));
      setRows((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      setShowDeleteSelectedModal(false);
    } catch {
      setError('Não foi possível excluir as inscrições selecionadas.');
    } finally {
      setDeletingSelected(false);
    }
  }

  function startQuickEditMode() {
    setQuickEditDrafts({});
    setQuickEditMode(true);
  }

  function cancelQuickEditMode() {
    setQuickEditDrafts({});
    setQuickEditMode(false);
  }

  function getQuickFieldValue(row: EventInscriptionRecord & { id: string }, key: string): string {
    return quickEditDrafts[row.id]?.[key] ?? (row.fields?.[key] ?? '').toString();
  }

  function updateQuickField(inscriptionId: string, key: string, value: string) {
    setQuickEditDrafts((prev) => ({
      ...prev,
      [inscriptionId]: {
        ...(prev[inscriptionId] ?? {}),
        [key]: value,
      },
    }));
  }

  async function concludeQuickEditMode() {
    if (!eventId) return;
    setSavingQuickEdit(true);
    setError('');
    try {
      const updates: Array<{ id: string; fields: Record<string, string> }> = [];
      Object.entries(quickEditDrafts).forEach(([id, draft]) => {
        const current = rows.find((r) => r.id === id);
        if (!current) return;
        const nextFields: Record<string, string> = { ...(current.fields ?? {}) };
        let changed = false;
        Object.entries(draft).forEach(([k, v]) => {
          const normalized = v ?? '';
          if ((nextFields[k] ?? '') !== normalized) {
            nextFields[k] = normalized;
            changed = true;
          }
        });
        if (changed) updates.push({ id, fields: nextFields });
      });

      for (const item of updates) {
        await updateEventInscriptionFields(eventId, item.id, item.fields);
      }

      if (updates.length > 0) {
        setRows((prev) =>
          prev.map((row) => {
            const changed = updates.find((u) => u.id === row.id);
            return changed ? { ...row, fields: changed.fields } : row;
          })
        );
      }

      setQuickEditDrafts({});
      setQuickEditMode(false);
    } catch {
      setError('Não foi possível salvar a edição rápida.');
    } finally {
      setSavingQuickEdit(false);
    }
  }

  async function exportarPdf() {
    if (!campanha || filteredRows.length === 0) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const lineH = 3.6;
      let y = margin;
      const headers = [
        ...displayedColumnKeys.map((k) => labelForInscriptionField(k)),
        ...(showDateColumn ? ['Data'] : []),
        ...(displayPaymentColumn ? ['Pagamento'] : []),
        ...(showSignatureColumn ? ['Assinatura'] : []),
      ];
      const colCount = Math.max(headers.length, 1);
      const tableW = pageW - margin * 2;
      const colW = tableW / colCount;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Inscrições — ${campanha.title}`, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR')} · ${filteredRows.length} registro(s)`,
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

      filteredRows.forEach((row) => {
        const rowValues = [
          ...displayedColumnKeys.map((k) => (row.fields?.[k] ?? '').toString().trim() || '—'),
          ...(showDateColumn ? [formatDateBr(row.createdAt)] : []),
          ...(displayPaymentColumn ? [paymentStatusOf(row) === 'paid' ? 'Pago' : 'Pendente'] : []),
          ...(showSignatureColumn ? [''] : []),
        ];
        const wrapped = rowValues.map((v) => doc.splitTextToSize(v, colW - 2) as string[]);
        const maxLines = Math.max(1, ...wrapped.map((lines) => lines.length));
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

      const safeTitle = campanha.title.replace(/[^\w\d\-]+/g, '_').slice(0, 40);
      doc.save(`inscritos-${safeTitle}-${eventId.slice(0, 8)}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Não foi possível gerar o PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function sharePublicListLink() {
    if (!publicListUrl) return;
    setSharingPublicLink(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: campanha?.title ? `Inscritos - ${campanha.title}` : 'Inscritos no evento',
          text: 'Confira a lista pública de inscritos no evento.',
          url: publicListUrl,
        });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicListUrl);
        alert('Link público copiado para a área de transferência.');
        return;
      }
      window.prompt('Copie o link público:', publicListUrl);
    } catch {
      alert('Não foi possível compartilhar o link público agora.');
    } finally {
      setSharingPublicLink(false);
    }
  }

  if (!eventId) {
    return (
      <div>
        <Link href="/admin/eventos" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">
          ← Eventos
        </Link>
        <p className="text-cdl-gray-text">Informe um evento na URL (?eventId=).</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cdl-blue mx-auto" />
          <p className="mt-4 text-cdl-gray-text">Carregando inscrições...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href="/admin/eventos" className="text-sm text-cdl-blue hover:underline mb-2 inline-block">
            ← Eventos
          </Link>
          <h1 className="break-words text-2xl font-bold text-gray-900">Inscritos no evento</h1>
          <p className="mt-1 break-words text-gray-600">
            {campanha ? (
              <span className="font-medium text-gray-800">{campanha.title}</span>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:shrink-0">
          {!quickEditMode ? (
            <button
              type="button"
              onClick={startQuickEditMode}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Modo de edição rápida
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void concludeQuickEditMode()}
                disabled={savingQuickEdit}
                className="w-full rounded-lg bg-cdl-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:w-auto"
              >
                {savingQuickEdit ? 'Salvando...' : 'Concluir'}
              </button>
              <button
                type="button"
                onClick={cancelQuickEditMode}
                disabled={savingQuickEdit}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
              >
                Cancelar
              </button>
            </>
          )}
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteSelectedModal(true)}
              className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 sm:w-auto"
            >
              Excluir selecionados ({selectedCount})
            </button>
          )}
          <button
            type="button"
            disabled={!publicListUrl || sharingPublicLink}
            onClick={() => void sharePublicListLink()}
            className="w-full rounded-lg border border-cdl-blue bg-white px-3 py-2 text-sm font-medium text-cdl-blue hover:bg-blue-50 disabled:opacity-50 sm:w-auto"
          >
            {sharingPublicLink ? 'Compartilhando...' : 'Link público'}
          </button>
          <button
            type="button"
            disabled={exportingPdf || filteredRows.length === 0 || !campanha}
            onClick={() => void exportarPdf()}
            className="btn-primary w-full disabled:opacity-50 sm:w-auto"
          >
            {exportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
          {error}
        </div>
      )}

      {!error && campanha && reg.kind === 'form' && (
        <>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar em qualquer campo ou data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {hasCidade && (
                <select
                  value={filterCidade}
                  onChange={(e) => setFilterCidade(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cdl-blue"
                >
                  <option value="todas">Todas as cidades</option>
                  {cidadesUnicas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              {hasEstado && (
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cdl-blue"
                >
                  <option value="todos">Todos os estados (UF)</option>
                  {estadosUnicos.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              {eventHasConfiguredPayment && (
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value as 'all' | EventInscriptionPaymentStatus)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cdl-blue"
                >
                  <option value="all">Todos os pagamentos</option>
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cdl-blue"
              >
                <option value="createdAt">Ordenar por data da inscrição</option>
                {eventHasConfiguredPayment && <option value="paymentStatus">Ordenar por pagamento</option>}
                {displayedColumnKeys.map((k) => (
                  <option key={k} value={k}>
                    Ordenar por {labelForInscriptionField(k)}
                  </option>
                ))}
              </select>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cdl-blue"
              >
                <option value="desc">{sortBy === 'createdAt' ? 'Mais recentes primeiro' : 'Z → A'}</option>
                <option value="asc">{sortBy === 'createdAt' ? 'Mais antigas primeiro' : 'A → Z'}</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCidade('todas');
                  setFilterEstado('todos');
                  setFilterPayment('all');
                  setSortBy('createdAt');
                  setSortDirection('desc');
                }}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Limpar filtros
              </button>
            </div>
            <p className="text-sm text-cdl-gray-text">
              Exibindo <strong className="text-gray-800">{filteredRows.length}</strong> de{' '}
              <strong className="text-gray-800">{rows.length}</strong> inscrição(ões).
            </p>
            <div className="w-full max-w-full rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-gray-900">
                  Campos visíveis na tabela{' '}
                  <span className="font-normal text-cdl-gray-text">
                    (a exportação PDF apenas vai exibir os campos selecionados)
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleColumnKeys([...columnKeys]);
                      setShowDateColumn(true);
                      setShowPaymentColumn(eventHasConfiguredPayment);
                      setShowSignatureColumn(false);
                    }}
                    className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleColumnKeys([]);
                      setShowDateColumn(false);
                      setShowPaymentColumn(false);
                      setShowSignatureColumn(false);
                    }}
                    className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              {columnKeys.length === 0 ? (
                <p className="text-xs text-cdl-gray-text">Nenhum campo disponível.</p>
              ) : (
                <div className="flex max-w-full flex-wrap gap-x-4 gap-y-2">
                  {columnKeys.map((k) => (
                    <label key={k} className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={visibleColumnKeys.includes(k)}
                        onChange={(e) =>
                          setVisibleColumnKeys((prev) =>
                            e.target.checked ? [...prev, k] : prev.filter((x) => x !== k)
                          )
                        }
                      />
                      {labelForInscriptionField(k)}
                    </label>
                  ))}
                  {eventHasConfiguredPayment && (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={showPaymentColumn}
                        onChange={(e) => setShowPaymentColumn(e.target.checked)}
                      />
                      Pagamento
                    </label>
                  )}
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showDateColumn}
                      onChange={(e) => setShowDateColumn(e.target.checked)}
                    />
                    Data
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showSignatureColumn}
                      onChange={(e) => setShowSignatureColumn(e.target.checked)}
                    />
                    Assinatura
                  </label>
                </div>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-cdl-gray-text">
              Nenhuma inscrição registrada para este evento.
            </div>
          ) : (
            <div className="w-full max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="space-y-3 p-3 lg:hidden">
                {filteredRows.map((row) => (
                  <article key={row.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                            );
                          }}
                        />
                        Selecionar
                      </label>
                      {showDateColumn ? (
                        <span className="text-xs text-gray-500">{formatDateBr(row.createdAt)}</span>
                      ) : (
                        <span />
                      )}
                    </div>

                    <div className="space-y-2">
                      {displayedColumnKeys.map((k) => (
                        <div key={k} className="rounded-md bg-gray-50 p-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            {labelForInscriptionField(k)}
                          </p>
                          {quickEditMode ? (
                            <input
                              type="text"
                              value={getQuickFieldValue(row, k)}
                              onChange={(e) => updateQuickField(row.id, k, e.target.value)}
                              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            />
                          ) : (
                            <p className="mt-1 break-words text-sm text-gray-800">
                              {(row.fields?.[k] ?? '').toString().trim() || '—'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {displayPaymentColumn && (
                      <div className="mt-3">
                        {paymentStatusOf(row) === 'paid' ? (
                          <button
                            type="button"
                            disabled={updatingPaymentId === row.id}
                            onClick={() => askChangePaymentStatus(row, 'pending')}
                            className="inline-flex rounded-full border border-amber-300 bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 disabled:opacity-50"
                            title="Clique para marcar como pendente"
                          >
                            {updatingPaymentId === row.id ? 'Salvando...' : 'Pago'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingPaymentId === row.id}
                            onClick={() => askChangePaymentStatus(row, 'paid')}
                            className="inline-flex rounded-full border border-green-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                            title="Clique para marcar como pago"
                          >
                            {updatingPaymentId === row.id ? 'Salvando...' : 'Pendente'}
                          </button>
                        )}
                      </div>
                    )}
                    {showSignatureColumn && (
                      <div className="mt-3 rounded-md border border-dashed border-gray-300 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Assinatura
                        </p>
                        <div className="mt-2 h-8 w-full" />
                      </div>
                    )}
                  </article>
                ))}
              </div>

              <div className="hidden w-full max-w-full overflow-hidden lg:block">
                <table className="w-full table-fixed divide-y divide-gray-200 text-sm">
                  <thead className="bg-cdl-gray">
                    <tr>
                      <th className="w-12 px-2 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds((prev) => {
                                  const set = new Set(prev);
                                  filteredRows.forEach((r) => set.add(r.id));
                                  return Array.from(set);
                                });
                              } else {
                                const filteredSet = new Set(filteredRows.map((r) => r.id));
                                setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
                              }
                            }}
                          />
                        </label>
                      </th>
                      {displayedColumnKeys.map((k) => (
                        <th key={k} className="px-2 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                          <span className="block break-words">{labelForInscriptionField(k)}</span>
                        </th>
                      ))}
                      {showDateColumn && (
                        <th className="px-2 py-3 text-left text-xs font-semibold uppercase text-gray-700">Data</th>
                      )}
                      {displayPaymentColumn && (
                        <th className="w-28 px-2 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                          Pagamento
                        </th>
                      )}
                      {showSignatureColumn && (
                        <th className="w-40 px-2 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                          Assinatura
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/80">
                        <td className="px-2 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={(e) => {
                              setSelectedIds((prev) =>
                                e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                              );
                            }}
                          />
                        </td>
                        {displayedColumnKeys.map((k) => (
                          <td key={k} className="px-2 py-2 align-top text-gray-800">
                            {quickEditMode ? (
                              <input
                                type="text"
                                value={getQuickFieldValue(row, k)}
                                onChange={(e) => updateQuickField(row.id, k, e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                              />
                            ) : (
                              <div className="break-words">
                                {(row.fields?.[k] ?? '').toString().trim() || (
                                  <span className="text-cdl-gray-text">—</span>
                                )}
                              </div>
                            )}
                          </td>
                        ))}
                        {showDateColumn && (
                          <td className="px-2 py-2 align-top text-gray-700">
                            <span className="break-words">{formatDateBr(row.createdAt)}</span>
                          </td>
                        )}
                        {displayPaymentColumn && (
                          <td className="px-2 py-2 align-top">
                            {paymentStatusOf(row) === 'paid' ? (
                              <button
                                type="button"
                                disabled={updatingPaymentId === row.id}
                                onClick={() => askChangePaymentStatus(row, 'pending')}
                                className="inline-flex rounded-full border border-amber-300 bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 disabled:opacity-50"
                                title="Clique para marcar como pendente"
                              >
                                {updatingPaymentId === row.id ? 'Salvando...' : 'Pago'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={updatingPaymentId === row.id}
                                onClick={() => askChangePaymentStatus(row, 'paid')}
                                className="inline-flex rounded-full border border-green-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                                title="Clique para marcar como pago"
                              >
                                {updatingPaymentId === row.id ? 'Salvando...' : 'Pendente'}
                              </button>
                            )}
                          </td>
                        )}
                        {showSignatureColumn && <td className="px-2 py-2 align-top" />}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {paymentConfirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-payment-status-title"
          onClick={() => {
            if (!updatingPaymentId) setPaymentConfirmTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 id="confirm-payment-status-title" className="text-lg font-bold text-gray-900">
                Confirmar alteração de pagamento
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                Deseja marcar esta inscrição como{' '}
                <strong className="text-gray-900">
                  {paymentConfirmTarget.nextStatus === 'paid' ? 'PAGO' : 'PENDENTE'}
                </strong>
                ?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentConfirmTarget(null)}
                  disabled={Boolean(updatingPaymentId)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleChangePaymentStatus(
                      paymentConfirmTarget.inscriptionId,
                      paymentConfirmTarget.nextStatus
                    )
                  }
                  disabled={Boolean(updatingPaymentId)}
                  className="rounded-lg bg-cdl-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {updatingPaymentId ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteSelectedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-selected-title"
          onClick={() => {
            if (!deletingSelected) setShowDeleteSelectedModal(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
              <p className="text-sm font-semibold text-amber-900">DANGER · área sensível</p>
              <p className="mt-1 text-xs text-amber-800">
                Esta ação remove inscrições oficiais do evento e não pode ser desfeita.
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-7 w-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              <h3 id="confirm-delete-selected-title" className="text-center text-lg font-bold text-gray-900">
                Excluir inscrições selecionadas?
              </h3>
              <p className="mt-3 text-center text-sm text-gray-600">
                Você está prestes a excluir <strong className="text-gray-900">{selectedCount}</strong> inscrição(ões).
                <span className="font-medium text-gray-800"> Não é possível desfazer.</span>
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteSelectedModal(false)}
                  disabled={deletingSelected}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSelected()}
                  disabled={deletingSelected}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingSelected ? 'Excluindo...' : 'Sim, excluir selecionados'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
