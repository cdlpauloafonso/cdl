import { registerCertificatePdfFonts, setCertificateFont } from '@/lib/certificate-pdf-fonts';
import { formatCertificateEventSchedule } from '@/lib/event-datetime';
import {
  inscriptionCertificateCompanyName,
  inscriptionCertificateRepresentativeName,
} from '@/lib/event-registration-fields';

export type CertificateParticipantDisplay = {
  representativeName: string;
  companyName: string | null;
};

export function certificateParticipantFromFields(
  fields: Record<string, string>,
): CertificateParticipantDisplay {
  return {
    representativeName: inscriptionCertificateRepresentativeName(fields),
    companyName: inscriptionCertificateCompanyName(fields),
  };
}

export type EventCertificateParticipant = {
  inscriptionId: string;
  fields: Record<string, string>;
};

export type EventCertificateEventInfo = {
  title: string;
  date?: string;
};

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

function normalizeCertificateText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Quebra por palavras — evita cortes no meio. */
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

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const logoResponse = await fetch('/logo-site.png');
    if (!logoResponse.ok) return null;
    const logoBlob = await logoResponse.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(logoBlob);
    });
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

  // Moldura
  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.9);
  doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);

  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.25);
  doc.rect(innerX, innerY, innerW, innerH);

  // Cabeçalho
  const headerH = 42;
  doc.setFillColor(...COLORS.navy);
  doc.rect(innerX, innerY, innerW, headerH, 'F');

  doc.setFillColor(...COLORS.gold);
  doc.rect(innerX, innerY + headerH, innerW, 1.2, 'F');

  let hy = innerY + 8;
  if (logoDataUrl) {
    const logoW = 42;
    const logoH = 15;
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

  // Título do certificado
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
  doc.setFontSize(22);
  const nameLines = wrapTextByWords(doc, representativeName, contentW);
  const nameLineH = 8.5;
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

  // Painel do evento + rodapé (tudo dentro da moldura)
  const schedule = formatCertificateEventSchedule(event.date);
  const eventTitle = normalizeCertificateText(event.title) || 'Evento CDL';
  const titleMaxW = panelW - panelPadX * 2;
  setCertificateFont(doc, 'bold');
  doc.setFontSize(11);
  const titleLines = wrapTextByWords(doc, eventTitle, titleMaxW);

  const panelPadY = 7;
  const titleLineH = 5;
  const titleBlockH = titleLines.length * titleLineH + 2;
  const scheduleBlockH = schedule.dateLine ? (schedule.timeLine ? 11.5 : 7) : 0;
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
    doc.setFontSize(9.5);
    doc.text('Data: ', panelX + panelPadX, py);
    const dateLabelW = doc.getTextWidth('Data: ');
    setCertificateFont(doc, 'normal');
    doc.text(schedule.dateLine, panelX + panelPadX + dateLabelW, py);

    if (schedule.timeLine) {
      py += 4.5;
      setCertificateFont(doc, 'bold');
      doc.text('Horário: ', panelX + panelPadX, py);
      const timeLabelW = doc.getTextWidth('Horário: ');
      setCertificateFont(doc, 'normal');
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

  // Representante e empresa por cima do painel (evita ficar oculto pelo fundo cinza)
  doc.setTextColor(...COLORS.ink);
  setCertificateFont(doc, 'bold');
  doc.setFontSize(22);
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

export async function buildEventCertificatesPdf(
  event: EventCertificateEventInfo,
  participants: EventCertificateParticipant[],
): Promise<import('jspdf').jsPDF | null> {
  if (participants.length === 0) return null;
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  await registerCertificatePdfFonts(doc);

  participants.forEach((p, index) => {
    if (index > 0) doc.addPage();
    drawCertificatePage(doc, logoDataUrl, event, certificateParticipantFromFields(p.fields));
  });

  return doc;
}

export async function downloadEventCertificatePdf(
  event: EventCertificateEventInfo,
  participant: EventCertificateParticipant,
  fileName: string,
): Promise<boolean> {
  const doc = await buildEventCertificatesPdf(event, [participant]);
  if (!doc) return false;
  doc.save(fileName);
  return true;
}

export async function downloadEventCertificatesBulkPdf(
  event: EventCertificateEventInfo,
  participants: EventCertificateParticipant[],
  fileName: string,
): Promise<boolean> {
  const doc = await buildEventCertificatesPdf(event, participants);
  if (!doc) return false;
  doc.save(fileName);
  return true;
}

export function safeCertificateFileName(eventTitle: string, suffix: string): string {
  const safe = eventTitle.replace(/[^\w\d\-]+/g, '_').slice(0, 36);
  return `certificados-${safe}-${suffix}.pdf`;
}

export function safeCertificateParticipantFileName(
  eventTitle: string,
  participantName: string,
): string {
  const safeEvent = eventTitle.replace(/[^\w\d\-]+/g, '_').slice(0, 24);
  const safeName = participantName.replace(/[^\w\d\-]+/g, '_').slice(0, 32);
  return `certificado-${safeEvent}-${safeName}.pdf`;
}
