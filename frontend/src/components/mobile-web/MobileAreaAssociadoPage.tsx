'use client';

import { AreaAssociadoView } from '@/components/area-associado/AreaAssociadoView';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';

type MobileAreaAssociadoPageProps = {
  segment: string;
};

export function MobileAreaAssociadoPage({ segment }: MobileAreaAssociadoPageProps) {
  return (
    <MobileWebSubPageChrome
      backHref={segment}
      title="Área do associado"
      subtitle="Serviços, SPC e links úteis para quem já é associado."
    >
      <AreaAssociadoView mobileShell shellSegment={segment} />
    </MobileWebSubPageChrome>
  );
}
