import type { ReactNode } from 'react';

const APP_VIEWPORT_PADDING =
  'pb-12 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1.5rem))] sm:pb-16 sm:pt-[max(4rem,calc(env(safe-area-inset-top,0px)+2rem))]';

type MobileAppContentFrameProps = {
  enabled: boolean;
  children: ReactNode;
  /** Classe de largura máxima do `container-cdl` interno (ex.: `max-w-2xl`, `max-w-lg`). */
  innerMaxWidthClass?: string;
};

/**
 * Envelope para páginas institucionais abertas dentro do WebView `/m/{token}/`:
 * preenche a altura útil, safe-area superior e spacer inferior.
 */
export function MobileAppContentFrame({
  enabled,
  children,
  innerMaxWidthClass = 'max-w-2xl',
}: MobileAppContentFrameProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col bg-gradient-to-b from-white to-cdl-gray/30 ${APP_VIEWPORT_PADDING}`}
    >
      {children}
      <div className="min-h-16 flex-1 shrink-0" aria-hidden />
    </div>
  );
}

/** Wrapper interno padrão das telas de campanha/inscrição no app. */
export function mobileAppInnerContainer(
  enabled: boolean,
  innerMaxWidthClass = 'max-w-2xl',
): string {
  return enabled ?
      `container-cdl w-full ${innerMaxWidthClass} flex min-h-0 flex-1 flex-col`
    : `container-cdl ${innerMaxWidthClass}`;
}
