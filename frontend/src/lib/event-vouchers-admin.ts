import type { Campaign, EventVoucher, EventVoucherDiscountType } from './firestore';
import { parsePaymentAmountInput } from './campaign-payment-admin';

export type EventVoucherDraft = {
  id: string;
  code: string;
  label: string;
  discountType: EventVoucherDiscountType;
  discountValue: string;
  maxUses: string;
  expiresAt: string;
  active: boolean;
  /** Somente leitura no admin (contador de usos no Firestore). */
  usedCount?: number;
};

export function normalizeVoucherCodeInput(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9_-]/g, '');
}

export function createEmptyVoucherDraft(): EventVoucherDraft {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}`,
    code: '',
    label: '',
    discountType: 'percent',
    discountValue: '',
    maxUses: '',
    expiresAt: '',
    active: true,
  };
}

export function loadEventVoucherDraftsFromCampaign(campaign?: Pick<Campaign, 'vouchers'> | null): EventVoucherDraft[] {
  const list = campaign?.vouchers;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map((v) => ({
    id: v.id,
    code: v.code ?? '',
    label: v.label ?? '',
    discountType: v.discountType === 'fixed' ? 'fixed' : 'percent',
    discountValue:
      v.discountType === 'fixed'
        ? Number(v.discountValue) > 0
          ? Number(v.discountValue).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ''
        : Number(v.discountValue) > 0
          ? String(Math.round(Number(v.discountValue)))
          : '',
    maxUses: v.maxUses != null && v.maxUses > 0 ? String(v.maxUses) : '',
    expiresAt: v.expiresAt ?? '',
    active: v.active !== false,
    usedCount: v.usedCount ?? 0,
  }));
}

function parsePercentInput(raw: string): number | null {
  const t = raw.trim().replace(/%/g, '');
  if (!t) return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return n;
}

function parseMaxUsesInput(raw: string): number | null | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/** Valida rascunhos; retorna mensagem de erro ou null se ok. */
export function validateEventVoucherDrafts(drafts: EventVoucherDraft[]): string | null {
  const codes = new Set<string>();
  for (let i = 0; i < drafts.length; i += 1) {
    const d = drafts[i];
    const code = normalizeVoucherCodeInput(d.code);
    if (!code || code.length < 3) {
      return `Voucher ${i + 1}: informe um código com pelo menos 3 caracteres (letras, números, - ou _).`;
    }
    if (codes.has(code)) {
      return `Voucher ${i + 1}: o código «${code}» está duplicado. Cada voucher precisa de um código único.`;
    }
    codes.add(code);

    if (d.discountType === 'percent') {
      if (parsePercentInput(d.discountValue) == null) {
        return `Voucher ${i + 1} (${code}): informe um desconto percentual entre 1 e 100.`;
      }
    } else if (parsePaymentAmountInput(d.discountValue) == null) {
      return `Voucher ${i + 1} (${code}): informe o valor fixo de desconto em reais.`;
    }

    const maxUses = parseMaxUsesInput(d.maxUses);
    if (maxUses === null) {
      return `Voucher ${i + 1} (${code}): limite de uso inválido (use um número inteiro ou deixe em branco).`;
    }

    if (d.expiresAt.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.expiresAt.trim())) {
        return `Voucher ${i + 1} (${code}): data de validade inválida.`;
      }
    }
  }
  return null;
}

export function buildEventVouchersForSave(
  drafts: EventVoucherDraft[],
  existing?: EventVoucher[]
): EventVoucher[] | undefined {
  if (drafts.length === 0) return undefined;
  const existingById = new Map((existing ?? []).map((v) => [v.id, v]));
  return drafts.map((d) => {
    const code = normalizeVoucherCodeInput(d.code);
    const prev = existingById.get(d.id);
    const discountValueRaw =
      d.discountType === 'percent'
        ? parsePercentInput(d.discountValue)
        : parsePaymentAmountInput(d.discountValue);
    if (discountValueRaw == null) {
      throw new Error('INVALID_VOUCHER_DRAFT');
    }
    const discountValue = discountValueRaw;
    const maxUses = parseMaxUsesInput(d.maxUses);
    const expiresAt = d.expiresAt.trim() || undefined;
    const label = d.label.trim() || undefined;
    return {
      id: d.id,
      code,
      ...(label ? { label } : {}),
      discountType: d.discountType,
      discountValue,
      ...(maxUses != null ? { maxUses } : {}),
      usedCount: prev?.usedCount ?? 0,
      active: d.active,
      ...(expiresAt ? { expiresAt } : {}),
    };
  });
}

export function formatVoucherDiscountSummary(v: Pick<EventVoucher, 'discountType' | 'discountValue'>): string {
  const val = Number(v.discountValue);
  if (!Number.isFinite(val) || val <= 0) return '—';
  if (v.discountType === 'percent') {
    return `${Math.round(val)}%`;
  }
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Resumo do desconto enquanto o admin preenche o rascunho (evita crash com campos vazios). */
export function formatVoucherDraftDiscountPreview(d: EventVoucherDraft): string | null {
  if (d.discountType === 'percent') {
    const n = parsePercentInput(d.discountValue);
    if (n == null) return null;
    return `${n}%`;
  }
  const amount = parsePaymentAmountInput(d.discountValue);
  if (amount == null) return null;
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
