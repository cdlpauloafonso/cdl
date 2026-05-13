/**
 * Fundo preso ao viewport (não rola com o documento).
 * Topo: hero azul; a partir de ~metade inferior só #eef2fb — evita “sanduíche” branco → azul → branco
 * no bounce em baixo (wrapper/html escuros + degradê ainda azul no viewport).
 */
export function MobileShellViewportBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-full bg-[#eef2fb]"
      style={{
        backgroundImage:
          'linear-gradient(180deg, #1E3A8A 0%, #0b1224 28%, #0b1224 38%, #eef2fb 46%, #eef2fb 100%)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center top',
      }}
    />
  );
}
