'use client';

import { useCallback, useEffect, useId } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { EventInscriptionRecord } from '@/lib/firestore';
import { buildCredentialingQrPayload } from '@/lib/event-credentialing-qr';
import {
  inscriptionEtiquetaCompanyName,
  inscriptionEtiquetaParticipantName,
} from '@/lib/event-registration-fields';
import { formatEtiquetaEventTitle } from '@/lib/inscription-etiqueta-layout';

const PRINT_BODY_CLASS = 'printing-inscription-etiqueta';

type EventInscriptionEtiquetaSheetProps = {
  eventId: string;
  inscriptionId: string;
  fields: Record<string, string> | undefined;
  eventTitle?: string;
  /** Prefixo de id para evitar colisão quando várias etiquetas no DOM. */
  idPrefix?: string;
};

export function EventInscriptionEtiquetaSheet({
  eventId,
  inscriptionId,
  fields,
  eventTitle,
  idPrefix = 'etiqueta',
}: EventInscriptionEtiquetaSheetProps) {
  const participantName = inscriptionEtiquetaParticipantName(fields);
  const companyName = inscriptionEtiquetaCompanyName(fields);
  const eventTitleLabel = formatEtiquetaEventTitle(eventTitle);
  const qrValue = buildCredentialingQrPayload(eventId, inscriptionId);

  return (
    <div
      id={`${idPrefix}-print-area`}
      className="inscription-etiqueta-sheet mx-auto flex w-[90mm] max-w-full items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 print:m-0 print:w-[86mm] print:max-w-none print:border print:border-gray-400 print:shadow-none"
    >
      <div className="min-w-0 flex-1">
        {eventTitleLabel ? (
          <p
            className="mb-1 truncate text-[9px] font-semibold tracking-wide text-gray-500 print:text-[8px]"
            title={eventTitleLabel}
          >
            {eventTitleLabel}
          </p>
        ) : null}
        <p className="text-sm font-bold leading-tight text-gray-900 print:text-[13pt]">{participantName}</p>
        {companyName ? (
          <p className="mt-1 text-xs font-medium leading-snug text-gray-700 print:text-[10pt]">{companyName}</p>
        ) : null}
      </div>
      <div className="shrink-0 rounded border border-gray-200 bg-white p-1 print:border-gray-300">
        <QRCodeSVG value={qrValue} size={72} level="M" includeMargin={false} />
      </div>
    </div>
  );
}

export type EventInscriptionEtiquetaModalProps = {
  open: boolean;
  onClose: () => void;
  eventId: string;
  row: (EventInscriptionRecord & { id: string }) | null;
  eventTitle?: string;
};

export function EventInscriptionEtiquetaModal({
  open,
  onClose,
  eventId,
  row,
  eventTitle,
}: EventInscriptionEtiquetaModalProps) {
  const titleId = useId();

  const handlePrint = useCallback(() => {
    document.body.classList.add(PRINT_BODY_CLASS);
    window.print();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onAfterPrint = () => document.body.classList.remove(PRINT_BODY_CLASS);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('afterprint', onAfterPrint);
      document.body.classList.remove(PRINT_BODY_CLASS);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !row) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body.${PRINT_BODY_CLASS} * {
            visibility: hidden !important;
          }
          body.${PRINT_BODY_CLASS} #inscription-etiqueta-print-host,
          body.${PRINT_BODY_CLASS} #inscription-etiqueta-print-host * {
            visibility: visible !important;
          }
          body.${PRINT_BODY_CLASS} #inscription-etiqueta-print-host {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: white !important;
            z-index: 99999 !important;
          }
          @page {
            size: auto;
            margin: 8mm;
          }
        }
      `,
        }}
      />

      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center print:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 id={titleId} className="text-lg font-bold text-gray-900">
              Etiqueta do inscrito
            </h2>
            <p className="mt-1 text-sm text-cdl-gray-text">
              Confira o layout e imprima para colar no crachá ou credencial.
            </p>
          </div>

          <div className="px-5 py-5">
            <div id="inscription-etiqueta-print-host">
              <EventInscriptionEtiquetaSheet
                eventId={eventId}
                inscriptionId={row.id}
                fields={row.fields}
                eventTitle={eventTitle}
                idPrefix="modal-etiqueta"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-cdl-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-cdl-blue-dark"
            >
              Imprimir etiqueta
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function InscriptionEtiquetaButton({
  onClick,
  className = '',
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Imprimir etiqueta com nome e QR Code"
      className={`inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 ${className}`.trim()}
    >
      <svg className="h-3.5 w-3.5 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
      Etiqueta
    </button>
  );
}
