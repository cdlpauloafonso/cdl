'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Campaign, EventInscriptionRecord } from '@/lib/firestore';
import { subscribeEventInscription } from '@/lib/firestore';
import { getEffectivePayment } from '@/lib/event-payment-fields';
import {
  isInscriptionPaymentConfirmed,
  isInscriptionPaymentPending,
  normalizeInscriptionPaymentStatus,
  paymentStatusLabel,
} from '@/lib/inscription-payment-status';
import { isInscriptionCredentialed, formatCredentialedAt } from '@/lib/event-credentialing';
import {
  formatInscritoNameUppercase,
  inscriptionEtiquetaCompanyName,
  inscriptionEtiquetaParticipantName,
} from '@/lib/event-registration-fields';
import { EventInscriptionCheckInQr } from '@/components/event-credentialing/EventInscriptionCheckInQr';

export type EventExistingInscriptionCheckInProps = {
  campaignId: string;
  campanha: Campaign;
  row: EventInscriptionRecord & { id: string };
  paymentResumeHref: string;
  onOpenPaymentResume?: () => void;
};

export function EventExistingInscriptionCheckIn({
  campaignId,
  campanha,
  row: initialRow,
  paymentResumeHref,
  onOpenPaymentResume,
}: EventExistingInscriptionCheckInProps) {
  const [row, setRow] = useState(initialRow);

  useEffect(() => {
    setRow(initialRow);
  }, [initialRow]);

  useEffect(() => {
    const unsub = subscribeEventInscription(campaignId, initialRow.id, (fresh) => {
      if (fresh) setRow(fresh);
    });
    return () => unsub();
  }, [campaignId, initialRow.id]);

  const payment = getEffectivePayment(campanha);
  const paymentPending = isInscriptionPaymentPending(row, payment);
  const paymentConfirmed = isInscriptionPaymentConfirmed(row);
  const participantName = inscriptionEtiquetaParticipantName(row.fields);
  const participantNameDisplay = formatInscritoNameUppercase(participantName);
  const participantCompany = inscriptionEtiquetaCompanyName(row.fields);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center sm:text-left">
        <p className="text-sm font-semibold text-amber-950">CPF já inscrito neste evento</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">
          Este CPF já possui inscrição registrada. Não é possível criar uma nova inscrição — use os dados abaixo
          para check-in ou para concluir o pagamento, se ainda estiver pendente.
        </p>
      </div>

      <div className="px-2 py-2 text-center">
        <p className="text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl break-words">
          {participantNameDisplay}
        </p>
        {participantCompany ? (
          <p className="mt-2 text-base font-medium leading-snug text-cdl-gray-text break-words">
            {participantCompany}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-cdl-blue/25 bg-white p-4 shadow-sm sm:p-6">
        {paymentPending ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-950">Pagamento pendente</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-900">
                Sua inscrição ainda não teve o pagamento confirmado (
                {paymentStatusLabel(normalizeInscriptionPaymentStatus(row))}). Conclua o pagamento para liberar o
                QR Code de check-in na entrada do evento.
              </p>
              {onOpenPaymentResume ? (
                <button
                  type="button"
                  onClick={onOpenPaymentResume}
                  className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-cdl-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cdl-blue-dark"
                >
                  Ver opções de pagamento
                </button>
              ) : (
                <Link
                  href={paymentResumeHref}
                  prefetch={false}
                  className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-cdl-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cdl-blue-dark"
                >
                  Ver opções de pagamento
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isInscriptionCredentialed(row) ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Check-in já realizado
                {row.credentialedAt ? ` · ${formatCredentialedAt(row.credentialedAt)}` : ''}. Apresente o QR Code abaixo
                na entrada se solicitado.
              </p>
            ) : paymentConfirmed ? (
              <p className="text-sm text-cdl-gray-text">
                Apresente este QR Code na entrada do evento para validação do seu check-in.
              </p>
            ) : (
              <p className="text-sm text-cdl-gray-text">
                Sua inscrição está registrada. Apresente o QR Code abaixo na entrada do evento.
              </p>
            )}
            <EventInscriptionCheckInQr
              eventId={campaignId}
              inscriptionId={row.id}
              participantLabel={participantNameDisplay}
              eventTitle={campanha.title}
              className="border-cdl-blue/15 bg-slate-50/80"
            />
          </div>
        )}
      </div>
    </div>
  );
}
