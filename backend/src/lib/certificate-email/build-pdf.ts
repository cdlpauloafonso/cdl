import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { formatCertificateEventSchedule } from './event-schedule.js';
import {
  inscriptionCertificateCompanyName,
  inscriptionCertificateRepresentativeName,
} from './participant.js';

const CERTIFICATE_FONT = 'SourceSerif4';
const FONT_REGULAR_FILE = 'SourceSerif4-Regular.ttf';
const FONT_BOLD_FILE = 'SourceSerif4-Bold.ttf';
const CERTIFICATE_LOGO_ASPECT = 420 / 1024;

const COLORS = {
  navy: [30, 58, 95] as [number, number, number],
  navyLight: [51, 78, 120] as [number, number, number],
  slate: [55, 65, 81] as [number, number, number],
  ink: [17, 24, 39] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [203, 213, 225] as [number, number, number],
  panel: [248, 250, 252] as [number, number, number],
  gold: [166, 139, 68] as [number, number, number],
};

type CertificateParticipantDisplay = {
  representativeName: string;
  companyName: string | null;
};

type EventCertificateEventInfo = {
  title: string;
  date?: string;
};

function certificateAssetsDir(): string {
  const fromCwd = path.join(process.cwd(), 'assets/certificate');
  if (fs.existsSync(fromCwd)) return fromCwd;
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../assets/certificate');
}

let regularBase64: string | null = null;
let boldBase64: string | null = null;

function loadFontFiles(assetsDir: string): void {
  if (regularBase64 && boldBase64) return;
  regularBase64 = fs
    .readFileSync(path.join(assetsDir, 'fonts', FONT_REGULAR_FILE))
    .toString('base64');
  boldBase64 = fs
    .readFileSync(path.join(assetsDir, 'fonts', FONT_BOLD_FILE))
    .toString('base64');
}

function registerCertificatePdfFonts(doc: import('jspdf').jsPDF, assetsDir: string): void {
  loadFontFiles(assetsDir);
  doc.addFileToVFS(FONT_REGULAR_FILE, regularBase64!);
  doc.addFileToVFS(FONT_BOLD_FILE, boldBase64!);
  doc.addFont(FONT_REGULAR_FILE, CERTIFICATE_FONT, 'normal');
  doc.addFont(FONT_BOLD_FILE, CERTIFICATE_FONT, 'bold');
}

function setCertificateFont(doc: import('jspdf').jsPDF, style: 'normal' | 'bold'): void {
  doc.setFont(CERTIFICATE_FONT, style);
}

function normalizeCertificateText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function wrapTextByWords(
  doc: import('jspdf').jsPDF,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (doc.getTextWidth(candidate) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function loadCertificateLogoDataUrl(assetsDir: string): Promise<string | null> {
  try {
    const logoPath = path.join(assetsDir, 'logo.png');
    const { data, info } = await sharp(logoPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const alpha =
        lum <= 18 ? 0 : lum >= 235 ? 255 : Math.round(((lum - 18) / (235 - 18)) * 255);
      data[i + 3] = alpha;
    }

    const pngBuffer = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    })
      .png()
      .toBuffer();

    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch {
    return null;
  }
}

function drawCertificatePage(
  doc: import('jspdf').jsPDF,
  logoDataUrl: string | null,
  event: EventCertificateEventInfo,
  participant: CertificateParticipantDisplay,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const frame = 6;
  const innerX = margin + frame;
  const innerY = margin + frame;
  const innerW = pageW - (margin + frame) * 2;
  const innerH = pageH - (margin + frame) * 2;
  const cx = pageW / 2;
  const innerBottom = innerY + innerH;
  const safeInset = 5;
  const contentW = innerW - 36;
  const panelW = innerW - 24;
  const panelX = innerX + (innerW - panelW) / 2;
  const panelPadX = 12;

  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.9);
  doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);

  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.25);
  doc.rect(innerX, innerY, innerW, innerH);

  const headerH = 42;
  doc.setFillColor(...COLORS.navy);
  doc.rect(innerX, innerY, innerW, headerH, 'F');

  doc.setFillColor(...COLORS.gold);
  doc.rect(innerX, innerY + headerH, innerW, 1.2, 'F');

  let hy = innerY + 8;
  if (logoDataUrl) {
    const logoW = 48;
    const logoH = logoW * CERTIFICATE_LOGO_ASPECT;
    doc.addImage(logoDataUrl, 'PNG', cx - logoW / 2, hy, logoW, logoH);
    hy += logoH + 5;
  }

  doc.setTextColor(255, 255, 255);
  setCertificateFont(doc, 'bold');
  doc.setFontSize(9);
  doc.text('CÂMARA DE DIRIGENTES LOJISTAS', cx, hy, { align: 'center' });
  hy += 5;
  setCertificateFont(doc, 'normal');
  doc.setFontSize(9);
  doc.text('Paulo Afonso - Bahia', cx, hy, { align: 'center' });

  let y = innerY + headerH + 10;
  doc.setTextColor(...COLORS.navy);
  setCertificateFont(doc, 'bold');
  doc.setFontSize(26);
  doc.text('CERTIFICADO', cx, y, { align: 'center' });

  y += 8;
  setCertificateFont(doc, 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.navyLight);
  doc.text('DE PARTICIPAÇÃO', cx, y, { align: 'center' });

  y += 4;
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.6);
  const ruleW = 48;
  doc.line(cx - ruleW / 2, y, cx + ruleW / 2, y);

  y += 11;
  doc.setTextColor(...COLORS.slate);
  setCertificateFont(doc, 'normal');
  doc.setFontSize(10.5);
  doc.text('Certificamos, para os devidos fins, que', cx, y, { align: 'center' });

  y += 10;
  const nameY = y;
  const representativeName =
    normalizeCertificateText(participant.representativeName) || 'Participante';
  const companyName = participant.companyName
    ? normalizeCertificateText(participant.companyName)
    : null;

  setCertificateFont(doc, 'bold');
  doc.setFontSize(25);
  const nameLines = wrapTextByWords(doc, representativeName, contentW);
  const nameLineH = 9.5;
  let nameBlockH = Math.max(nameLineH, nameLines.length * nameLineH);

  let companyLines: string[] = [];
  let companyLineH = 5.5;
  if (companyName) {
    setCertificateFont(doc, 'normal');
    doc.setFontSize(12);
    companyLines = wrapTextByWords(doc, companyName, contentW);
    nameBlockH += 2 + Math.max(companyLineH, companyLines.length * companyLineH);
  }

  y = nameY + nameBlockH + 1.5;
  setCertificateFont(doc, 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.slate);
  doc.text('participou do evento', cx, y, { align: 'center' });

  const bodyEndY = y;

  const schedule = formatCertificateEventSchedule(event.date);
  const eventTitle = normalizeCertificateText(event.title) || 'Evento CDL';
  const titleMaxW = panelW - panelPadX * 2;
  setCertificateFont(doc, 'bold');
  doc.setFontSize(11);
  const titleLines = wrapTextByWords(doc, eventTitle, titleMaxW);

  const panelPadY = 7;
  const titleLineH = 5;
  const titleBlockH = titleLines.length * titleLineH + 2;
  const scheduleBlockH = schedule.dateLine ? (schedule.timeLine ? 13.5 : 8.5) : 0;
  const panelFooterH = 14;
  const panelH =
    panelPadY * 2 + 5 + titleBlockH + (scheduleBlockH > 0 ? scheduleBlockH + 4 : 0) + panelFooterH;

  const panelBottomMax = innerBottom - safeInset;
  const gapAfterBody = 6;
  let panelY = bodyEndY + gapAfterBody;
  if (panelY + panelH > panelBottomMax) {
    panelY = panelBottomMax - panelH;
  }
  if (panelY < bodyEndY + 4) {
    panelY = bodyEndY + 4;
  }
  const panelDrawH = Math.min(panelH, panelBottomMax - panelY);

  doc.setFillColor(...COLORS.panel);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.35);
  doc.roundedRect(panelX, panelY, panelW, panelDrawH, 2, 2, 'FD');

  let py = panelY + panelPadY;
  setCertificateFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text('EVENTO', panelX + panelPadX, py);

  py += 5;
  doc.setTextColor(...COLORS.navy);
  setCertificateFont(doc, 'bold');
  doc.setFontSize(11);
  titleLines.forEach((line) => {
    doc.text(line, cx, py, { align: 'center' });
    py += titleLineH;
  });

  if (schedule.dateLine) {
    py += 2;
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(panelX + panelPadX, py, panelX + panelW - panelPadX, py);
    py += 4;

    doc.setTextColor(...COLORS.slate);
    setCertificateFont(doc, 'bold');
    doc.setFontSize(11.5);
    doc.text('Data: ', panelX + panelPadX, py);
    const dateLabelW = doc.getTextWidth('Data: ');
    setCertificateFont(doc, 'normal');
    doc.setFontSize(11.5);
    doc.text(schedule.dateLine, panelX + panelPadX + dateLabelW, py);

    if (schedule.timeLine) {
      py += 5.5;
      setCertificateFont(doc, 'bold');
      doc.setFontSize(11.5);
      doc.text('Horário: ', panelX + panelPadX, py);
      const timeLabelW = doc.getTextWidth('Horário: ');
      setCertificateFont(doc, 'normal');
      doc.setFontSize(11.5);
      doc.text(schedule.timeLine, panelX + panelPadX + timeLabelW, py);
    }
  }

  const panelFooterY = panelY + panelDrawH - panelPadY - 1;
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(panelX + panelPadX, panelFooterY - 7, panelX + panelW - panelPadX, panelFooterY - 7);

  setCertificateFont(doc, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.navy);
  doc.text('CDL Paulo Afonso', cx, panelFooterY - 2, { align: 'center' });

  setCertificateFont(doc, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  const issued = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Documento emitido em ${issued}`, cx, panelFooterY + 3, { align: 'center' });

  doc.setTextColor(...COLORS.ink);
  setCertificateFont(doc, 'bold');
  doc.setFontSize(25);
  let ny = nameY;
  nameLines.forEach((line) => {
    doc.text(line, cx, ny, { align: 'center' });
    ny += nameLineH;
  });

  if (companyLines.length > 0) {
    ny += 2;
    doc.setTextColor(...COLORS.slate);
    setCertificateFont(doc, 'normal');
    doc.setFontSize(12);
    companyLines.forEach((line) => {
      doc.text(line, cx, ny, { align: 'center' });
      ny += companyLineH;
    });
  }
}

export async function buildCertificatePdfBuffer(input: {
  eventTitle: string;
  eventDate?: string;
  fields: Record<string, unknown>;
}): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const assetsDir = certificateAssetsDir();
  const logoDataUrl = await loadCertificateLogoDataUrl(assetsDir);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerCertificatePdfFonts(doc, assetsDir);

  const participant: CertificateParticipantDisplay = {
    representativeName: inscriptionCertificateRepresentativeName(input.fields),
    companyName: inscriptionCertificateCompanyName(input.fields),
  };

  drawCertificatePage(
    doc,
    logoDataUrl,
    { title: input.eventTitle, date: input.eventDate },
    participant,
  );

  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}
