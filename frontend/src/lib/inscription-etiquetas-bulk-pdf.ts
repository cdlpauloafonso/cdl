import {
  inscriptionEtiquetaCompanyName,
  inscriptionEtiquetaParticipantName,
} from '@/lib/event-registration-fields';
import { buildCredentialingQrPayload } from '@/lib/event-credentialing-qr';
import {
  drawInscriptionEtiqueta,
  etiquetaTextAreaWidthMm,
  fitEtiquetaInBox,
} from '@/lib/inscription-etiqueta-layout';
import { createEtiquetaEventTitleImage } from '@/lib/inscription-etiqueta-title-image';
import {
  PIMACO_6182,
  pimaco6182LabelOrigin,
  pimaco6182SafeArea,
} from '@/lib/pimaco-6182-sheet';

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

/**
 * PDF Pimaco 6182 (Carta): 14 etiquetas/folha (2×7), 101,6×33,9 mm cada.
 * Visual idêntico à etiqueta do inscrito, com escala uniforme na célula.
 */
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
    const doc = new jsPDF({
      unit: 'mm',
      format: 'letter',
      orientation: 'portrait',
      compress: true,
    });

    const getTitleImage = (drawWidthMm: number) =>
      createEtiquetaEventTitleImage(eventTitle, drawWidthMm, etiquetaTextAreaWidthMm(drawWidthMm));

    let slot = 0;

    for (const item of items) {
      const qrDataUrl = qrById.get(item.inscriptionId);
      if (!qrDataUrl) continue;

      if (slot > 0 && slot % PIMACO_6182.labelsPerSheet === 0) {
        doc.addPage('letter', 'portrait');
      }

      const indexOnSheet = slot % PIMACO_6182.labelsPerSheet;
      const col = indexOnSheet % PIMACO_6182.cols;
      const row = Math.floor(indexOnSheet / PIMACO_6182.cols);
      const { x: labelX, y: labelY } = pimaco6182LabelOrigin(col, row);
      const safe = pimaco6182SafeArea(labelX, labelY);

      const { drawWidthMm, drawHeightMm, drawOpts } = fitEtiquetaInBox(
        doc,
        safe.widthMm,
        safe.heightMm,
        getTitleImage,
        {
          participantName: inscriptionEtiquetaParticipantName(item.fields),
          companyName: inscriptionEtiquetaCompanyName(item.fields) ?? '',
          qrDataUrl,
        },
      );

      const drawX = safe.x + (safe.widthMm - drawWidthMm) / 2;
      const drawY = safe.y + (safe.heightMm - drawHeightMm) / 2;
      drawInscriptionEtiqueta(doc, drawX, drawY, drawWidthMm, drawOpts);

      slot += 1;
    }

    const safeTitle =
      (eventTitle ?? 'evento').replace(/[^\w\u00C0-\u024f\s-]+/gi, '').trim().slice(0, 36) || 'evento';
    doc.save(fileName ?? `etiquetas-pimaco6182-${safeTitle.replace(/\s+/g, '-')}-${items.length}.pdf`);
    return true;
  } catch {
    return false;
  }
}
