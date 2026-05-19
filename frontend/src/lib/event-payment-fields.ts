import type { Campaign, CampaignPaymentProvider } from './firestore';

export type EffectivePayment =
  | { kind: 'none' }
  | { kind: 'pix'; imageUrl?: string; copyPaste?: string; observationText?: string }
  | { kind: 'asaas'; amount: number; description?: string };

function resolvePaymentProvider(c: Pick<Campaign, 'paymentConfig'>): CampaignPaymentProvider {
  const p = c.paymentConfig;
  if (!p) return 'manual_pix';
  if (p.provider === 'asaas' || p.provider === 'manual_pix') return p.provider;
  if (typeof p.amount === 'number' && p.amount > 0) return 'asaas';
  return 'manual_pix';
}

/** Pagamento configurado para o evento (inscrição pública). */
export function getEffectivePayment(c: Pick<Campaign, 'paymentConfig'>): EffectivePayment {
  const p = c.paymentConfig;
  if (!p) return { kind: 'none' };

  const provider = resolvePaymentProvider(c);

  if (provider === 'asaas') {
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { kind: 'none' };
    const description = p.description?.trim();
    return {
      kind: 'asaas',
      amount,
      ...(description ? { description } : {}),
    };
  }

  const imageUrl = p.pixImageUrl?.trim();
  const copyPaste = p.pixCopyPaste?.trim();
  const observationText = p.pixObservationText?.trim();
  if (!imageUrl && !copyPaste) return { kind: 'none' };
  return {
    kind: 'pix',
    imageUrl: imageUrl || undefined,
    copyPaste: copyPaste || undefined,
    observationText: observationText || undefined,
  };
}

export function formatPaymentAmountBrl(amount: number): string {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
