'use client';

import { MeAssociarForm } from '@/components/associe-se/MeAssociarForm';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';

type MobileMeAssociarInShellProps = {
  segment: string;
};

export function MobileMeAssociarInShell({ segment }: MobileMeAssociarInShellProps) {
  const associeIndexHref = `${segment}/associe-se`;

  return (
    <MobileWebSubPageChrome
      backHref={associeIndexHref}
      backLabel="Associe-se"
      title="Me associar"
      subtitle="Envie seus dados para iniciarmos sua proposta. Nossa equipe entra em contato em seguida."
    >
      <MeAssociarForm associeIndexHref={associeIndexHref} embeddedInMobileShell />
    </MobileWebSubPageChrome>
  );
}
