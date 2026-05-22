import { useEffect, useRef, type ReactNode } from 'react';
import { MobileAppContentFrame, mobileAppInnerContainer } from '@/components/mobile-web/MobileAppContentFrame';
import { scrollViewportToTopAfterPaint } from '@/lib/scroll-viewport-top';

const SITE_OUTER_CLASS = 'py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30';

type InscriptionPageShellProps = {
  fillAppShellViewport: boolean;
  innerMaxWidthClass?: string;
  children: ReactNode;
  /** Altura mínima no loading (ex.: `min-h-[50vh]`). */
  minHeightClass?: string;
  /** Ao montar (ex.: tela de QR após inscrição), rola para o topo da página. */
  scrollToTop?: boolean;
};

/** Layout compartilhado das telas de inscrição (site e WebView `/m/{token}/`). */
export function InscriptionPageShell({
  fillAppShellViewport,
  innerMaxWidthClass = 'max-w-2xl',
  children,
  minHeightClass,
  scrollToTop = false,
}: InscriptionPageShellProps) {
  const innerClass = mobileAppInnerContainer(fillAppShellViewport, innerMaxWidthClass);
  const topAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollToTop) return;
    scrollViewportToTopAfterPaint(topAnchorRef.current);
  }, [scrollToTop]);

  const topAnchor = (
    <div ref={topAnchorRef} data-inscription-screen-top className="h-0 w-0 shrink-0" aria-hidden />
  );

  if (fillAppShellViewport) {
    return (
      <MobileAppContentFrame enabled>
        {topAnchor}
        <div className={`${innerClass}${minHeightClass ? ` ${minHeightClass}` : ''}`}>{children}</div>
      </MobileAppContentFrame>
    );
  }

  return (
    <div className={`${SITE_OUTER_CLASS}${minHeightClass ? ` ${minHeightClass}` : ''}`}>
      {topAnchor}
      <div className={innerClass}>{children}</div>
    </div>
  );
}
