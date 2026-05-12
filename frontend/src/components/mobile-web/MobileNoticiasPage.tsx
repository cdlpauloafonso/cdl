'use client';

import { NoticiasListClient } from '@/app/noticias/NoticiasListClient';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';

export function MobileNoticiasPage({ segment }: { segment: string }) {
  return (
    <MobileWebSubPageChrome
      backHref={segment}
      title="Últimas notícias"
      subtitle="Novidades da CDL, do comércio e da comunidade — leitura otimizada no app."
    >
      <NoticiasListClient mobileShell shellSegment={segment} />
    </MobileWebSubPageChrome>
  );
}
