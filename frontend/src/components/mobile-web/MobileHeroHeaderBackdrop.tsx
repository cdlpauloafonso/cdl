/**
 * Duas camadas na hero do topo:
 * Por defeito ficam fixed ao viewport (`viewportFixed`): o miolo desliza, o degrade não,
 * reduz artefactos ao arrastar ou ver “casacos” atrás das camadas absolutas na header.
 * Com viewportFixed=false, usa ancora na própria header (absolute, fluxo legacy).
 */

type MobileHeroHeaderBackdropProps = {
  variant: 'home' | 'subpage';
  /** Quando true, fundo preso ao ecrã; conteúdo da página rola por cima. Default: true */
  viewportFixed?: boolean;
};

const LINEAR_BLEED =
  'pointer-events-none absolute inset-x-0 bottom-0 -top-[100dvh] bg-[linear-gradient(180deg,#172554_0%,#0b1224_100%)]';

const FIXED_LINEAR_BLEED =
  'pointer-events-none fixed inset-x-0 top-0 z-0 min-h-[120dvh] w-full bg-[linear-gradient(180deg,#172554_0%,#0b1224_100%)]';

const GLOW_HOME =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.35),transparent),linear-gradient(180deg,#172554_0%,#0b1224_100%)]';

const GLOW_HOME_FIXED =
  'pointer-events-none fixed inset-x-0 top-0 z-0 min-h-[120dvh] w-full max-w-none bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.35),transparent),linear-gradient(180deg,#172554_0%,#0b1224_100%)]';

const GLOW_SUBPAGE =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.28),transparent),linear-gradient(180deg,#172554_0%,#0b1224_100%)]';

const GLOW_SUBPAGE_FIXED =
  'pointer-events-none fixed inset-x-0 top-0 z-0 min-h-[120dvh] w-full max-w-none bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.28),transparent),linear-gradient(180deg,#172554_0%,#0b1224_100%)]';

export function MobileHeroHeaderBackdrop({
  variant,
  viewportFixed = true,
}: MobileHeroHeaderBackdropProps) {
  if (viewportFixed) {
    const glowClass = variant === 'home' ? GLOW_HOME_FIXED : GLOW_SUBPAGE_FIXED;
    return (
      <>
        <div className={FIXED_LINEAR_BLEED} aria-hidden />
        <div className={glowClass} aria-hidden />
      </>
    );
  }

  const glowClass = variant === 'home' ? GLOW_HOME : GLOW_SUBPAGE;
  return (
    <>
      <div className={LINEAR_BLEED} aria-hidden />
      <div className={glowClass} aria-hidden />
    </>
  );
}
