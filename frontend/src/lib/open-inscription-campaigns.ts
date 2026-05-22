import {
  isInscriptionSoldOutForCampaign,
  listCampaignsByCreatedAtDesc,
  type Campaign,
} from '@/lib/firestore';
import { getEffectiveRegistration, isEventInscriptionOpen } from '@/lib/event-registration-fields';

/** Campanhas/eventos publicados com inscrição ativa e vagas (quando há limite). */
export async function listCampaignsWithOpenInscriptions(): Promise<Campaign[]> {
  const all = await listCampaignsByCreatedAtDesc();
  const candidates = all.filter((c) => c.id && isEventInscriptionOpen(c));

  const checked = await Promise.all(
    candidates.map(async (c) => {
      const id = c.id!;
      const reg = getEffectiveRegistration(c);
      if (reg.kind === 'form') {
        if (await isInscriptionSoldOutForCampaign(id, c)) return null;
      }
      return c;
    }),
  );

  return checked.filter((c): c is Campaign => c !== null);
}
