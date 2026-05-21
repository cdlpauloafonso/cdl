import type { EventInscriptionPaymentStatus, EventInscriptionRecord } from './firestore';

export function normalizeInscriptionPaymentStatus(
  row: Pick<EventInscriptionRecord, 'paymentStatus'>,
): EventInscriptionPaymentStatus {
  const s = row.paymentStatus;
  if (s === 'paid' || s === 'cancelled' || s === 'expired' || s === 'pending') return s;
  return 'pending';
}

export function paymentStatusLabel(status: EventInscriptionPaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'Pago';
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

export function isAsaasManagedInscription(row: EventInscriptionRecord): boolean {
  return row.paymentProvider === 'asaas' || Boolean(row.asaasPaymentId);
}

export function paymentStatusBadgeClass(status: EventInscriptionPaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 ring-green-200/80';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700 ring-gray-200/80';
    case 'expired':
      return 'bg-red-50 text-red-800 ring-red-200/60';
    default:
      return 'bg-amber-50 text-amber-900 ring-amber-200/60';
  }
}
