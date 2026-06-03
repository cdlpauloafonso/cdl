import type { EtiquetaEventTitleImage } from '@/lib/inscription-etiqueta-title-image';

/**
 * Layout da etiqueta individual (`EventInscriptionEtiquetaSheet`), em mm.
 * Referência: impressão 86mm, px-3 py-2.5, gap-3, QR 72px preto.
 */
export const ETIQUETA_SHEET_PRINT_WIDTH_MM = 86;

const PADDING_X_MM = 3;
const PADDING_Y_MM = 2.5;
const GAP_MM = 3;
/** 72 CSS px @ 96dpi */
const QR_SIZE_MM = (72 / 96) * 25.4;
const QR_PAD_MM = 1;
const QR_BORDER_MM = 0.25;
const BORDER_RADIUS_MM = 1.5;

const FONT_NAME_PT = 13;
const FONT_COMPANY_PT = 10;

const COLOR_NAME: [number, number, number] = [17, 24, 39];
const COLOR_COMPANY: [number, number, number] = [55, 65, 81];
const COLOR_BORDER: [number, number, number] = [209, 213, 219];
const COLOR_QR_BORDER: [number, number, number] = [229, 231, 235];

/** Mesmo texto exibido na etiqueta web (`uppercase` + espaços normalizados). */
export function formatEtiquetaEventTitle(title: string | undefined): string {
  if (!title?.trim()) return '';
  return title.replace(/\s+/g, ' ').trim().toUpperCase();
}

/** Largura útil da coluna de texto (mm), proporcional à largura da etiqueta. */
export function etiquetaTextAreaWidthMm(labelWidthMm: number): number {
  const s = scaleFor(labelWidthMm);
  return textWidth(labelWidthMm, s);
}

function scaleFor(widthMm: number): number {
  return widthMm / ETIQUETA_SHEET_PRINT_WIDTH_MM;
}

function qrColumnWidth(scale: number): number {
  return (QR_SIZE_MM + 2 * QR_PAD_MM + 2 * QR_BORDER_MM) * scale;
}

function textWidth(widthMm: number, scale: number): number {
  return widthMm - 2 * PADDING_X_MM * scale - GAP_MM * scale - qrColumnWidth(scale);
}

type TextMetrics = {
  heightMm: number;
  nameLines: string[];
  companyLines: string[];
};

function measureText(
  doc: import('jspdf').jsPDF,
  widthMm: number,
  opts: {
    eventTitleImage?: EtiquetaEventTitleImage | null;
    participantName: string;
    companyName: string;
  },
): TextMetrics {
  const s = scaleFor(widthMm);
  const w = textWidth(widthMm, s);
  let heightMm = 0;

  if (opts.eventTitleImage) {
    heightMm += opts.eventTitleImage.textHeightMm + opts.eventTitleImage.marginBottomMm;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_NAME_PT * s);
  const nameLines = (doc.splitTextToSize(opts.participantName || 'Participante', w) as string[]).slice(0, 2);
  heightMm += nameLines.length * (4.6 * s);

  let companyLines: string[] = [];
  if (opts.companyName.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_COMPANY_PT * s);
    companyLines = (doc.splitTextToSize(opts.companyName.trim(), w) as string[]).slice(0, 2);
    heightMm += 1 * s + companyLines.length * (3.5 * s);
  }

  return { heightMm, nameLines, companyLines };
}

/** Altura da etiqueta para uma largura (mesma proporção do componente web). */
export function etiquetaHeightMm(
  doc: import('jspdf').jsPDF,
  widthMm: number,
  opts: {
    eventTitleImage?: EtiquetaEventTitleImage | null;
    participantName: string;
    companyName: string;
  },
): number {
  const s = scaleFor(widthMm);
  const metrics = measureText(doc, widthMm, opts);
  const innerH = Math.max(metrics.heightMm, qrColumnWidth(s));
  return innerH + 2 * PADDING_Y_MM * s;
}

export type EtiquetaDrawOptions = {
  eventTitleImage?: EtiquetaEventTitleImage | null;
  participantName: string;
  companyName: string;
  qrDataUrl: string;
};

/**
 * Escala uniforme da etiqueta para caber na área (mesmo visual, proporções ajustadas).
 */
export function fitEtiquetaInBox(
  doc: import('jspdf').jsPDF,
  boxWidthMm: number,
  boxHeightMm: number,
  getTitleImage: (drawWidthMm: number) => EtiquetaEventTitleImage | null,
  base: Pick<EtiquetaDrawOptions, 'participantName' | 'companyName' | 'qrDataUrl'>,
): { drawWidthMm: number; drawHeightMm: number; drawOpts: EtiquetaDrawOptions } {
  let drawWidthMm = boxWidthMm;
  let titleImage = getTitleImage(drawWidthMm);
  let drawOpts: EtiquetaDrawOptions = { ...base, eventTitleImage: titleImage };
  let drawHeightMm = etiquetaHeightMm(doc, drawWidthMm, drawOpts);

  if (drawHeightMm > boxHeightMm && drawHeightMm > 0) {
    drawWidthMm = drawWidthMm * (boxHeightMm / drawHeightMm);
    titleImage = getTitleImage(drawWidthMm);
    drawOpts = { ...base, eventTitleImage: titleImage };
    drawHeightMm = etiquetaHeightMm(doc, drawWidthMm, drawOpts);
  }

  return { drawWidthMm, drawHeightMm, drawOpts };
}

/** Desenha uma etiqueta igual ao `EventInscriptionEtiquetaSheet` (escala proporcional à largura). */
export function drawInscriptionEtiqueta(
  doc: import('jspdf').jsPDF,
  x: number,
  y: number,
  widthMm: number,
  opts: EtiquetaDrawOptions,
): number {
  const s = scaleFor(widthMm);
  const padX = PADDING_X_MM * s;
  const padY = PADDING_Y_MM * s;
  const qrSize = QR_SIZE_MM * s;
  const qrPad = QR_PAD_MM * s;
  const qrBorder = QR_BORDER_MM * s;
  const radius = BORDER_RADIUS_MM * s;
  const qrColW = qrColumnWidth(s);
  const metrics = measureText(doc, widthMm, opts);
  const h = Math.max(metrics.heightMm, qrColW) + 2 * padY;

  const qrBoxX = x + widthMm - padX - qrColW;
  const qrImgX = qrBoxX + qrPad + qrBorder;
  const qrImgY = y + (h - qrSize) / 2;

  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.25 * s);
  doc.roundedRect(x, y, widthMm, h, radius, radius, 'S');

  doc.setDrawColor(...COLOR_QR_BORDER);
  doc.setLineWidth(0.2 * s);
  const qrBoxY = y + (h - qrColW) / 2;
  doc.roundedRect(qrBoxX, qrBoxY, qrColW, qrColW, 0.8 * s, 0.8 * s, 'S');
  doc.addImage(opts.qrDataUrl, 'PNG', qrImgX, qrImgY, qrSize, qrSize);

  const textX = x + padX;
  const blockTop = y + (h - metrics.heightMm) / 2;
  const nameBaselineLift = ((FONT_NAME_PT * s) / 72) * 25.4 * 0.75;

  if (opts.eventTitleImage) {
    const img = opts.eventTitleImage;
    doc.addImage(img.dataUrl, 'PNG', textX, blockTop, img.textWidthMm, img.textHeightMm);
  }

  let textY = opts.eventTitleImage
    ? blockTop + opts.eventTitleImage.textHeightMm + opts.eventTitleImage.marginBottomMm + nameBaselineLift
    : blockTop + nameBaselineLift;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_NAME_PT * s);
  doc.setTextColor(...COLOR_NAME);
  metrics.nameLines.forEach((line) => {
    doc.text(line, textX, textY);
    textY += 4.6 * s;
  });

  if (metrics.companyLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_COMPANY_PT * s);
    doc.setTextColor(...COLOR_COMPANY);
    textY += 1 * s;
    metrics.companyLines.forEach((line) => {
      doc.text(line, textX, textY);
      textY += 3.5 * s;
    });
  }

  return h;
}
