'use client';

import Image from 'next/image';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCampaign, listEventInscriptions, type Campaign, type EventInscriptionRecord } from '@/lib/firestore';
import {
  getEffectiveRegistration,
  labelForInscriptionField,
  sortInscriptionFieldKeys,
} from '@/lib/event-registration-fields';

function collectColumnKeys(
  reg: ReturnType<typeof getEffectiveRegistration>,
  rows: (EventInscriptionRecord & { id: string })[]
): string[] {
  if (reg.kind !== 'form') return [];
  const base = sortInscriptionFieldKeys(reg.keys);
  const seen = new Set(base);
  const extra: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row.fields || {})) {
      if (!seen.has(key) && key !== 'observacoes') {
        seen.add(key);
        extra.push(key);
      }
    }
  }
  extra.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...base.filter((x) => x !== 'observacoes'), ...extra];
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

function normalizeText(v: unknown): string {
  return String(v ?? '').trim();
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function PublicEventInscriptionsContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';

  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<(EventInscriptionRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCidade, setFilterCidade] = useState('todas');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [sortBy, setSortBy] = useState<'createdAt' | string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([]);
  const [showDateColumn, setShowDateColumn] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);

  useEffect(() => {
    async function load() {
      if (!eventId) {
        setError('Nenhum evento informado.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const c = await getCampaign(eventId);
        setCampanha(c);
        if (!c) {
          setRows([]);
          setError('Evento não encontrado.');
          return;
        }
        const reg = getEffectiveRegistration(c, { ignoreRegistrationClosed: true });
        if (reg.kind !== 'form') {
          setRows([]);
          setError('Este evento não utiliza formulário de inscrição no site.');
          return;
        }
        const inscriptions = await listEventInscriptions(eventId);
        setRows(inscriptions);
      } catch {
        setRows([]);
        setError('Não foi possível carregar os inscritos.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [eventId]);

  const reg = campanha
    ? getEffectiveRegistration(campanha, { ignoreRegistrationClosed: true })
    : { kind: 'none' as const };

  const visibleColumns = useMemo(() => {
    if (!campanha) return [];
    const effectiveReg = getEffectiveRegistration(campanha, { ignoreRegistrationClosed: true });
    return collectColumnKeys(effectiveReg, rows);
  }, [campanha, rows]);

  useEffect(() => {
    setVisibleColumnKeys((prev) => {
      if (visibleColumns.length === 0) {
        return prev.length === 0 ? prev : [];
      }
      if (prev.length === 0) return [...visibleColumns];
      const prevSet = new Set(prev);
      const kept = visibleColumns.filter((k) => prevSet.has(k));
      const next = kept.length > 0 ? kept : [...visibleColumns];
      return sameStringArray(prev, next) ? prev : next;
    });
  }, [visibleColumns]);

  const displayedColumns = useMemo(() => {
    const available = new Set(visibleColumns);
    // Fonte de verdade: campos marcados em "Campos visíveis e lista",
    // mantendo apenas os que existem na estrutura atual.
    const selected = visibleColumnKeys.filter((k) => available.has(k));
    return selected;
  }, [visibleColumns, visibleColumnKeys]);

  const hasCidade = visibleColumns.includes('cidade');
  const hasEstado = visibleColumns.includes('estado');

  const cidadesUnicas = useMemo(() => {
    if (!hasCidade) return [];
    const set = new Set<string>();
    rows.forEach((row) => {
      const v = normalizeText(row.fields?.cidade);
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows, hasCidade]);

  const estadosUnicos = useMemo(() => {
    if (!hasEstado) return [];
    const set = new Set<string>();
    rows.forEach((row) => {
      const v = normalizeText(row.fields?.estado);
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows, hasEstado]);

  useEffect(() => {
    if (sortBy === 'createdAt') return;
    if (!displayedColumns.includes(sortBy)) {
      setSortBy('createdAt');
    }
  }, [sortBy, displayedColumns]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.toLocaleLowerCase('pt-BR').trim();

    const filtered = rows.filter((row) => {
      if (hasCidade && filterCidade !== 'todas') {
        if (normalizeText(row.fields?.cidade) !== filterCidade) return false;
      }
      if (hasEstado && filterEstado !== 'todos') {
        if (normalizeText(row.fields?.estado) !== filterEstado) return false;
      }
      if (!term) return true;
      const blob = [row.createdAt, ...Object.values(row.fields || {})]
        .map((v) => String(v))
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return blob.includes(term);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'createdAt') {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return sortDirection === 'desc' ? tb - ta : ta - tb;
      }
      const va = normalizeText(a.fields?.[sortBy]).toLocaleLowerCase('pt-BR');
      const vb = normalizeText(b.fields?.[sortBy]).toLocaleLowerCase('pt-BR');
      const cmp = va.localeCompare(vb, 'pt-BR');
      return sortDirection === 'desc' ? -cmp : cmp;
    });
  }, [
    rows,
    searchTerm,
    hasCidade,
    hasEstado,
    filterCidade,
    filterEstado,
    sortBy,
    sortDirection,
  ]);

  async function generatePdfDoc() {
    if (!campanha || filteredRows.length === 0) return null;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const lineH = 3.6;
      let y = margin;
      const headers = [
        ...displayedColumns.map((k) => labelForInscriptionField(k)),
        ...(showDateColumn ? ['Data'] : []),
      ];
      const colCount = Math.max(headers.length, 1);
      const tableW = pageW - margin * 2;
      const colW = tableW / colCount;

      try {
        const logoResponse = await fetch('/logo-site.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          if (logoDataUrl) {
            const logoW = 36;
            const logoH = 14;
            doc.addImage(logoDataUrl, 'PNG', margin, y, logoW, logoH);
            y += logoH + 2;
          }
        }
      } catch {
        // Se não conseguir carregar a logo, segue exportando o PDF normalmente.
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Inscritos no evento — ${campanha.title}`, margin, y);
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
          ...displayedColumns.map((k) => normalizeText(row.fields?.[k]) || '—'),
          ...(showDateColumn ? [formatDateBr(row.createdAt)] : []),
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

      return doc;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function exportarPdf() {
    if (!campanha || filteredRows.length === 0) return;
    setExportingPdf(true);
    try {
      const doc = await generatePdfDoc();
      if (!doc) {
        alert('Não foi possível gerar o PDF.');
        return;
      }
      const safeTitle = campanha.title.replace(/[^\w\d\-]+/g, '_').slice(0, 40);
      doc.save(`inscritos-${safeTitle}-${eventId.slice(0, 8)}.pdf`);
    } catch {
      alert('Não foi possível gerar o PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function imprimirPdf() {
    if (!campanha || filteredRows.length === 0) return;
    setPrintingPdf(true);
    try {
      const doc = await generatePdfDoc();
      if (!doc) {
        alert('Não foi possível gerar o documento para impressão.');
        return;
      }
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            URL.revokeObjectURL(url);
            iframe.remove();
          }, 1500);
        }
      };
    } catch {
      alert('Não foi possível imprimir agora.');
    } finally {
      setPrintingPdf(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="text-cdl-gray-text">Carregando inscritos...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <style jsx global>{`
        @media print {
          header,
          nav,
          footer,
          .site-footer,
          .footer,
          [data-footer],
          #public-inscriptions-header,
          #public-inscriptions-filters,
          #public-inscriptions-actions,
          .print-hide {
            display: none !important;
          }

          body * {
            visibility: hidden;
          }

          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div id="public-inscriptions-header" className="print-hide mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <Image
            src="/logo-site.png"
            alt="CDL Paulo Afonso"
            width={256}
            height={99}
            className="h-10 w-auto object-contain"
            priority
          />
          <div id="public-inscriptions-actions" className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2">
            <button
              type="button"
              disabled={exportingPdf || filteredRows.length === 0 || !campanha}
              onClick={() => void exportarPdf()}
              className="h-9 rounded-lg bg-cdl-blue px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cdl-blue-dark disabled:opacity-50 sm:h-10 sm:px-3 sm:py-2 sm:text-sm"
            >
              {exportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
            <button
              type="button"
              disabled={filteredRows.length === 0}
              onClick={() => void imprimirPdf()}
              className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:h-10 sm:px-3 sm:py-2 sm:text-sm"
            >
              {printingPdf ? 'Preparando...' : 'Imprimir'}
            </button>
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Inscritos no evento</h1>
        <p className="mt-1 text-sm text-gray-700 sm:text-base">{campanha?.title ?? '—'}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-cdl-gray-text">
          Nenhuma inscrição registrada até o momento.
        </div>
      ) : (
        <>
          <section id="public-inscriptions-filters" className="print-hide mb-4 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm sm:p-4">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-2">
              <input
                type="text"
                placeholder="Buscar em qualquer campo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-cdl-blue sm:h-10 sm:px-3 sm:py-2 sm:text-sm"
              />
              {hasCidade && (
                <select
                  value={filterCidade}
                  onChange={(e) => setFilterCidade(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-cdl-blue sm:h-10 sm:px-3 sm:py-2 sm:text-sm"
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
                  className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-cdl-blue sm:h-10 sm:px-3 sm:py-2 sm:text-sm"
                >
                  <option value="todos">Todos os estados</option>
                  {estadosUnicos.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-cdl-blue sm:h-10 sm:px-3 sm:py-2 sm:text-sm"
              >
                <option value="createdAt">Ordenar por data da inscrição</option>
                {displayedColumns.map((k) => (
                  <option key={k} value={k}>
                    Ordenar por {labelForInscriptionField(k)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:mt-2 sm:grid-cols-3 sm:gap-2">
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                className="h-9 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-cdl-blue sm:h-10 sm:px-3 sm:py-2 sm:text-sm"
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
                  setSortBy('createdAt');
                  setSortDirection('desc');
                }}
                className="h-9 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 sm:h-10 sm:px-3 sm:py-2 sm:text-sm"
              >
                Limpar filtros
              </button>
            </div>

            <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2.5 sm:mt-3 sm:p-3">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 sm:mb-2 sm:gap-2">
                <p className="text-xs font-medium text-gray-900 sm:text-sm">Campos visíveis e lista</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleColumnKeys([...visibleColumns]);
                      setShowDateColumn(true);
                    }}
                    className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 sm:px-2.5 sm:py-1.5 sm:text-xs"
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleColumnKeys([]);
                      setShowDateColumn(false);
                    }}
                    className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 sm:px-2.5 sm:py-1.5 sm:text-xs"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2">
                {visibleColumns.map((k) => (
                  <label key={k} className="inline-flex items-center gap-1.5 text-xs text-gray-700 sm:gap-2 sm:text-sm">
                    <input
                      type="checkbox"
                      checked={displayedColumns.includes(k)}
                      onChange={(e) => {
                        setVisibleColumnKeys((prev) => {
                          if (e.target.checked) {
                            // Evita duplicidade e preserva ordem de exibição da tabela.
                            const nextSet = new Set(prev);
                            nextSet.add(k);
                            return visibleColumns.filter((col) => nextSet.has(col));
                          }
                          return prev.filter((x) => x !== k);
                        });
                      }}
                    />
                    {labelForInscriptionField(k)}
                  </label>
                ))}
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 sm:gap-2 sm:text-sm">
                  <input
                    type="checkbox"
                    checked={showDateColumn}
                    onChange={(e) => setShowDateColumn(e.target.checked)}
                  />
                  Data
                </label>
              </div>
            </div>

            <p className="mt-3 text-sm text-cdl-gray-text">
              Exibindo <strong className="text-gray-800">{filteredRows.length}</strong> de{' '}
              <strong className="text-gray-800">{rows.length}</strong> inscrição(ões).
            </p>
          </section>

          <div id="print-area" className="w-full max-w-full overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-max table-auto divide-y divide-gray-200 text-xs sm:text-sm">
              <thead className="bg-cdl-gray">
                <tr>
                  {displayedColumns.map((key) => (
                    <th
                      key={key}
                      className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 sm:px-3"
                    >
                      {labelForInscriptionField(key)}
                    </th>
                  ))}
                  {showDateColumn && (
                    <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 sm:px-3">
                      Data
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    {displayedColumns.map((key) => (
                      <td key={key} className="max-w-[220px] break-words px-2 py-2 align-top text-gray-800 sm:px-3">
                        {normalizeText(row.fields?.[key]) || '—'}
                      </td>
                    ))}
                    {showDateColumn && (
                      <td className="whitespace-nowrap px-2 py-2 align-top text-gray-700 sm:px-3">
                        {formatDateBr(row.createdAt)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

export default function PublicEventInscriptionsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl px-4 py-10">
          <p className="text-cdl-gray-text">Carregando inscritos...</p>
        </main>
      }
    >
      <PublicEventInscriptionsContent />
    </Suspense>
  );
}
