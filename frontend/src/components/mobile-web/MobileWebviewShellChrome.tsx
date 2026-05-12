'use client';

import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { segmentFromMobilePathname, resolveAppShellHref } from '@/lib/mobile-shell-links';
import { MobileAppShellMenu } from '@/components/mobile-web/MobileAppShellMenu';
import { MOBILE_APP_SHELL_MENU_ITEMS } from '@/components/mobile-web/mobile-app-shell-menu-items';

type MobileWebviewShellChromeProps = {
  children: ReactNode;
};

/**
 * Mantém o botão do menu retrátil sempre visível (canto superior direito), em todas as rotas `/m/:token/*`.
 */
export function MobileWebviewShellChrome({ children }: MobileWebviewShellChromeProps) {
  const pathname = usePathname();
  const mobileSegment = useMemo(() => (pathname ? segmentFromMobilePathname(pathname) : null), [pathname]);

  const shellHref = useCallback((href: string) => resolveAppShellHref(mobileSegment, href), [mobileSegment]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <MobileAppShellMenu
        floating
        items={MOBILE_APP_SHELL_MENU_ITEMS}
        shellHref={shellHref}
      />
    </>
  );
}
