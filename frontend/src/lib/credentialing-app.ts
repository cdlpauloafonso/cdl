import { listCampaigns, type Campaign } from '@/lib/firestore';
import { hasEventFormRegistration } from '@/lib/event-registration-fields';

/** Evento elegível para credenciamento pelo app (home /m/…). */
export function isAppCredentialingCampaign(c: Campaign): boolean {
  return c.credentialingOnApp === true && c.published !== false && hasEventFormRegistration(c);
}

/** Eventos com credenciamento ativo no app, publicados e com inscrição por formulário. */
export async function listAppCredentialingCampaigns(): Promise<Campaign[]> {
  const all = await listCampaigns();
  return all
    .filter(isAppCredentialingCampaign)
    .sort((a, b) => {
      const ma = new Date(a.date || a.createdAt || 0).getTime();
      const mb = new Date(b.date || b.createdAt || 0).getTime();
      if (ma !== mb) return mb - ma;
      return (a.title || '').localeCompare(b.title || '', 'pt-BR');
    });
}
