import { getSettings } from '@/lib/firestore';

export const CDL_WHATSAPP_STORAGE_KEY = 'cdl_whatsapp_number';

/** WhatsApp oficial CDL Paulo Afonso — (75) 3281-6997 */
export const CDL_WHATSAPP_FALLBACK = '557532816997';

export function formatWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10) return '55' + digits;
  return digits;
}

export async function resolveCdlWhatsAppNumber(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  const stored =
    typeof window !== 'undefined' ? localStorage.getItem(CDL_WHATSAPP_STORAGE_KEY)?.trim() : null;

  try {
    const settings = await getSettings();
    const apiNum = settings?.whatsapp_number?.trim();
    if (apiNum) return formatWhatsAppNumber(apiNum);
  } catch {
    // Firestore indisponível
  }

  if (stored) return formatWhatsAppNumber(stored);
  if (env) return formatWhatsAppNumber(env);
  return CDL_WHATSAPP_FALLBACK;
}

export function buildWhatsAppUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
