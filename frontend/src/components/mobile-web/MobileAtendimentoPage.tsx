'use client';

import { AtendimentoClient } from '@/components/atendimento/AtendimentoClient';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';

type MobileAtendimentoPageProps = {
  segment: string;
};

export function MobileAtendimentoPage({ segment }: MobileAtendimentoPageProps) {
  return (
    <MobileWebSubPageChrome
      backHref={segment}
      title="Fale conosco"
      subtitle="Envie uma mensagem para a equipe de atendimento da CDL Paulo Afonso."
    >
      <AtendimentoClient mobileShell />
    </MobileWebSubPageChrome>
  );
}
