const FONT_REGULAR_FILE = 'Roboto-Regular.ttf';
const FONT_BOLD_FILE = 'Roboto-Bold.ttf';
export const CERTIFICATE_FONT = 'Roboto';

const docRobotoOk = new WeakMap<import('jspdf').jsPDF, boolean>();

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
    fetch('/fonts/Roboto-Regular.ttf').then((r) => {
      if (!r.ok) throw new Error('Roboto Regular não encontrada');
      return r.arrayBuffer();
    }),
    fetch('/fonts/Roboto-Bold.ttf').then((r) => {
      if (!r.ok) throw new Error('Roboto Bold não encontrada');
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
    docRobotoOk.set(doc, true);
    return true;
  } catch {
    docRobotoOk.set(doc, false);
    return false;
  }
}

export function setCertificateFont(
  doc: import('jspdf').jsPDF,
  style: 'normal' | 'bold',
): void {
  if (docRobotoOk.get(doc)) {
    doc.setFont(CERTIFICATE_FONT, style);
  } else {
    doc.setFont('helvetica', style);
  }
}
