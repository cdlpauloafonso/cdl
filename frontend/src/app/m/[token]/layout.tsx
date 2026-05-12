import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { MobileWebviewShellChrome } from '@/components/mobile-web/MobileWebviewShellChrome';

/**
 * Cobertura até às zonas seguras da WebView/Safari; sem isto os `env(safe-area-inset-*)` podem ficar a 0.
 */
export const viewport: Viewport = {
  viewportFit: 'cover',
};

/** Shell WebView: sem header/footer principal (ConditionalLayout já exclui /m/). */
export default function MobileWebviewSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0b1224] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
        <MobileWebviewShellChrome>{children}</MobileWebviewShellChrome>
      </div>
    </div>
  );
}
