import {
  campaignInscriptionPageUrl,
  campaignInscriptionResumeUrl,
  campaignPublicPageUrl,
} from '@/lib/campaign-preview';
import { resolveAppShellHref, segmentFromMobilePathname } from '@/lib/mobile-shell-links';

export { segmentFromMobilePathname };

export type CampaignShellHrefOptions = {
  preview?: boolean;
  shellSegment?: string | null;
};

function withShell(segment: string | null | undefined, path: string): string {
  return resolveAppShellHref(segment ?? null, path);
}

/** Detalhe do evento (`/institucional/campanhas/ver?slug=`). */
export function campaignVerHrefForShell(
  slug: string,
  options?: CampaignShellHrefOptions,
): string {
  return withShell(options?.shellSegment, campaignPublicPageUrl(slug, { preview: options?.preview }));
}

/** Página de inscrição (`/institucional/campanhas/inscricao?slug=`). */
export function campaignInscriptionHrefForShell(
  slug: string,
  options?: CampaignShellHrefOptions,
): string {
  return withShell(options?.shellSegment, campaignInscriptionPageUrl(slug, { preview: options?.preview }));
}

/** Retomar pagamento / checkout (`inscriptionId` na query). */
export function campaignInscriptionResumeHrefForShell(
  slug: string,
  inscriptionId: string,
  options?: CampaignShellHrefOptions,
): string {
  return withShell(
    options?.shellSegment,
    campaignInscriptionResumeUrl(slug, inscriptionId, { preview: options?.preview }),
  );
}

/** Infere `/m/{token}` a partir de `campanhasIndexHref` passado pelas páginas do shell. */
export function shellSegmentFromCampanhasIndexHref(campanhasIndexHref: string): string | null {
  return segmentFromMobilePathname(campanhasIndexHref);
}
