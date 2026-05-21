import type { CampaignPaymentConfig } from './firestore';
import type { EffectivePayment } from './event-payment-fields';

export type InscriptionPaymentTier = 'normal' | 'associado';

/** Valor de associado configurado e válido. */
export function hasAssociadoPaymentAmount(cfg?: CampaignPaymentConfig | null): boolean {
  const n = Number(cfg?.amountAssociado);
  return Number.isFinite(n) && n > 0;
}

/** Resolve valor exibido/cobrado no cliente (após checagem de CNPJ na base de associados). */
export function resolveInscriptionChargeAmount(
  payment: Extract<EffectivePayment, { kind: 'asaas' }>,
  isAssociadoCnpj: boolean,
): { amount: number; tier: InscriptionPaymentTier } {
  if (
    isAssociadoCnpj &&
    payment.amountAssociado != null &&
    payment.amountAssociado > 0
  ) {
    return { amount: payment.amountAssociado, tier: 'associado' };
  }
  return { amount: payment.amountNormal, tier: 'normal' };
}
