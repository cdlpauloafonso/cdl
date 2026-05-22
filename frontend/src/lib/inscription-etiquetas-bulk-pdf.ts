import {
  inscriptionEtiquetaCompanyName,
  inscriptionEtiquetaParticipantName,
} from '@/lib/event-registration-fields';
import { buildCredentialingQrPayload } from '@/lib/event-credentialing-qr';
import {
  drawInscriptionEtiqueta,
  etiquetaHeightMm,
  etiquetaTextAreaWidthMm,
} from '@/lib/inscription-etiqueta-layout';
import { createEtiquetaEventTitleImage } from '@/lib/inscription-etiqueta-title-image';

export type InscriptionEtiquetaPdfItem = {
  inscriptionId: string;
  fields: Record<string, string> | undefined;
};

export type InscriptionEtiquetasBulkPdfOptions = {
  eventId: string;
  eventTitle?: string;
  items: InscriptionEtiquetaPdfItem[];
  fileName?: string;
};

const COLS = 3;
const MARGIN_MM = 10;
const GAP_MM = 4;

/** QR preto, igual ao `QRCodeSVG` da etiqueta individual (sem fgColor azul). */
async function qrPngDataUrl(payload: string): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(payload, {
    width: 72,
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

/** PDF A4: 3 etiquetas por linha, layout idêntico à etiqueta do inscrito (escala proporcional). */
export async function downloadInscriptionEtiquetasBulkPdf(
  options: InscriptionEtiquetasBulkPdfOptions,
): Promise<boolean> {
  const { eventId, eventTitle, items, fileName } = options;
  if (!eventId.trim() || items.length === 0) return false;

  try {
    const qrById = new Map<string, string>();
    await Promise.all(
      items.map(async (item) => {
        const payload = buildCredentialingQrPayload(eventId, item.inscriptionId);
        qrById.set(item.inscriptionId, await qrPngDataUrl(payload));
      }),
    );

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const usableW = pageW - MARGIN_MM * 2;
    const labelW = (usableW - GAP_MM * (COLS - 1)) / COLS;
    const eventTitleImage = createEtiquetaEventTitleImage(
      eventTitle,
      labelW,
      etiquetaTextAreaWidthMm(labelW),
    );

    let col = 0;
    let x = MARGIN_MM;
    let y = MARGIN_MM;
    let rowMaxH = 0;

    const advanceRow = () => {
      y += rowMaxH + GAP_MM;
      rowMaxH = 0;
      col = 0;
      x = MARGIN_MM;
    };

    for (const item of items) {
      const qrDataUrl = qrById.get(item.inscriptionId);
      if (!qrDataUrl) continue;

      const drawOpts = {
        eventTitleImage,
        participantName: inscriptionEtiquetaParticipantName(item.fields),
        companyName: inscriptionEtiquetaCompanyName(item.fields) ?? '',
        qrDataUrl,
      };

      const labelH = etiquetaHeightMm(doc, labelW, drawOpts);

      if (col === 0 && y + labelH > pageH - MARGIN_MM) {
        doc.addPage();
        y = MARGIN_MM;
        rowMaxH = 0;
      }

      drawInscriptionEtiqueta(doc, x, y, labelW, drawOpts);
      rowMaxH = Math.max(rowMaxH, labelH);

      col += 1;
      if (col >= COLS) {
        advanceRow();
      } else {
        x += labelW + GAP_MM;
      }
    }

    const safeTitle =
      (eventTitle ?? 'evento').replace(/[^\w\u00C0-\u024f\s-]+/gi, '').trim().slice(0, 36) || 'evento';
    doc.save(fileName ?? `etiquetas-${safeTitle.replace(/\s+/g, '-')}-${items.length}.pdf`);
    return true;
  } catch {
    return false;
  }
}
