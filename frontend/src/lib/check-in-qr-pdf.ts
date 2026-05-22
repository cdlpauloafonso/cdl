/** Converte o SVG do QR Code em PNG para embutir no PDF. */
export async function qrSvgToPngDataUrl(svg: SVGSVGElement, size = 512): Promise<string> {
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute('width', String(size));
  cloned.setAttribute('height', String(size));

  const svgData = new XMLSerializer().serializeToString(cloned);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('qr-image'));
      img.src = blobUrl;
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export type CheckInQrPdfOptions = {
  eventTitle?: string;
  participantLabel?: string;
  qrSvg: SVGSVGElement | null;
  fileName?: string;
};

export async function downloadCheckInQrPdf(options: CheckInQrPdfOptions): Promise<boolean> {
  const { eventTitle, participantLabel, qrSvg, fileName } = options;
  if (!qrSvg) return false;

  try {
    const png = await qrSvgToPngDataUrl(qrSvg);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('QR Code de check-in', margin, y);
    y += 10;

    if (eventTitle?.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(eventTitle.trim(), pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 6 + 4;
    }

    if (participantLabel?.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      const lines = doc.splitTextToSize(participantLabel.trim(), pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 6 + 6;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const instructions = [
      'Instruções para o credenciamento:',
      '• Apresente este QR Code no ato do credenciamento, na entrada do evento.',
      '• Mantenha o brilho da tela elevado ou use este documento impresso para facilitar a leitura.',
      '• Este código é pessoal e intransferível — não compartilhe com terceiros.',
    ];
    for (const line of instructions) {
      const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5 + 2;
    }

    y += 4;
    const qrSize = 70;
    const qrX = (pageW - qrSize) / 2;
    doc.addImage(png, 'PNG', qrX, y, qrSize, qrSize);
    y += qrSize + 8;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('CDL Paulo Afonso — credenciamento de evento', pageW / 2, y, { align: 'center' });

    const safeName =
      (participantLabel || eventTitle || 'check-in')
        .replace(/[^\w\u00C0-\u024f\s-]+/gi, '')
        .trim()
        .slice(0, 40) || 'check-in';
    doc.save(fileName ?? `qr-check-in-${safeName.replace(/\s+/g, '-')}.pdf`);
    return true;
  } catch {
    return false;
  }
}
