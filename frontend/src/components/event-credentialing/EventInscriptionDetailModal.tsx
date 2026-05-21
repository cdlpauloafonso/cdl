'use client';

import type { EventInscriptionRecord } from '@/lib/firestore';
import {
  formatCredentialedAt,
  isInscriptionCredentialed,
} from '@/lib/event-credentialing';
import { formatPaymentAmountBrl } from '@/lib/event-payment-fields';
import {
  labelForInscriptionField,
  sortInscriptionFieldKeys,
} from '@/lib/event-registration-fields';
import { applyInscriptionFieldMask, hasInscriptionFieldMask } from '@/lib/input-masks-br';
import {
  normalizeInscriptionPaymentStatus,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from '@/lib/inscription-payment-status';
import { inscriptionDisplayLabel } from '@/lib/event-registration-fields';

export type EventInscriptionDetailModalProps = {
  open: boolean;
  row: (EventInscriptionRecord & { id: string }) | null;
  campanhaTitle?: string;
  paymentConfigured: boolean;
  busy?: boolean;
  onClose: () => void;
  onCredential?: (row: EventInscriptionRecord & { id: string }) => void;
  onUndoCredential?: (row: EventInscriptionRecord & { id: string }) => void;
};

function formatDateTime(iso: string | null | undefined): string {
  const raw = (iso ?? '').trim();
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

function formatFieldValue(key: string, raw: string): string {
  const t = raw.trim();
  if (!t) return '—';
  if (hasInscriptionFieldMask(key)) return applyInscriptionFieldMask(key, t);
  return t;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(8rem,34%)_1fr] sm:gap-x-4 sm:gap-y-0.5">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 break-words whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export function EventInscriptionDetailModal({
  open,
  row,
  campanhaTitle,
  paymentConfigured,
  busy = false,
  onClose,
  onCredential,
  onUndoCredential,
}: EventInscriptionDetailModalProps) {
  if (!open || !row) return null;

  const title = inscriptionDisplayLabel(row.fields);
  const credentialed = isInscriptionCredentialed(row);
  const fieldEntries = sortInscriptionFieldKeys(Object.keys(row.fields ?? {}))
    .map((key) => {
      const raw = row.fields[key];
      if (raw == null || String(raw).trim() === '') return null;
      return { key, label: labelForInscriptionField(key), value: formatFieldValue(key, String(raw)) };
    })
    .filter((x): x is { key: string; label: string; value: string } => x != null);

  const paymentStatus = normalizeInscriptionPaymentStatus(row);
  const paymentTier =
    row.paymentAmountTier === 'associado'
      ? 'Tarifa associado CDL'
      : row.paymentAmountTier === 'normal'
        ? 'Tarifa normal'
        : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inscription-detail-title"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-cdl-blue">Inscrito</p>
            <h2 id="inscription-detail-title" className="mt-0.5 text-lg font-bold text-gray-900 break-words">
              {title}
            </h2>
            {campanhaTitle ? (
              <p className="mt-1 text-xs text-cdl-gray-text truncate">{campanhaTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Situação</h3>
            <dl className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3">
              <DetailRow label="Inscrição em" value={formatDateTime(row.createdAt)} />
              <DetailRow
                label="Credenciamento"
                value={
                  credentialed
                    ? `Credenciado · ${formatCredentialedAt(row.credentialedAt) || formatDateTime(row.credentialedAt)}`
                    : 'Aguardando check-in'
                }
              />
              {paymentConfigured ? (
                <>
                  <div className="grid gap-0.5 sm:grid-cols-[minmax(8rem,34%)_1fr] sm:gap-x-4">
                    <dt className="text-xs font-medium text-gray-500">Pagamento</dt>
                    <dd>
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ring-1 ${paymentStatusBadgeClass(paymentStatus)}`}
                      >
                        {paymentStatusLabel(paymentStatus)}
                      </span>
                    </dd>
                  </div>
                  {typeof row.paymentAmountApplied === 'number' && row.paymentAmountApplied > 0 ? (
                    <DetailRow
                      label="Valor cobrado"
                      value={`${formatPaymentAmountBrl(row.paymentAmountApplied)}${paymentTier ? ` (${paymentTier})` : ''}`}
                    />
                  ) : null}
                  {row.voucherCode ? (
                    <DetailRow label="Voucher" value={row.voucherCode} />
                  ) : null}
                </>
              ) : null}
            </dl>
          </section>

          {fieldEntries.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Dados do formulário
              </h3>
              <dl className="space-y-2 rounded-lg border border-gray-100 bg-white px-3 py-3">
                {fieldEntries.map((f) => (
                  <DetailRow key={f.key} label={f.label} value={f.value} />
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-5 py-4">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary flex-1 sm:flex-none">
            Fechar
          </button>
          {credentialed && onUndoCredential ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUndoCredential(row)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex-1 sm:flex-none"
            >
              Desfazer credenciamento
            </button>
          ) : null}
          {!credentialed && onCredential ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCredential(row)}
              className="btn-primary flex-1 sm:flex-none"
            >
              {busy ? 'Credenciando…' : 'Credenciar'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
