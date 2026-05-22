'use client';

import { CampaignsListing } from '@/components/institucional/CampaignsListing';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';

type MobileCampanhasPageProps = {
  segment: string;
  title?: string;
  subtitle?: string;
};

export function MobileCampanhasPage({
  segment,
  title = 'Campanhas e eventos',
  subtitle = 'Ações da CDL Paulo Afonso no formato compacto para o app.',
}: MobileCampanhasPageProps) {
  return (
    <MobileWebSubPageChrome backHref={segment} title={title} subtitle={subtitle}>
      <CampaignsListing
        title=""
        description=""
        loadingLabel="Carregando campanhas…"
        mobileShell
        shellSegment={segment}
        hideStandaloneHeader
      />
    </MobileWebSubPageChrome>
  );
}
