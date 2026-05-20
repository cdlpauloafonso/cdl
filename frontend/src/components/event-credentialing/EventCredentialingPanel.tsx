'use client';

import type { Campaign, EventInscriptionRecord } from '@/lib/firestore';
import {
  getEffectiveRegistration,
  inscriptionDisplayLabel,
  inscriptionDisplaySubtitle,
} from '@/lib/event-registration-fields';
import { getEffectivePayment } from '@/lib/event-payment-fields';
import {
  formatCredentialedAt,
  isInscriptionCredentialed,
} from '@/lib/event-credentialing';
import { parseCredentialingQrPayload } from '@/lib/event-credentialing-qr';
import { CredentialingQrScannerModal } from '@/components/event-credentialing/CredentialingQrScannerModal';
import { useCallback, useMemo, useState } from 'react';

type CredentialFilter = 'all' | 'pending' | 'credentialed';

export type EventCredentialingPanelProps = {
  eventId: string;
  campanha: Campaign;
  rows: (EventInscriptionRecord & { id: string })[];
  error?: string;
  onToggle: (row: EventInscriptionRecord & { id: string }, credentialed: boolean) => Promise<void>;
  footerLink?: React.ReactNode;
};

export function EventCredentialingPanel({
  eventId,
  campanha,
  rows,
  error,
  onToggle,
  footerLink,
}: EventCredentialingPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<CredentialFilter>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');
  const [qrSuccess, setQrSuccess] = useState('');
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const paymentConfigured = getEffectivePayment(campanha).kind !== 'none';
  const reg = getEffectiveRegistration(campanha, { ignoreRegistrationClosed: true });

  const stats = useMemo(() => {
    const credentialed = rows.filter((r) => isInscriptionCredentialed(r)).length;
    return { total: rows.length, credentialed, pending: rows.length - credentialed };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let list = rows.filter((r) => {
      if (filter === 'credentialed' && !isInscriptionCredentialed(r)) return false;
      if (filter === 'pending' && isInscriptionCredentialed(r)) return false;
      if (!term) return true;
      const blob = [
        inscriptionDisplayLabel(r.fields),
        inscriptionDisplaySubtitle(r.fields) ?? '',
        formatCredentialedAt(r.credentialedAt),
        ...Object.values(r.fields || {}).map((x) => String(x)),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(term);
    });

    list = [...list].sort((a, b) => {
      const ca = isInscriptionCredentialed(a);
      const cb = isInscriptionCredentialed(b);
      if (ca !== cb) return ca ? 1 : -1;
      return inscriptionDisplayLabel(a.fields).localeCompare(inscriptionDisplayLabel(b.fields), 'pt-BR');
    });

    return list;
  }, [rows, searchTerm, filter]);

  async function handleToggle(row: EventInscriptionRecord & { id: string }) {
    const next = !isInscriptionCredentialed(row);
    setUpdatingId(row.id);
    setLocalError('');
    setQrSuccess('');
    try {
      await onToggle(row, next);
    } catch {
      setLocalError('Não foi possível atualizar o credenciamento.');
    } finally {
      setUpdatingId(null);
    }
  }

  const handleQrScan = useCallback(
    async (raw: string) => {
      setLocalError('');
      setQrSuccess('');
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
        setQrSuccess(`${label} já estava credenciado(a).`);
        setFilter('credentialed');
        setSearchTerm('');
        return;
      }
      setUpdatingId(row.id);
      try {
        await onToggle(row, true);
        setQrSuccess(`${label} credenciado(a) com sucesso!`);
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

      {qrSuccess ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {qrSuccess}
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
      </div>

      <CredentialingQrScannerModal
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={(text) => void handleQrScan(text)}
      />

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center sm:p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 sm:text-sm">Inscritos</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center sm:p-4">
          <p className="text-2xl font-bold text-emerald-900">{stats.credentialed}</p>
          <p className="text-xs text-emerald-800 sm:text-sm">Credenciados</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center sm:p-4">
          <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
          <p className="text-xs text-amber-800 sm:text-sm">Aguardando</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="relative">
          <input
            type="search"
            placeholder="Buscar por nome, empresa, e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 pl-10 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
            autoComplete="off"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
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
              className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
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
        <ul className="mt-6 space-y-3">
          {filteredRows.map((row) => {
            const credentialed = isInscriptionCredentialed(row);
            const subtitle = inscriptionDisplaySubtitle(row.fields);
            const paymentPending = paymentConfigured && row.paymentStatus === 'pending';
            const busy = updatingId === row.id;

            return (
              <li
                key={row.id}
                className={`rounded-xl border p-4 ${
                  credentialed ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{inscriptionDisplayLabel(row.fields)}</p>
                      {credentialed && (
                        <span className="inline-flex rounded-full bg-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                          Credenciado
                        </span>
                      )}
                      {paymentPending && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          Pagamento pendente
                        </span>
                      )}
                    </div>
                    {subtitle ? <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p> : null}
                    {credentialed && row.credentialedAt ? (
                      <p className="mt-1 text-xs text-emerald-800">
                        Credenciado em {formatCredentialedAt(row.credentialedAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {credentialed ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggle(row)}
                        className="btn-secondary text-sm !px-4 !py-2 disabled:opacity-50"
                      >
                        {busy ? 'Salvando…' : 'Desfazer'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggle(row)}
                        className="btn-primary min-h-[44px] text-sm !px-5 !py-2.5 disabled:opacity-50"
                      >
                        {busy ? 'Salvando…' : 'Credenciar'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {footerLink ? <p className="mt-6 text-center text-sm">{footerLink}</p> : null}
    </>
  );
}
