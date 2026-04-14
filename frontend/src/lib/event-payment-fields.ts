import type { Campaign } from './firestore';

export type EffectivePayment =
  | { kind: 'none' }
  | { kind: 'pix'; imageUrl?: string; copyPaste?: string; observationText?: string };

/** Dados de PIX configurados pelo admin (imagem + código copia e cola). */
export function getEffectivePayment(c: Pick<Campaign, 'paymentConfig'>): EffectivePayment {
  const p = c.paymentConfig;
  if (!p) return { kind: 'none' };
  const imageUrl = p.pixImageUrl?.trim();
  const copyPaste = p.pixCopyPaste?.trim();
  const observationText = p.pixObservationText?.trim();
  if (!imageUrl && !copyPaste) return { kind: 'none' };
  return {
    kind: 'pix',
    imageUrl: imageUrl || undefined,
    copyPaste: copyPaste || undefined,
    observationText: observationText || undefined,
  };
}
