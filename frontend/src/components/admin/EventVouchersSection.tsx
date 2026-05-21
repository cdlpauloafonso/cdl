'use client';

import {
  createEmptyVoucherDraft,
  formatVoucherDraftDiscountPreview,
  normalizeVoucherCodeInput,
  type EventVoucherDraft,
} from '@/lib/event-vouchers-admin';
import { formatBrlCurrencyInput } from '@/lib/campaign-payment-admin';

export type EventVouchersSectionProps = {
  vouchers: EventVoucherDraft[];
  onVouchersChange: (next: EventVoucherDraft[]) => void;
};

function updateAt(
  list: EventVoucherDraft[],
  index: number,
  patch: Partial<EventVoucherDraft>
): EventVoucherDraft[] {
  return list.map((v, i) => (i === index ? { ...v, ...patch } : v));
}

function previewDiscount(d: EventVoucherDraft): string | null {
  const built = buildEventVouchersForSave([d]);
  if (!built?.[0]) return null;
  return formatVoucherDiscountSummary(built[0]);
}

export function EventVouchersSection({ vouchers, onVouchersChange }: EventVouchersSectionProps) {
  function addVoucher() {
    onVouchersChange([...vouchers, createEmptyVoucherDraft()]);
  }

  function removeAt(index: number) {
    onVouchersChange(vouchers.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Vouchers de desconto</p>
          <p className="text-xs text-cdl-gray-text mt-0.5">
            Códigos promocionais para a inscrição. Adicione quantos precisar; cada um com código único.
          </p>
        </div>
        <button
          type="button"
          onClick={addVoucher}
          className="shrink-0 rounded-lg border border-cdl-blue bg-white px-3 py-1.5 text-sm font-medium text-cdl-blue hover:bg-cdl-blue/5"
        >
          + Adicionar voucher
        </button>
      </div>

      {vouchers.length === 0 ? (
        <p className="text-sm text-cdl-gray-text rounded-lg border border-dashed border-gray-300 bg-white/60 px-4 py-6 text-center">
          Nenhum voucher cadastrado. Clique em «Adicionar voucher» para criar o primeiro.
        </p>
      ) : (
        <ul className="space-y-4">
          {vouchers.map((v, index) => {
            const summary = formatVoucherDraftDiscountPreview(v);
            return (
              <li
                key={v.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Voucher {index + 1}
                    {summary ? (
                      <span className="ml-2 normal-case font-medium text-cdl-blue">— {summary}</span>
                    ) : null}
                    {(v.usedCount ?? 0) > 0 ? (
                      <span className="ml-2 normal-case font-normal text-gray-600">
                        · {v.usedCount} uso{v.usedCount === 1 ? '' : 's'}
                        {(v.maxUses ?? '').trim() ? ` (limite ${v.maxUses})` : ''}
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
                        checked={v.active}
                        onChange={(e) =>
                          onVouchersChange(updateAt(vouchers, index, { active: e.target.checked }))
                        }
                      />
                      Ativo
                    </label>
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Código <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={v.code}
                      onChange={(e) =>
                        onVouchersChange(
                          updateAt(vouchers, index, {
                            code: normalizeVoucherCodeInput(e.target.value),
                          })
                        )
                      }
                      placeholder="Ex.: CDL2026"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome interno (opcional)</label>
                    <input
                      type="text"
                      value={v.label}
                      onChange={(e) =>
                        onVouchersChange(updateAt(vouchers, index, { label: e.target.value }))
                      }
                      placeholder="Ex.: Parceiro regional"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de desconto</label>
                    <select
                      value={v.discountType}
                      onChange={(e) =>
                        onVouchersChange(
                          updateAt(vouchers, index, {
                            discountType: e.target.value as EventVoucherDraft['discountType'],
                            discountValue: '',
                          })
                        )
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="percent">Percentual (%)</option>
                      <option value="fixed">Valor fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {v.discountType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}{' '}
                      <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode={v.discountType === 'percent' ? 'numeric' : 'decimal'}
                      autoComplete="off"
                      value={v.discountValue}
                      onChange={(e) =>
                        onVouchersChange(
                          updateAt(vouchers, index, {
                            discountValue:
                              v.discountType === 'fixed'
                                ? formatBrlCurrencyInput(e.target.value)
                                : e.target.value.replace(/\D/g, '').slice(0, 3),
                          })
                        )
                      }
                      placeholder={v.discountType === 'percent' ? '10' : 'R$ 0,00'}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Limite de uso</label>
                    <input
                      type="number"
                      min={1}
                      value={v.maxUses}
                      onChange={(e) =>
                        onVouchersChange(updateAt(vouchers, index, { maxUses: e.target.value }))
                      }
                      placeholder="Ilimitado"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <p className="mt-0.5 text-xs text-cdl-gray-text">Deixe em branco para uso ilimitado.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Válido até</label>
                    <input
                      type="date"
                      value={v.expiresAt}
                      onChange={(e) =>
                        onVouchersChange(updateAt(vouchers, index, { expiresAt: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <p className="mt-0.5 text-xs text-cdl-gray-text">Opcional.</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {vouchers.length > 0 ? (
        <button
          type="button"
          onClick={addVoucher}
          className="mt-4 w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-cdl-gray-text hover:border-cdl-blue hover:text-cdl-blue"
        >
          + Adicionar outro voucher
        </button>
      ) : null}
    </div>
  );
}
