const FONT_REGULAR_FILE = 'SourceSerif4-Regular.ttf';
const FONT_BOLD_FILE = 'SourceSerif4-Bold.ttf';
export const CERTIFICATE_FONT = 'SourceSerif4';

const docCertificateFontOk = new WeakMap<import('jspdf').jsPDF, boolean>();

let regularBase64: string | null = null;
let boldBase64: string | null = null;

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const blob = new Blob([buffer]);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function loadFontFiles(): Promise<void> {
  if (regularBase64 && boldBase64) return;
  const [reg, bold] = await Promise.all([
    fetch('/fonts/SourceSerif4-Regular.ttf').then((r) => {
      if (!r.ok) throw new Error('Source Serif 4 Regular não encontrada');
      return r.arrayBuffer();
    }),
    fetch('/fonts/SourceSerif4-Bold.ttf').then((r) => {
      if (!r.ok) throw new Error('Source Serif 4 Bold não encontrada');
      return r.arrayBuffer();
    }),
  ]);
  regularBase64 = await arrayBufferToBase64(reg);
  boldBase64 = await arrayBufferToBase64(bold);
}

export async function registerCertificatePdfFonts(
  doc: import('jspdf').jsPDF,
): Promise<boolean> {
  try {
    await loadFontFiles();
    doc.addFileToVFS(FONT_REGULAR_FILE, regularBase64!);
    doc.addFileToVFS(FONT_BOLD_FILE, boldBase64!);
    doc.addFont(FONT_REGULAR_FILE, CERTIFICATE_FONT, 'normal');
    doc.addFont(FONT_BOLD_FILE, CERTIFICATE_FONT, 'bold');
    docCertificateFontOk.set(doc, true);
    return true;
  } catch {
    docCertificateFontOk.set(doc, false);
    return false;
  }
}

export function setCertificateFont(
  doc: import('jspdf').jsPDF,
  style: 'normal' | 'bold',
): void {
  if (docCertificateFontOk.get(doc)) {
    doc.setFont(CERTIFICATE_FONT, style);
  } else {
    doc.setFont('times', style);
  }
}
