'use client';

import type { ServicoDisplayItem } from '@/lib/servicos-page-data';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';
import { ServiciosView } from '@/components/servicos/ServiciosView';

type MobileServicosPageProps = {
  segment: string;
  services: ServicoDisplayItem[];
};

export function MobileServicosPage({ segment, services }: MobileServicosPageProps) {
  return (
    <MobileWebSubPageChrome
      backHref={segment}
      backLabel="Início app"
      title="Serviços"
      subtitle="Soluções e convênios da CDL — catálogo otimizado para o app."
    >
      <ServiciosView services={services} shellSegment={segment} mobileShell />
    </MobileWebSubPageChrome>
  );
}
