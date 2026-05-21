'use client';

import { QRCodeSVG } from 'qrcode.react';
import { buildCredentialingQrPayload } from '@/lib/event-credentialing-qr';

type EventInscriptionCheckInQrProps = {
  eventId: string;
  inscriptionId: string;
  participantLabel?: string;
  className?: string;
};

export function EventInscriptionCheckInQr({
  eventId,
  inscriptionId,
  participantLabel,
  className = '',
}: EventInscriptionCheckInQrProps) {
  const value = buildCredentialingQrPayload(eventId, inscriptionId);

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 text-center ${className}`.trim()}>
      <p className="text-sm font-medium text-gray-900">QR Code de check-in</p>
      <p className="mt-1 text-xs text-cdl-gray-text">
        Apresente este código na entrada do evento para validar seu check-in.
      </p>
      {participantLabel ? (
        <p className="mt-2 text-sm font-medium text-gray-800">{participantLabel}</p>
      ) : null}
      <div className="mx-auto mt-4 inline-flex rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
        <QRCodeSVG value={value} size={200} level="M" includeMargin />
      </div>
    </div>
  );
}
