'use client';

import { BeneficiosAssociadosView } from '@/components/servicos/beneficios-associados/BeneficiosAssociadosView';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';

type MobileBeneficiosAssociadosPageProps = {
  segment: string;
};

export function MobileBeneficiosAssociadosPage({ segment }: MobileBeneficiosAssociadosPageProps) {
  return (
    <MobileWebSubPageChrome
      backHref={segment}
      title="Benefícios para associados"
      subtitle="Convênios e vantagens da CDL — leitura otimizada para o app."
    >
      <BeneficiosAssociadosView
        mobileShell
        associeHref={`${segment}/associe-se`}
        atendimentoHref={`${segment}/atendimento`}
      />
    </MobileWebSubPageChrome>
  );
}
