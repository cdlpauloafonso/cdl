import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { MobileWebviewDocumentBackdrop } from '@/components/mobile-web/MobileWebviewDocumentBackdrop';
import { MobileWebviewShellChrome } from '@/components/mobile-web/MobileWebviewShellChrome';

/**
 * Zona segura inferior no wrapper; topo fica ao critério de cada página (fundo/fixos até ao notch, conteúdo com `safe-area-inset-top`).
 */
export const viewport: Viewport = {
  viewportFit: 'cover',
};

/** Shell WebView: sem header/footer principal (ConditionalLayout já exclui /m/). */
export default function MobileWebviewSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MobileWebviewDocumentBackdrop />
      <div
        data-mobile-shell
        className="relative z-[1] flex min-h-dvh flex-col bg-[#0b1224] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      >
        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
          <MobileWebviewShellChrome>{children}</MobileWebviewShellChrome>
        </div>
      </div>
    </>
  );
}
