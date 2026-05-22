import type { EffectivePayment } from './event-payment-fields';
import type { EventInscriptionPaymentStatus, EventInscriptionRecord } from './firestore';
import {
  isInscriptionPaymentConfirmed as isConfirmedStatus,
  isInscriptionPaymentGratisStatus,
} from './inscription-payment-gratis';

export function normalizeInscriptionPaymentStatus(
  row: Pick<EventInscriptionRecord, 'paymentStatus'>,
): EventInscriptionPaymentStatus {
  const s = row.paymentStatus;
  if (
    s === 'paid' ||
    s === 'gratis' ||
    s === 'cancelled' ||
    s === 'expired' ||
    s === 'pending'
  ) {
    return s;
  }
  return 'pending';
}

export function paymentStatusLabel(status: EventInscriptionPaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'Pago';
    case 'gratis':
      return 'Grátis';
    case 'pending':
      return 'Pendente';
    case 'cancelled':
      return 'Cancelado';
    case 'expired':
      return 'Vencido';
    default:
      return 'Pendente';
  }
}

export function isInscriptionPaymentConfirmed(
  row: Pick<EventInscriptionRecord, 'paymentStatus'>,
): boolean {
  return isConfirmedStatus(normalizeInscriptionPaymentStatus(row));
}

export { isInscriptionPaymentGratisStatus };

export function isAsaasManagedInscription(row: EventInscriptionRecord): boolean {
  if (isInscriptionPaymentGratisStatus(row.paymentStatus)) return false;
  return row.paymentProvider === 'asaas' || Boolean(row.asaasPaymentId);
}

/** Evento com cobrança configurada e inscrição ainda sem confirmação de pagamento. */
export function isInscriptionPaymentPending(
  row: Pick<EventInscriptionRecord, 'paymentStatus'>,
  payment: EffectivePayment,
): boolean {
  if (payment.kind === 'none') return false;
  if (payment.kind === 'pix') return false;
  return !isInscriptionPaymentConfirmed(row);
}

export function paymentStatusBadgeClass(status: EventInscriptionPaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 ring-green-200/80';
    case 'gratis':
      return 'bg-teal-100 text-teal-900 ring-teal-200/80';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700 ring-gray-200/80';
    case 'expired':
      return 'bg-red-50 text-red-800 ring-red-200/60';
    default:
      return 'bg-amber-50 text-amber-900 ring-amber-200/60';
  }
}
