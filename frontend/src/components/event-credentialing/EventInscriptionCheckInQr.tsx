'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildCredentialingQrPayload } from '@/lib/event-credentialing-qr';
import { downloadCheckInQrPdf } from '@/lib/check-in-qr-pdf';
import { formatInscritoNameUppercase } from '@/lib/event-registration-fields';
import { scrollViewportToTopAfterPaint } from '@/lib/scroll-viewport-top';

/** Azul CDL — distingue o QR de check-in do QR PIX (geralmente preto). */
const CHECK_IN_QR_FG = '#1E3A8A';
const CHECK_IN_QR_BG = '#FFFFFF';
const PRINT_BODY_CLASS = 'printing-checkin-qr';

const CREDENTIALING_INSTRUCTIONS = [
  'Apresente este QR Code no ato do credenciamento, na entrada do evento.',
  'Mantenha o brilho da tela no máximo ou imprima/baixe o PDF para facilitar a leitura pelo credenciador.',
  'Este código é pessoal e intransferível — não compartilhe com outras pessoas.',
] as const;

type EventInscriptionCheckInQrProps = {
  eventId: string;
  inscriptionId: string;
  participantLabel?: string;
  eventTitle?: string;
  className?: string;
  /** Exibe botões de imprimir e baixar PDF (padrão: sim). */
  showActions?: boolean;
};

export function EventInscriptionCheckInQr({
  eventId,
  inscriptionId,
  participantLabel,
  eventTitle,
  className = '',
  showActions = true,
}: EventInscriptionCheckInQrProps) {
  const value = buildCredentialingQrPayload(eventId, inscriptionId);
  const participantDisplay = useMemo(
    () => formatInscritoNameUppercase(participantLabel),
    [participantLabel],
  );
  const printHostId = useId().replace(/:/g, '');
  const topAnchorRef = useRef<HTMLDivElement>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    scrollViewportToTopAfterPaint(topAnchorRef.current);
  }, []);

  const handlePrint = useCallback(() => {
    document.body.classList.add(PRINT_BODY_CLASS);
    window.print();
  }, []);

  useEffect(() => {
    const onAfterPrint = () => document.body.classList.remove(PRINT_BODY_CLASS);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('afterprint', onAfterPrint);
      document.body.classList.remove(PRINT_BODY_CLASS);
    };
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const svg = qrWrapRef.current?.querySelector('svg');
    if (!svg || !(svg instanceof SVGSVGElement)) {
      alert('Não foi possível gerar o PDF. Tente novamente.');
      return;
    }
    setDownloadingPdf(true);
    try {
      const ok = await downloadCheckInQrPdf({
        eventTitle,
        participantLabel: participantDisplay || participantLabel,
        qrSvg: svg,
      });
      if (!ok) {
        alert('Não foi possível gerar o PDF. Tente novamente.');
      }
    } finally {
      setDownloadingPdf(false);
    }
  }, [eventTitle, participantDisplay, participantLabel]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body.${PRINT_BODY_CLASS} * {
            visibility: hidden !important;
          }
          body.${PRINT_BODY_CLASS} #${printHostId},
          body.${PRINT_BODY_CLASS} #${printHostId} * {
            visibility: visible !important;
          }
          body.${PRINT_BODY_CLASS} #${printHostId} {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 !important;
            padding: 12mm !important;
            background: white !important;
            z-index: 99999 !important;
          }
          body.${PRINT_BODY_CLASS} .checkin-qr-no-print {
            display: none !important;
          }
          @page {
            size: auto;
            margin: 10mm;
          }
        }
      `,
        }}
      />

      <div className={`rounded-xl border border-gray-200 bg-white p-4 text-center ${className}`.trim()}>
        <div ref={topAnchorRef} data-inscription-screen-top className="h-0 w-0" aria-hidden />
        <div id={printHostId} className="checkin-qr-print-area">
          <p className="text-sm font-medium text-gray-900">QR Code de check-in</p>
          {eventTitle ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-cdl-blue">{eventTitle}</p>
          ) : null}

          <div
            className="mt-4 rounded-lg border border-cdl-blue/20 bg-cdl-blue/5 px-3 py-3 text-left checkin-qr-no-print sm:px-4"
            role="note"
            aria-label="Instruções para o credenciamento"
          >
            <p className="text-xs font-semibold text-cdl-blue">Instruções para o credenciamento</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-cdl-gray-text">
              {CREDENTIALING_INSTRUCTIONS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div
            className="mt-4 rounded-lg border border-cdl-blue/20 bg-cdl-blue/5 px-3 py-3 text-left hidden print:block"
            aria-hidden
          >
            <p className="text-[10pt] font-semibold text-gray-900">Instruções para o credenciamento</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[9pt] leading-snug text-gray-700">
              {CREDENTIALING_INSTRUCTIONS.map((line) => (
                <li key={`print-${line}`}>{line}</li>
              ))}
            </ul>
          </div>

          {participantDisplay ? (
            <p className="mt-3 text-sm font-semibold tracking-wide text-gray-900">{participantDisplay}</p>
          ) : null}
          <div
            ref={qrWrapRef}
            className="mx-auto mt-4 inline-flex rounded-lg border border-cdl-blue/25 bg-white p-3 shadow-sm"
          >
            <QRCodeSVG
              value={value}
              size={200}
              level="M"
              includeMargin
              fgColor={CHECK_IN_QR_FG}
              bgColor={CHECK_IN_QR_BG}
            />
          </div>
        </div>

        {showActions ? (
          <div className="checkin-qr-no-print mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={downloadingPdf}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              <svg className="h-4 w-4 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {downloadingPdf ? 'Gerando PDF…' : 'Baixar PDF'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-cdl-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-cdl-blue-dark"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Imprimir
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
