import type { EventVoucher } from './firestore';
import { normalizeVoucherCodeInput } from './event-vouchers-admin';

export type AppliedEventVoucher = {
  voucher: EventVoucher;
  amountBefore: number;
  amountAfter: number;
};

export function findEventVoucherByCode(
  vouchers: EventVoucher[] | undefined,
  codeRaw: string
): EventVoucher | null {
  if (!vouchers?.length) return null;
  const code = normalizeVoucherCodeInput(codeRaw);
  if (!code) return null;
  return vouchers.find((v) => v.active !== false && normalizeVoucherCodeInput(v.code) === code) ?? null;
}

export function isEventVoucherUsable(v: EventVoucher, now = new Date()): string | null {
  if (v.active === false) return 'Este voucher está inativo.';
  if (v.expiresAt) {
    const end = new Date(`${v.expiresAt}T23:59:59`);
    if (now > end) return 'Este voucher expirou.';
  }
  const used = v.usedCount ?? 0;
  if (v.maxUses != null && v.maxUses > 0 && used >= v.maxUses) {
    return 'Este voucher atingiu o limite de utilizações.';
  }
  return null;
}

export function applyEventVoucherDiscount(baseAmount: number, voucher: EventVoucher): number {
  const base = Math.round(baseAmount * 100) / 100;
  if (base <= 0) return base;
  let discounted =
    voucher.discountType === 'percent'
      ? base * (1 - Math.min(100, Math.max(0, voucher.discountValue)) / 100)
      : base - voucher.discountValue;
  discounted = Math.round(discounted * 100) / 100;
  if (discounted < 0) return 0;
  return discounted;
}

export function resolveVoucherForCharge(
  vouchers: EventVoucher[] | undefined,
  codeRaw: string,
  baseAmount: number
): { ok: true; applied: AppliedEventVoucher } | { ok: false; error: string } {
  const voucher = findEventVoucherByCode(vouchers, codeRaw);
  if (!voucher) return { ok: false, error: 'Código de voucher inválido.' };
  const unusable = isEventVoucherUsable(voucher);
  if (unusable) return { ok: false, error: unusable };
  const amountAfter = applyEventVoucherDiscount(baseAmount, voucher);
  return {
    ok: true,
    applied: { voucher, amountBefore: baseAmount, amountAfter },
  };
}
