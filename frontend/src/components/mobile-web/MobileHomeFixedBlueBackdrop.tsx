import { MOBILE_HOME_FIXED_BLUE_GRADIENT } from '@/components/mobile-web/mobile-home-fixed-backdrop';

/**
 * Fundo azul degradê da home: fixo no viewport iOS, preenche a tela inteira (incl. safe areas e overscroll).
 * O conteúdo da página rola por cima com rubber-band; este layer não se move.
 */
export function MobileHomeFixedBlueBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-0 w-full"
      style={{
        top: 'calc(-1 * env(safe-area-inset-top, 0px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
        height: 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        minHeight: 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        backgroundColor: '#0b1224',
        backgroundImage: MOBILE_HOME_FIXED_BLUE_GRADIENT,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center top',
      }}
    />
  );
}
