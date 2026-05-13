import { MOBILE_SHELL_CANVAS_FALLBACK, MOBILE_SHELL_VIEWPORT_GRADIENT } from '@/components/mobile-web/mobile-shell-viewport-gradient';

/**
 * Fundo preso ao viewport (não rola com o documento).
 * Reforça o mesmo degradê aplicado em {@link MobileWebviewDocumentBackdrop} no canvas (fixed).
 */
export function MobileShellViewportBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-full"
      style={{
        backgroundColor: MOBILE_SHELL_CANVAS_FALLBACK,
        backgroundImage: MOBILE_SHELL_VIEWPORT_GRADIENT,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center top',
      }}
    />
  );
}
