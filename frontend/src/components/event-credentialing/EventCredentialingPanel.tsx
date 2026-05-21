'use client';

import Link from 'next/link';
import type { Campaign, EventInscriptionRecord } from '@/lib/firestore';
import {
  getEffectiveRegistration,
  inscriptionDisplayCpf,
  inscriptionDisplayLabel,
  inscriptionDisplaySubtitle,
  normalizeInscriptionCpfDigits,
  shouldShowInscriptionCpfBesideLabel,
} from '@/lib/event-registration-fields';
import { formatCpfDisplay } from '@/lib/input-masks-br';
import { EventInscriptionCheckInQr } from '@/components/event-credentialing/EventInscriptionCheckInQr';
import { getEffectivePayment } from '@/lib/event-payment-fields';
import {
  isInscriptionPaymentPending,
  normalizeInscriptionPaymentStatus,
  paymentStatusLabel,
} from '@/lib/inscription-payment-status';
import {
  formatCredentialedAt,
  isInscriptionCredentialed,
} from '@/lib/event-credentialing';
import { parseCredentialingQrPayload } from '@/lib/event-credentialing-qr';
import {
  compareByCreatedAtDesc,
  compareByCredentialedAtDesc,
} from '@/lib/event-inscription-sort';
import { CredentialingQrScannerModal } from '@/components/event-credentialing/CredentialingQrScannerModal';
import { EventInscriptionDetailModal } from '@/components/event-credentialing/EventInscriptionDetailModal';
import { AdminSensitiveConfirmModal } from '@/components/ui/AdminSensitiveConfirmModal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CredentialFilter = 'all' | 'pending' | 'credentialed';

const badgeSm =
  'inline-flex shrink-0 rounded px-1.5 py-px text-[10px] font-semibold leading-tight';

const AUTOCOMPLETE_LIMIT = 8;

function inscriptionSearchBlob(row: EventInscriptionRecord): string {
  return [
    inscriptionDisplayLabel(row.fields),
    inscriptionDisplaySubtitle(row.fields) ?? '',
    formatCredentialedAt(row.credentialedAt),
    ...Object.values(row.fields || {}).map((x) => String(x)),
  ]
    .join(' ')
    .toLowerCase();
}

function matchesInscriptionSearch(blob: string, term: string): boolean {
  const tokens = term
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => blob.includes(t));
}

function findInscriptionsByCpf(
  rows: (EventInscriptionRecord & { id: string })[],
  cpfDigits: string,
): (EventInscriptionRecord & { id: string })[] {
  if (cpfDigits.length !== 11) return [];
  return rows.filter((row) => normalizeInscriptionCpfDigits(row.fields ?? {}) === cpfDigits);
}

function searchMatchScore(label: string, subtitle: string | null, term: string): number {
  const tokens = term
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 0;
  const l = label.toLowerCase();
  const s = (subtitle ?? '').toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (l.startsWith(t)) score += 100;
    else if (l.includes(t)) score += 50;
    else if (s.includes(t)) score += 25;
    else return -1;
  }
  return score;
}

function formatDateTimeCompact(iso: string | null | undefined): string {
  const raw = (iso ?? '').trim();
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export type EventCredentialingPanelProps = {
  eventId: string;
  campanha: Campaign;
  rows: (EventInscriptionRecord & { id: string })[];
  error?: string;
  onToggle: (row: EventInscriptionRecord & { id: string }, credentialed: boolean) => Promise<void>;
  footerLink?: React.ReactNode;
  /** Exibe faixa “Área sensível” nos modais (admin). Desligue no link público de credenciamento. */
  showSensitiveConfirmBanner?: boolean;
  /** App: link para retomar pagamento quando a inscrição Asaas ainda está pendente. */
  paymentResumeHref?: (inscriptionId: string) => string;
};

export function EventCredentialingPanel({
  eventId,
  campanha,
  rows,
  error,
  onToggle,
  footerLink,
  showSensitiveConfirmBanner = true,
  paymentResumeHref,
}: EventCredentialingPanelProps) {
  const [cpfLookup, setCpfLookup] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filter, setFilter] = useState<CredentialFilter>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [credentialSuccessModal, setCredentialSuccessModal] = useState<{ title: string } | null>(null);
  const [detailRow, setDetailRow] = useState<(EventInscriptionRecord & { id: string }) | null>(null);
  const [undoConfirmRow, setUndoConfirmRow] = useState<(EventInscriptionRecord & { id: string }) | null>(
    null,
  );

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const payment = getEffectivePayment(campanha);
  const paymentConfigured = payment.kind !== 'none';
  const reg = getEffectiveRegistration(campanha, { ignoreRegistrationClosed: true });

  const stats = useMemo(() => {
    const credentialed = rows.filter((r) => isInscriptionCredentialed(r)).length;
    return { total: rows.length, credentialed, pending: rows.length - credentialed };
  }, [rows]);

  const trimmedSearch = searchTerm.trim();
  const cpfDigits = cpfLookup.replace(/\D/g, '').slice(0, 11);

  const cpfMatches = useMemo(
    () => findInscriptionsByCpf(rows, cpfDigits),
    [rows, cpfDigits],
  );

  const cpfLookupRow = cpfDigits.length === 11 ? (cpfMatches[0] ?? null) : null;
  const cpfLookupAmbiguous = cpfDigits.length === 11 && cpfMatches.length > 1;

  const suggestions = useMemo(() => {
    if (trimmedSearch.length < 1) return [];
    const ranked = rows
      .map((row) => {
        const label = inscriptionDisplayLabel(row.fields);
        const subtitle = inscriptionDisplaySubtitle(row.fields);
        const score = searchMatchScore(label, subtitle, trimmedSearch);
        if (score < 0) return null;
        return { row, label, subtitle, score };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.label.localeCompare(b.label, 'pt-BR');
      })
      .slice(0, AUTOCOMPLETE_LIMIT);
    return ranked;
  }, [rows, trimmedSearch]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [trimmedSearch, suggestions.length]);

  useEffect(() => {
    return () => {
      if (blurCloseTimer.current) clearTimeout(blurCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!detailRow) return;
    const fresh = rowsById.get(detailRow.id);
    if (fresh) setDetailRow(fresh);
  }, [rows, detailRow?.id, rowsById]);

  const filteredRows = useMemo(() => {
    const term = trimmedSearch;
    let list = rows.filter((r) => {
      if (filter === 'credentialed' && !isInscriptionCredentialed(r)) return false;
      if (filter === 'pending' && isInscriptionCredentialed(r)) return false;
      if (!term) return true;
      return matchesInscriptionSearch(inscriptionSearchBlob(r), term);
    });

    list = [...list].sort((a, b) => {
      if (filter === 'credentialed') return compareByCredentialedAtDesc(a, b);
      if (filter === 'pending') return compareByCreatedAtDesc(a, b);
      const ca = isInscriptionCredentialed(a);
      const cb = isInscriptionCredentialed(b);
      if (ca !== cb) return ca ? 1 : -1;
      if (ca) return compareByCredentialedAtDesc(a, b);
      return compareByCreatedAtDesc(a, b);
    });

    return list;
  }, [rows, trimmedSearch, filter]);

  const showSuggestDropdown = suggestOpen && trimmedSearch.length >= 1;

  async function applyToggle(row: EventInscriptionRecord & { id: string }, credentialed: boolean) {
    setUpdatingId(row.id);
    setLocalError('');
    try {
      await onToggle(row, credentialed);
    } catch {
      setLocalError('Não foi possível atualizar o credenciamento.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCredential(row: EventInscriptionRecord & { id: string }) {
    const label = inscriptionDisplayLabel(row.fields);
    setUpdatingId(row.id);
    setLocalError('');
    setCredentialSuccessModal(null);
    try {
      await onToggle(row, true);
      setCredentialSuccessModal({ title: `${label} foi credenciado.` });
      setFilter('credentialed');
      setSearchTerm('');
    } catch {
      setLocalError('Não foi possível credenciar o participante.');
    } finally {
      setUpdatingId(null);
    }
  }

  function handleToggle(row: EventInscriptionRecord & { id: string }) {
    if (isInscriptionCredentialed(row)) {
      setUndoConfirmRow(row);
      return;
    }
    void handleCredential(row);
  }

  function openInscriptionDetail(row: EventInscriptionRecord & { id: string }) {
    setDetailRow(row);
  }

  async function credentialFromDetail(row: EventInscriptionRecord & { id: string }) {
    await handleCredential(row);
    setDetailRow(null);
  }

  function requestUndoFromDetail(row: EventInscriptionRecord & { id: string }) {
    setDetailRow(null);
    setUndoConfirmRow(row);
  }

  async function confirmUndoCredentialing() {
    if (!undoConfirmRow) return;
    const row = undoConfirmRow;
    setUndoConfirmRow(null);
    await applyToggle(row, false);
  }

  const handleQrScan = useCallback(
    async (raw: string) => {
      setLocalError('');
      setCredentialSuccessModal(null);
      const parsed = parseCredentialingQrPayload(raw, eventId);
      if (!parsed) {
        setLocalError('QR Code inválido ou de outro evento.');
        return;
      }
      const row = rowsById.get(parsed.inscriptionId);
      if (!row) {
        setLocalError('Inscrição não encontrada neste evento.');
        return;
      }
      const label = inscriptionDisplayLabel(row.fields);
      if (isInscriptionCredentialed(row)) {
        setCredentialSuccessModal({ title: `${label} já estava credenciado(a).` });
        setFilter('credentialed');
        setSearchTerm('');
        return;
      }
      setUpdatingId(row.id);
      try {
        await onToggle(row, true);
        setCredentialSuccessModal({ title: `${label} foi credenciado.` });
        setFilter('credentialed');
        setSearchTerm('');
      } catch {
        setLocalError('Não foi possível credenciar pelo QR Code.');
      } finally {
        setUpdatingId(null);
      }
    },
    [eventId, onToggle, rowsById],
  );

  if (reg.kind !== 'form') {
    return (
      <p className="mt-4 text-sm text-cdl-gray-text">Este evento não utiliza inscrição pelo formulário do site.</p>
    );
  }

  const displayError = error || localError;

  return (
    <>
      {displayError ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {displayError}
        </div>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setQrScannerOpen(true)}
          disabled={Boolean(updatingId)}
          className="btn-primary flex w-full min-h-[48px] items-center justify-center gap-2 text-sm sm:w-auto sm:min-w-[220px]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7h4l2-3h6l2 3h4v12H3V7zm9 10a3 3 0 100-6 3 3 0 000 6z"
            />
          </svg>
          Ler QR Code
        </button>
        <p className="mt-2 text-xs text-cdl-gray-text">
          No celular, toque para abrir a câmera e credenciar automaticamente ao ler o QR do participante.
        </p>
        <p className="mt-1 text-xs text-cdl-gray-text">
          Toque no nome de um inscrito na lista para ver os detalhes completos.
        </p>
      </div>

      <CredentialingQrScannerModal
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={(text) => void handleQrScan(text)}
      />

      <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-center">
          <p className="text-lg font-bold leading-none tabular-nums text-gray-900">{stats.total}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">Inscritos</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-center">
          <p className="text-lg font-bold leading-none tabular-nums text-emerald-900">{stats.credentialed}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800">Credenciados</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-center">
          <p className="text-lg font-bold leading-none tabular-nums text-amber-900">{stats.pending}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">Aguardando</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="rounded-xl border border-cdl-blue/25 bg-white p-3 shadow-sm sm:p-4">
          <label htmlFor="credentialing-cpf-lookup" className="block text-sm font-medium text-gray-900">
            Digite o CPF
          </label>
          <p className="mt-0.5 text-xs text-cdl-gray-text">
            {paymentResumeHref
              ? 'Ao informar o CPF completo, exibimos o status da inscrição. O QR Code só aparece após o pagamento confirmado.'
              : 'Ao informar o CPF completo, o QR Code do participante aparece abaixo para conferência na entrada.'}
          </p>
          <input
            id="credentialing-cpf-lookup"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpfLookup}
            onChange={(e) => setCpfLookup(formatCpfDisplay(e.target.value))}
            className="mt-2 w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm tabular-nums tracking-wide focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
          />

          {cpfDigits.length === 11 && cpfMatches.length === 0 ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Nenhum inscrito encontrado com este CPF neste evento.
            </p>
          ) : null}

          {cpfLookupAmbiguous ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Mais de uma inscrição com este CPF — exibindo a primeira. Use a busca por nome se precisar de outra.
            </p>
          ) : null}

          {cpfLookupRow ? (
            <div className="mt-4 space-y-3">
              {paymentResumeHref &&
              isInscriptionPaymentPending(cpfLookupRow, payment) &&
              paymentResumeHref(cpfLookupRow.id) ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-950">Pagamento pendente</p>
                  <p className="mt-2 text-sm leading-relaxed text-amber-900">
                    Este participante ainda não realizou o pagamento da inscrição (
                    {paymentStatusLabel(normalizeInscriptionPaymentStatus(cpfLookupRow))}). O QR Code de
                    credenciamento ficará disponível após a confirmação do pagamento.
                  </p>
                  <Link
                    href={paymentResumeHref(cpfLookupRow.id)}
                    prefetch={false}
                    className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-cdl-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cdl-blue-dark sm:w-auto"
                  >
                    Ver opções de pagamento
                  </Link>
                </div>
              ) : (
                <EventInscriptionCheckInQr
                  eventId={eventId}
                  inscriptionId={cpfLookupRow.id}
                  participantLabel={inscriptionDisplayLabel(cpfLookupRow.fields)}
                  className="border-cdl-blue/15 bg-slate-50/80"
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 text-sm text-gray-700">
                  {isInscriptionCredentialed(cpfLookupRow) ? (
                    <span className="font-medium text-emerald-800">
                      Já credenciado
                      {cpfLookupRow.credentialedAt
                        ? ` · ${formatDateTimeCompact(cpfLookupRow.credentialedAt)}`
                        : ''}
                    </span>
                  ) : (
                    <span className="text-amber-900">Aguardando credenciamento</span>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openInscriptionDetail(cpfLookupRow)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Ver detalhes
                  </button>
                  {isInscriptionCredentialed(cpfLookupRow) ? (
                    <button
                      type="button"
                      disabled={updatingId === cpfLookupRow.id}
                      onClick={() => void handleToggle(cpfLookupRow)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {updatingId === cpfLookupRow.id ? '…' : 'Desfazer'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingId === cpfLookupRow.id}
                      onClick={() => void handleCredential(cpfLookupRow)}
                      className="rounded-md bg-cdl-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-cdl-blue-dark disabled:opacity-50"
                    >
                      {updatingId === cpfLookupRow.id ? '…' : 'Credenciar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ou busque por nome</p>

        <div className="relative">
          <input
            ref={searchInputRef}
            type="search"
            role="combobox"
            aria-expanded={showSuggestDropdown}
            aria-autocomplete="list"
            aria-controls="credentialing-search-listbox"
            aria-activedescendant={
              highlightIndex >= 0 && suggestions[highlightIndex]
                ? `credentialing-suggest-${suggestions[highlightIndex].row.id}`
                : undefined
            }
            placeholder="Digite o nome para buscar…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => {
              if (blurCloseTimer.current) {
                clearTimeout(blurCloseTimer.current);
                blurCloseTimer.current = null;
              }
              if (trimmedSearch.length >= 1) setSuggestOpen(true);
            }}
            onBlur={() => {
              blurCloseTimer.current = setTimeout(() => setSuggestOpen(false), 180);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSuggestOpen(false);
                setHighlightIndex(-1);
                return;
              }
              if (!showSuggestDropdown && trimmedSearch.length >= 1 && suggestions.length > 0) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') setSuggestOpen(true);
              }
              if (!showSuggestDropdown || suggestions.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
              } else if (e.key === 'Enter' && highlightIndex >= 0) {
                e.preventDefault();
                const item = suggestions[highlightIndex];
                if (item) openInscriptionDetail(item.row);
              } else if (e.key === 'Enter' && suggestions.length === 1) {
                e.preventDefault();
                openInscriptionDetail(suggestions[0].row);
              }
            }}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
            autoComplete="off"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {showSuggestDropdown ? (
            <ul
              id="credentialing-search-listbox"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
              {suggestions.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-cdl-gray-text">Nenhum inscrito encontrado.</li>
              ) : (
                suggestions.map((item, index) => {
                  const credentialed = isInscriptionCredentialed(item.row);
                  const active = index === highlightIndex;
                  const cpf = inscriptionDisplayCpf(item.row.fields);
                  const showCpf = shouldShowInscriptionCpfBesideLabel(item.row.fields, item.label);
                  return (
                    <li key={item.row.id} role="presentation">
                      <button
                        id={`credentialing-suggest-${item.row.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          active ? 'bg-cdl-blue/10 text-gray-900' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setHighlightIndex(index)}
                        onClick={() => openInscriptionDetail(item.row)}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{item.label}</span>
                          {showCpf && cpf ? (
                            <span className="text-gray-500">
                              <span className="text-gray-400"> · </span>
                              {cpf}
                            </span>
                          ) : null}
                        </span>
                        {item.subtitle ? (
                          <span className="hidden max-w-[40%] truncate text-xs text-gray-500 sm:inline">
                            {item.subtitle}
                          </span>
                        ) : null}
                        <span
                          className={`shrink-0 rounded px-1.5 py-px text-[10px] font-semibold ${
                            credentialed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {credentialed ? 'Cred.' : 'Aguard.'}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'pending' as const, label: 'Aguardando' },
              { id: 'credentialed' as const, label: 'Credenciados' },
              { id: 'all' as const, label: 'Todos' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                filter === tab.id
                  ? 'bg-cdl-blue text-white ring-cdl-blue'
                  : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-cdl-gray-text">
          {rows.length === 0
            ? 'Nenhuma inscrição registrada para este evento.'
            : 'Nenhum inscrito encontrado com os filtros atuais.'}
        </div>
      ) : (
        <ul
          className={`mt-4 divide-y rounded-lg border ${
            filter === 'credentialed'
              ? 'divide-emerald-100 border-emerald-200 bg-emerald-50/40'
              : filter === 'pending'
                ? 'divide-amber-100/80 border-amber-200/80 bg-amber-50/30'
                : 'divide-gray-100 border-gray-200 bg-white'
          }`}
        >
          {filteredRows.map((row) => {
            const credentialed = isInscriptionCredentialed(row);
            const label = inscriptionDisplayLabel(row.fields);
            const cpf = inscriptionDisplayCpf(row.fields);
            const showCpf = shouldShowInscriptionCpfBesideLabel(row.fields, label);
            const subtitle = inscriptionDisplaySubtitle(row.fields);
            const paymentPending = paymentConfigured && row.paymentStatus === 'pending';
            const busy = updatingId === row.id;
            const credAt = credentialed ? formatDateTimeCompact(row.credentialedAt) : '';

            return (
              <li
                key={row.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 sm:px-3 ${
                  credentialed ? 'bg-emerald-50/50' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => openInscriptionDetail(row)}
                  className="min-w-0 flex-1 truncate text-left text-xs leading-snug text-gray-600 hover:text-cdl-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-cdl-blue/40 rounded"
                >
                  <span className="font-medium text-gray-900">{label}</span>
                  {showCpf && cpf ? (
                    <>
                      <span className="text-gray-400"> · </span>
                      <span>{cpf}</span>
                    </>
                  ) : null}
                  {subtitle ? (
                    <>
                      <span className="text-gray-400"> · </span>
                      <span>{subtitle}</span>
                    </>
                  ) : null}
                  {credAt ? (
                    <>
                      <span className="text-gray-400"> · </span>
                      <span className="text-emerald-700">{credAt}</span>
                    </>
                  ) : null}
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {credentialed && (
                    <span className={`${badgeSm} bg-emerald-200 text-emerald-900`}>Cred.</span>
                  )}
                  {paymentPending && (
                    <span className={`${badgeSm} bg-amber-100 text-amber-800`}>Pend.</span>
                  )}
                  {credentialed ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggle(row)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {busy ? '…' : 'Desfazer'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggle(row)}
                      className="rounded-md bg-cdl-blue px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-cdl-blue-dark disabled:opacity-50"
                    >
                      {busy ? '…' : 'Credenciar'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {footerLink ? <p className="mt-6 text-center text-sm">{footerLink}</p> : null}

      <EventInscriptionDetailModal
        open={detailRow !== null}
        row={detailRow}
        campanhaTitle={campanha.title}
        paymentConfigured={paymentConfigured}
        busy={Boolean(detailRow && updatingId === detailRow.id)}
        onClose={() => setDetailRow(null)}
        onCredential={(row) => void credentialFromDetail(row)}
        onUndoCredential={requestUndoFromDetail}
      />

      <AdminSensitiveConfirmModal
        open={credentialSuccessModal !== null}
        title={credentialSuccessModal?.title ?? ''}
        titleId="credentialing-success-title"
        confirmLabel="OK"
        confirmTone="primary"
        showSensitiveBanner={false}
        successVariant
        alertOnly
        busy={false}
        onClose={() => setCredentialSuccessModal(null)}
        onConfirm={() => setCredentialSuccessModal(null)}
      />

      <AdminSensitiveConfirmModal
        open={undoConfirmRow !== null}
        title="Desfazer credenciamento?"
        titleId="confirm-undo-credentialing-title"
        confirmLabel="Sim, desfazer"
        confirmTone="warning"
        showSensitiveBanner={showSensitiveConfirmBanner}
        busy={Boolean(updatingId)}
        onClose={() => {
          if (!updatingId) setUndoConfirmRow(null);
        }}
        onConfirm={() => void confirmUndoCredentialing()}
      >
        {undoConfirmRow ? (
          <>
            O participante <strong className="text-gray-900">{inscriptionDisplayLabel(undoConfirmRow.fields)}</strong>{' '}
            voltará para a lista <strong className="text-gray-900">Aguardando</strong>.
            <span className="mt-2 block text-gray-700">
              Use apenas se o check-in foi feito por engano.
            </span>
          </>
        ) : null}
      </AdminSensitiveConfirmModal>
    </>
  );
}
