'use client';

import { useEffect, useState } from 'react';
import type { EventInscriptionRecord } from '@/lib/firestore';
import {
  formatCredentialedAt,
  isInscriptionCredentialed,
} from '@/lib/event-credentialing';
import { formatPaymentAmountBrl, type EffectivePayment } from '@/lib/event-payment-fields';
import {
  labelForInscriptionField,
  sortInscriptionFieldKeys,
} from '@/lib/event-registration-fields';
import { applyInscriptionFieldMask, hasInscriptionFieldMask } from '@/lib/input-masks-br';
import {
  isAsaasManagedInscription,
  isInscriptionPaymentPending,
  normalizeInscriptionPaymentStatus,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from '@/lib/inscription-payment-status';
import { inscriptionDisplayLabel } from '@/lib/event-registration-fields';
import {
  fetchInscriptionCheckoutMethod,
  pixQrImageSrc,
  type InscriptionPaymentPixCheckout,
} from '@/lib/asaas-api';
import { isApiConfiguredForClient } from '@/lib/api-base';

export type EventInscriptionDetailModalProps = {
  open: boolean;
  row: (EventInscriptionRecord & { id: string }) | null;
  eventId: string;
  campanhaTitle?: string;
  payment: EffectivePayment;
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
  eventId,
  campanhaTitle,
  payment,
  busy = false,
  onClose,
  onCredential,
  onUndoCredential,
}: EventInscriptionDetailModalProps) {
  const [pixOpen, setPixOpen] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState('');
  const [pixData, setPixData] = useState<InscriptionPaymentPixCheckout | null>(null);
  const [pixAmount, setPixAmount] = useState<number | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  useEffect(() => {
    if (!open) {
      setPixOpen(false);
      setPixLoading(false);
      setPixError('');
      setPixData(null);
      setPixAmount(null);
      setCopyOk(false);
    }
  }, [open, row?.id]);

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

  const paymentConfigured = payment.kind !== 'none';
  const showAsaasPix =
    payment.kind === 'asaas' &&
    isAsaasManagedInscription(row) &&
    isInscriptionPaymentPending(row, payment);

  async function loadPixQr() {
    if (!row?.id || !eventId) return;
    if (!isApiConfiguredForClient()) {
      setPixError('Pagamento online indisponível neste ambiente.');
      return;
    }
    setPixOpen(true);
    setPixLoading(true);
    setPixError('');
    setPixData(null);
    setCopyOk(false);
    try {
      const checkout = await fetchInscriptionCheckoutMethod(eventId, row.id, 'pix');
      if (checkout.pix?.payload && checkout.pix?.encodedImage) {
        setPixData(checkout.pix);
        setPixAmount(checkout.amount > 0 ? checkout.amount : null);
      } else {
        setPixError(
          'Não foi possível obter o QR Code PIX. Verifique se o PIX está habilitado na conta Asaas.',
        );
      }
    } catch (err) {
      setPixError(err instanceof Error ? err.message : 'Não foi possível gerar o PIX.');
    } finally {
      setPixLoading(false);
    }
  }

  async function copyPixPayload() {
    if (!pixData?.payload) return;
    try {
      await navigator.clipboard.writeText(pixData.payload);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2500);
    } catch {
      setPixError('Não foi possível copiar o código PIX.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inscription-detail-title"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="mx-auto flex max-h-[min(88dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
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

            {showAsaasPix ? (
              <div className="space-y-3">
                {!pixOpen ? (
                  <button
                    type="button"
                    disabled={busy || pixLoading}
                    onClick={() => void loadPixQr()}
                    className="w-full rounded-lg bg-cdl-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-cdl-blue-dark disabled:opacity-50"
                  >
                    Pagar via PIX
                  </button>
                ) : null}

                {pixOpen ? (
                  <div className="rounded-lg border border-cdl-blue/20 bg-white p-3 shadow-inner">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">Pagamento PIX</p>
                      <button
                        type="button"
                        disabled={pixLoading}
                        onClick={() => void loadPixQr()}
                        className="text-xs font-medium text-cdl-blue hover:underline disabled:opacity-50"
                      >
                        Atualizar QR
                      </button>
                    </div>
                    {pixAmount != null && pixAmount > 0 ? (
                      <p className="mt-1 text-sm text-gray-700">
                        Valor: <span className="font-semibold">{formatPaymentAmountBrl(pixAmount)}</span>
                      </p>
                    ) : null}

                    {pixLoading ? (
                      <p className="mt-4 text-center text-sm text-cdl-gray-text">Gerando QR Code PIX…</p>
                    ) : null}

                    {pixError ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {pixError}
                      </p>
                    ) : null}

                    {!pixLoading && pixData ? (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-cdl-gray-text">
                          Escaneie o QR Code no app do banco ou copie o PIX copia e cola.
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pixQrImageSrc(pixData.encodedImage)}
                          alt="QR Code PIX"
                          className="mx-auto mt-3 max-h-56 w-auto rounded-lg border border-gray-200 bg-white p-2"
                        />
                        {pixData.expirationDate ? (
                          <p className="mt-2 text-xs text-cdl-gray-text">
                            Validade do QR: {pixData.expirationDate}
                          </p>
                        ) : null}
                        <label className="mt-3 block text-left text-xs font-medium text-gray-600">
                          PIX copia e cola
                        </label>
                        <textarea
                          readOnly
                          rows={3}
                          value={pixData.payload}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs font-mono text-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() => void copyPixPayload()}
                          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                        >
                          {copyOk ? 'Código copiado!' : 'Copiar código PIX'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
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
