import type { Campaign, EventVoucher, EventVoucherDiscountType } from './firestore';
import { parsePaymentAmountInput } from './campaign-payment-admin';

/** Limite alinhado às regras Firestore (`isValidEventVouchersList`). */
export const MAX_EVENT_VOUCHERS = 30;

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

function newVoucherDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptyVoucherDraft(): EventVoucherDraft {
  return {
    id: newVoucherDraftId(),
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
  const seenIds = new Set<string>();
  return list.map((v) => {
    let id = typeof v.id === 'string' && v.id.length >= 8 ? v.id : newVoucherDraftId();
    if (seenIds.has(id)) id = newVoucherDraftId();
    seenIds.add(id);
    return {
    id,
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
  };
  });
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
  if (drafts.length > MAX_EVENT_VOUCHERS) {
    return `Máximo de ${MAX_EVENT_VOUCHERS} vouchers por evento. Remova algum antes de adicionar outro.`;
  }
  const codes = new Set<string>();
  const ids = new Set<string>();
  for (let i = 0; i < drafts.length; i += 1) {
    const d = drafts[i];
    if (!d.id?.trim() || d.id.length < 8) {
      return `Voucher ${i + 1}: identificador interno inválido. Remova e adicione o voucher novamente.`;
    }
    if (ids.has(d.id)) {
      return `Voucher ${i + 1}: identificador duplicado. Remova um dos vouchers repetidos e adicione de novo.`;
    }
    ids.add(d.id);

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
    const discountValue =
      d.discountType === 'percent'
        ? Math.round(Number(discountValueRaw))
        : Number(discountValueRaw);
    const maxUses = parseMaxUsesInput(d.maxUses);
    const expiresAt = d.expiresAt.trim() || undefined;
    const label = d.label.trim() || undefined;
    const usedCount = Math.max(0, Math.floor(Number(prev?.usedCount ?? 0)));
    const entry: EventVoucher = {
      id: d.id.trim(),
      code,
      discountType: d.discountType,
      discountValue,
      active: d.active !== false,
    };
    if (label) entry.label = label;
    if (maxUses != null) entry.maxUses = maxUses;
    if (usedCount > 0) entry.usedCount = usedCount;
    if (expiresAt) entry.expiresAt = expiresAt;
    return entry;
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
