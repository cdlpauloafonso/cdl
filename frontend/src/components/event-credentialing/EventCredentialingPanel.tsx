'use client';

import type { Campaign, EventInscriptionRecord } from '@/lib/firestore';
import {
  getEffectiveRegistration,
  inscriptionDisplayCpf,
  inscriptionDisplayLabel,
  inscriptionDisplaySubtitle,
  normalizeInscriptionCpfDigits,
  shouldShowInscriptionCpfBesideLabel,
} from '@/lib/event-registration-fields';
import { getEffectivePayment } from '@/lib/event-payment-fields';
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

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function inscriptionCnpjDigits(fields: Record<string, string> | undefined): string {
  return onlyDigits(fields?.cnpj ?? '').slice(0, 14);
}

function inscriptionSearchBlob(row: EventInscriptionRecord): string {
  const fields = row.fields ?? {};
  const cpfDigits = normalizeInscriptionCpfDigits(fields) ?? '';
  const cnpjDigits = inscriptionCnpjDigits(fields);
  return [
    inscriptionDisplayLabel(fields),
    inscriptionDisplaySubtitle(fields) ?? '',
    formatCredentialedAt(row.credentialedAt),
    cpfDigits,
    cnpjDigits,
    ...Object.values(fields).map((x) => String(x)),
  ]
    .join(' ')
    .toLowerCase();
}

function inscriptionSearchDigitsBlob(row: EventInscriptionRecord): string {
  const fields = row.fields ?? {};
  const parts = [
    normalizeInscriptionCpfDigits(fields),
    inscriptionCnpjDigits(fields) || null,
    ...Object.values(fields).map((x) => onlyDigits(String(x ?? ''))),
  ].filter((x): x is string => Boolean(x && x.length > 0));
  return parts.join(' ');
}

function matchesInscriptionSearch(row: EventInscriptionRecord, term: string): boolean {
  const trimmed = term.trim();
  if (!trimmed) return true;

  const termDigits = onlyDigits(trimmed);
  if (termDigits.length >= 3 && inscriptionSearchDigitsBlob(row).includes(termDigits)) {
    return true;
  }

  const blob = inscriptionSearchBlob(row);
  const tokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => {
    const tokenDigits = onlyDigits(t);
    if (tokenDigits.length >= 3 && inscriptionSearchDigitsBlob(row).includes(tokenDigits)) {
      return true;
    }
    return blob.includes(t);
  });
}

function searchMatchScore(row: EventInscriptionRecord, term: string): number {
  const trimmed = term.trim();
  if (!trimmed) return 0;

  const fields = row.fields ?? {};
  const label = inscriptionDisplayLabel(fields);
  const subtitle = inscriptionDisplaySubtitle(fields);
  const termDigits = onlyDigits(trimmed);
  const cpf = normalizeInscriptionCpfDigits(fields);
  const cnpj = inscriptionCnpjDigits(fields);

  if (termDigits.length >= 3) {
    if (cpf && cpf === termDigits) return 250;
    if (cpf && cpf.startsWith(termDigits)) return 200;
    if (cnpj.length >= 3 && (cnpj === termDigits || cnpj.startsWith(termDigits))) return 190;
    if (inscriptionSearchDigitsBlob(row).includes(termDigits)) return 150;
  }

  const tokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 0;
  const l = label.toLowerCase();
  const s = (subtitle ?? '').toLowerCase();
  const blob = inscriptionSearchBlob(row);
  let score = 0;
  for (const t of tokens) {
    const tokenDigits = onlyDigits(t);
    if (tokenDigits.length >= 3 && inscriptionSearchDigitsBlob(row).includes(tokenDigits)) {
      score += 80;
      continue;
    }
    if (l.startsWith(t)) score += 100;
    else if (l.includes(t)) score += 50;
    else if (s.includes(t)) score += 25;
    else if (blob.includes(t)) score += 20;
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
};

export function EventCredentialingPanel({
  eventId,
  campanha,
  rows,
  error,
  onToggle,
  footerLink,
  showSensitiveConfirmBanner = true,
}: EventCredentialingPanelProps) {
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

  const suggestions = useMemo(() => {
    if (trimmedSearch.length < 1) return [];
    const ranked = rows
      .map((row) => {
        const label = inscriptionDisplayLabel(row.fields);
        const subtitle = inscriptionDisplaySubtitle(row.fields);
        const score = searchMatchScore(row, trimmedSearch);
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
      return matchesInscriptionSearch(r, term);
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
        <label htmlFor="credentialing-search" className="sr-only">
          Buscar inscrito por nome, CPF ou CNPJ
        </label>
        <div className="relative">
          <input
            id="credentialing-search"
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
            placeholder="Buscar por nome, CPF ou CNPJ…"
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
        eventId={eventId}
        campanhaTitle={campanha.title}
        payment={payment}
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
