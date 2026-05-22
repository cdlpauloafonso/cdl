import {
  inscriptionEtiquetaCompanyName,
  inscriptionEtiquetaParticipantName,
} from '@/lib/event-registration-fields';
import { buildCredentialingQrPayload } from '@/lib/event-credentialing-qr';

const CHECK_IN_QR_DARK = '#1E3A8A';

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
const LABEL_H_MM = 30;

async function qrPngDataUrl(payload: string, px = 180): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(payload, {
    width: px,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: CHECK_IN_QR_DARK, light: '#FFFFFF' },
  });
}

function drawLabel(
  doc: import('jspdf').jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    eventTitle?: string;
    participantName: string;
    companyName: string;
    qrDataUrl: string;
  },
): void {
  const pad = 2;
  const qrMm = 20;
  const textW = w - pad * 2 - qrMm - 1.5;
  const textX = x + pad;
  const textY = y + pad + 3.5;
  const qrX = x + w - pad - qrMm;
  const qrY = y + (h - qrMm) / 2;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);

  let lineY = textY;

  if (opts.eventTitle?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    const titleLines = (doc.splitTextToSize(opts.eventTitle.trim().toUpperCase(), textW) as string[]).slice(
      0,
      1,
    );
    doc.text(titleLines[0] ?? '', textX, lineY);
    lineY += 3.2;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const nameLines = (doc.splitTextToSize(opts.participantName || 'Participante', textW) as string[]).slice(0, 2);
  nameLines.forEach((line) => {
    doc.text(line, textX, lineY);
    lineY += 4.2;
  });

  if (opts.companyName.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const companyLines = (doc.splitTextToSize(opts.companyName.trim(), textW) as string[]).slice(0, 2);
    companyLines.forEach((line) => {
      doc.text(line, textX, lineY);
      lineY += 3.6;
    });
  }

  doc.addImage(opts.qrDataUrl, 'PNG', qrX, qrY, qrMm, qrMm);
}

/** PDF A4 retrato: etiquetas 3 por linha (nome, empresa e QR de credenciamento). */
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

    let col = 0;
    let x = MARGIN_MM;
    let y = MARGIN_MM;

    const placeNextRow = () => {
      col = 0;
      x = MARGIN_MM;
      y += LABEL_H_MM + GAP_MM;
    };

    items.forEach((item, index) => {
      if (y + LABEL_H_MM > pageH - MARGIN_MM) {
        doc.addPage();
        y = MARGIN_MM;
        col = 0;
        x = MARGIN_MM;
      }

      const qrDataUrl = qrById.get(item.inscriptionId);
      if (!qrDataUrl) return;

      drawLabel(doc, x, y, labelW, LABEL_H_MM, {
        eventTitle,
        participantName: inscriptionEtiquetaParticipantName(item.fields),
        companyName: inscriptionEtiquetaCompanyName(item.fields) ?? '',
        qrDataUrl,
      });

      col += 1;
      if (col >= COLS) {
        placeNextRow();
      } else {
        x += labelW + GAP_MM;
      }
    });

    const safeTitle =
      (eventTitle ?? 'evento').replace(/[^\w\u00C0-\u024f\s-]+/gi, '').trim().slice(0, 36) || 'evento';
    doc.save(fileName ?? `etiquetas-${safeTitle.replace(/\s+/g, '-')}-${items.length}.pdf`);
    return true;
  } catch {
    return false;
  }
}
