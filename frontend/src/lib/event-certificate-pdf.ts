import { formatEventDateForDisplay } from '@/lib/event-datetime';
import { inscriptionDisplayLabel } from '@/lib/event-registration-fields';

export type EventCertificateParticipant = {
  inscriptionId: string;
  fields: Record<string, string>;
};

export type EventCertificateEventInfo = {
  title: string;
  date?: string;
};

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
  participantName: string,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const innerW = pageW - margin * 2;
  const innerH = pageH - margin * 2;
  const cx = pageW / 2;

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(1.2);
  doc.rect(margin, margin, innerW, innerH);
  doc.setLineWidth(0.4);
  doc.rect(margin + 4, margin + 4, innerW - 8, innerH - 8);

  let y = margin + 16;

  if (logoDataUrl) {
    const logoW = 48;
    const logoH = 18;
    doc.addImage(logoDataUrl, 'PNG', cx - logoW / 2, y, logoW, logoH);
    y += logoH + 10;
  }

  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('CERTIFICADO', cx, y, { align: 'center' });
  y += 10;
  doc.setFontSize(14);
  doc.text('DE PARTICIPAÇÃO', cx, y, { align: 'center' });
  y += 18;

  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const intro =
    'A CDL Paulo Afonso certifica, para os devidos fins, que o(a) participante abaixo identificado(a) participou do evento:';
  const introLines = doc.splitTextToSize(intro, innerW - 24) as string[];
  introLines.forEach((line) => {
    doc.text(line, cx, y, { align: 'center' });
    y += 6;
  });
  y += 6;

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  const nameLines = doc.splitTextToSize(participantName.trim() || 'Participante', innerW - 32) as string[];
  nameLines.forEach((line) => {
    doc.text(line, cx, y, { align: 'center' });
    y += 9;
  });
  y += 4;

  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const eventTitleLines = doc.splitTextToSize(event.title.trim() || 'Evento CDL', innerW - 24) as string[];
  eventTitleLines.forEach((line) => {
    doc.text(line, cx, y, { align: 'center' });
    y += 7;
  });

  const eventDateLabel = formatEventDateForDisplay(event.date);
  if (eventDateLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Realizado em ${eventDateLabel}`, cx, y + 4, { align: 'center' });
    y += 12;
  }

  y = Math.max(y + 8, pageH - margin - 28);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(cx - 45, y, cx + 45, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text('CDL Paulo Afonso', cx, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.text(
    `Emitido em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    cx,
    y,
    { align: 'center' },
  );
}

export async function buildEventCertificatesPdf(
  event: EventCertificateEventInfo,
  participants: EventCertificateParticipant[],
): Promise<import('jspdf').jsPDF | null> {
  if (participants.length === 0) return null;
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  participants.forEach((p, index) => {
    if (index > 0) doc.addPage();
    drawCertificatePage(doc, logoDataUrl, event, inscriptionDisplayLabel(p.fields));
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
