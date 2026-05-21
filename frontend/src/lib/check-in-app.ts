import { listCampaigns, type Campaign } from '@/lib/firestore';
import { hasEventFormRegistration } from '@/lib/event-registration-fields';

/** Flag no evento (aceita legado `credentialingOnApp`). */
export function isCheckInOnAppEnabled(c: Campaign): boolean {
  return (c.checkInOnApp === true || c.credentialingOnApp === true) && c.published !== false;
}

/** Evento elegível para check-in do inscrito na home do app (/m/…). */
export function isAppCheckInCampaign(c: Campaign): boolean {
  return isCheckInOnAppEnabled(c) && hasEventFormRegistration(c);
}

/** Eventos com check-in ativo no app, publicados e com inscrição por formulário. */
export async function listAppCheckInCampaigns(): Promise<Campaign[]> {
  const all = await listCampaigns();
  return all
    .filter(isAppCheckInCampaign)
    .sort((a, b) => {
      const ma = new Date(a.date || a.createdAt || 0).getTime();
      const mb = new Date(b.date || b.createdAt || 0).getTime();
      if (ma !== mb) return mb - ma;
      return (a.title || '').localeCompare(b.title || '', 'pt-BR');
    });
}
