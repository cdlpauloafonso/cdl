import type { EventInscriptionPaymentStatus } from './firestore';

/** Valor abaixo disso = inscrição gratuita (voucher 100% ou desconto total). */
export const GRATIS_PAYMENT_AMOUNT_THRESHOLD = 0.01;

export function isGratisPaymentAmount(amount: number): boolean {
  return !Number.isFinite(amount) || amount < GRATIS_PAYMENT_AMOUNT_THRESHOLD;
}

export function isInscriptionPaymentGratisStatus(
  status: EventInscriptionPaymentStatus | string | undefined,
): boolean {
  return status === 'gratis';
}

/** Pago ou gratuito — libera check-in, QR e credenciamento. */
export function isInscriptionPaymentConfirmed(
  status: EventInscriptionPaymentStatus | string | undefined,
): boolean {
  return status === 'paid' || status === 'gratis';
}
