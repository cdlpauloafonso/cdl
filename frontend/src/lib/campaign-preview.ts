import { resolveAppShellHref } from '@/lib/mobile-shell-links';

/** Query string para visualizar evento em rascunho (somente com sessão admin). */
export const CAMPAIGN_PREVIEW_PARAM = 'preview';

export function isCampaignPreviewRequested(value: string | null | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export type CampaignUrlOptions = {
  preview?: boolean;
  /** Prefixo `/m/{token}` para navegação dentro do app WebView. */
  shellSegment?: string | null;
};

function withOptionalShell(path: string, options?: CampaignUrlOptions): string {
  if (options?.shellSegment) {
    return resolveAppShellHref(options.shellSegment, path);
  }
  return path;
}

export function campaignPublicPageUrl(slug: string, options?: CampaignUrlOptions): string {
  const base = `/institucional/campanhas/ver?slug=${encodeURIComponent(slug)}`;
  const path = options?.preview ? `${base}&${CAMPAIGN_PREVIEW_PARAM}=1` : base;
  return withOptionalShell(path, options);
}

export function campaignInscriptionPageUrl(slug: string, options?: CampaignUrlOptions): string {
  const base = `/institucional/campanhas/inscricao?slug=${encodeURIComponent(slug)}`;
  const path = options?.preview ? `${base}&${CAMPAIGN_PREVIEW_PARAM}=1` : base;
  return withOptionalShell(path, options);
}

/** Retoma pagamento de inscrição já registrada (Asaas pendente). */
export function campaignInscriptionResumeUrl(
  slug: string,
  inscriptionId: string,
  options?: CampaignUrlOptions,
): string {
  const base = campaignInscriptionPageUrl(slug, options);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}inscriptionId=${encodeURIComponent(inscriptionId.trim())}`;
}
