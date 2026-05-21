/** Query string para visualizar evento em rascunho (somente com sessão admin). */
export const CAMPAIGN_PREVIEW_PARAM = 'preview';

export function isCampaignPreviewRequested(value: string | null | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function campaignPublicPageUrl(slug: string, options?: { preview?: boolean }): string {
  const base = `/institucional/campanhas/ver?slug=${encodeURIComponent(slug)}`;
  return options?.preview ? `${base}&${CAMPAIGN_PREVIEW_PARAM}=1` : base;
}

export function campaignInscriptionPageUrl(slug: string, options?: { preview?: boolean }): string {
  const base = `/institucional/campanhas/inscricao?slug=${encodeURIComponent(slug)}`;
  return options?.preview ? `${base}&${CAMPAIGN_PREVIEW_PARAM}=1` : base;
}

/** Retoma pagamento de inscrição já registrada (Asaas pendente). */
export function campaignInscriptionResumeUrl(slug: string, inscriptionId: string): string {
  const base = campaignInscriptionPageUrl(slug);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}inscriptionId=${encodeURIComponent(inscriptionId.trim())}`;
}
