export type EventVoucherDoc = {
  id: string;
  code: string;
  label?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxUses?: number;
  usedCount?: number;
  active?: boolean;
  expiresAt?: string;
};

export function normalizeVoucherCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9_-]/g, '');
}

export function findEventVoucherByCode(
  vouchers: EventVoucherDoc[] | undefined,
  codeRaw: string,
): EventVoucherDoc | null {
  if (!vouchers?.length) return null;
  const code = normalizeVoucherCode(codeRaw);
  if (!code) return null;
  return vouchers.find((v) => v.active !== false && normalizeVoucherCode(v.code) === code) ?? null;
}

export function isEventVoucherUsable(v: EventVoucherDoc, now = new Date()): string | null {
  if (v.active === false) return 'VOUCHER_INACTIVE';
  if (v.expiresAt) {
    const end = new Date(`${v.expiresAt}T23:59:59`);
    if (now > end) return 'VOUCHER_EXPIRED';
  }
  const used = v.usedCount ?? 0;
  if (v.maxUses != null && v.maxUses > 0 && used >= v.maxUses) {
    return 'VOUCHER_EXHAUSTED';
  }
  return null;
}

export function applyEventVoucherDiscount(baseAmount: number, voucher: EventVoucherDoc): number {
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
  vouchers: EventVoucherDoc[] | undefined,
  codeRaw: string,
  baseAmount: number,
): { ok: true; voucher: EventVoucherDoc; amount: number } | { ok: false; error: string } {
  const voucher = findEventVoucherByCode(vouchers, codeRaw);
  if (!voucher) return { ok: false, error: 'VOUCHER_INVALID' };
  const unusable = isEventVoucherUsable(voucher);
  if (unusable) return { ok: false, error: unusable };
  return {
    ok: true,
    voucher,
    amount: applyEventVoucherDiscount(baseAmount, voucher),
  };
}
