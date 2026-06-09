import {
  inscriptionEtiquetaCompanyName,
  inscriptionEtiquetaParticipantName,
} from '@/lib/event-registration-fields';
import { buildCredentialingQrPayload } from '@/lib/event-credentialing-qr';
import {
  bulkEtiquetaQrSizeMm,
  bulkEtiquetaTextAreaWidthMm,
  drawInscriptionEtiqueta,
  fitEtiquetaInBox,
} from '@/lib/inscription-etiqueta-layout';
import { createEtiquetaEventTitleImage } from '@/lib/inscription-etiqueta-title-image';
import {
  PIMACO_6182,
  pimaco6182ContentArea,
  pimaco6182LabelOrigin,
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

function qrPngDataUrl(payload: string, qrSizeMm: number): Promise<string> {
  const sizePx = Math.max(160, Math.round((qrSizeMm / 25.4) * 300));
  return import('qrcode').then((mod) =>
    mod.default.toDataURL(payload, {
      width: sizePx,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    }),
  );
}

/**
 * PDF A4: 14 etiquetas/folha (2×7), célula 99,1×38,1 mm, conteúdo em 80 mm sem bordas.
 */
export async function downloadInscriptionEtiquetasBulkPdf(
  options: InscriptionEtiquetasBulkPdfOptions,
): Promise<boolean> {
  const { eventId, eventTitle, items, fileName } = options;
  if (!eventId.trim() || items.length === 0) return false;

  try {
    const qrSizeMm = bulkEtiquetaQrSizeMm(PIMACO_6182.labelHeightMm);
    const textAreaWidthMm = bulkEtiquetaTextAreaWidthMm(
      PIMACO_6182.contentWidthMm,
      PIMACO_6182.labelHeightMm,
    );

    const qrById = new Map<string, string>();
    await Promise.all(
      items.map(async (item) => {
        const payload = buildCredentialingQrPayload(eventId, item.inscriptionId);
        qrById.set(item.inscriptionId, await qrPngDataUrl(payload, qrSizeMm));
      }),
    );

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    });

    const getTitleImage = (drawWidthMm: number) =>
      createEtiquetaEventTitleImage(eventTitle, drawWidthMm, textAreaWidthMm);

    let slot = 0;

    for (const item of items) {
      const qrDataUrl = qrById.get(item.inscriptionId);
      if (!qrDataUrl) continue;

      if (slot > 0 && slot % PIMACO_6182.labelsPerSheet === 0) {
        doc.addPage('a4', 'portrait');
      }

      const indexOnSheet = slot % PIMACO_6182.labelsPerSheet;
      const col = indexOnSheet % PIMACO_6182.cols;
      const row = Math.floor(indexOnSheet / PIMACO_6182.cols);
      const { x: labelX, y: labelY } = pimaco6182LabelOrigin(col, row);
      const content = pimaco6182ContentArea(labelX, labelY);

      const { drawWidthMm, drawOpts } = fitEtiquetaInBox(
        doc,
        content.widthMm,
        content.heightMm,
        getTitleImage,
        {
          participantName: inscriptionEtiquetaParticipantName(item.fields),
          companyName: inscriptionEtiquetaCompanyName(item.fields) ?? '',
          qrDataUrl,
        },
        'bulkPdf',
      );

      drawInscriptionEtiqueta(doc, content.x, content.y, drawWidthMm, drawOpts);

      slot += 1;
    }

    const safeTitle =
      (eventTitle ?? 'evento').replace(/[^\w\u00C0-\u024f\s-]+/gi, '').trim().slice(0, 36) || 'evento';
    doc.save(fileName ?? `etiquetas-${safeTitle.replace(/\s+/g, '-')}-${items.length}.pdf`);
    return true;
  } catch {
    return false;
  }
}
