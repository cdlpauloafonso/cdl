'use client';

import { CampaignsListing } from '@/components/institucional/CampaignsListing';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';

type MobileCampanhasPageProps = {
  segment: string;
};

export function MobileCampanhasPage({ segment }: MobileCampanhasPageProps) {
  return (
    <MobileWebSubPageChrome
      backHref={segment}
      backLabel="Início app"
      title="Campanhas e eventos"
      subtitle="Ações da CDL Paulo Afonso no formato compacto para o app."
    >
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
