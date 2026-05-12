'use client';

import { useEffect } from 'react';

/** Classe em `document.documentElement` — estilos globais só no app `/m/` (ex.: scrollbar). */
export const MOBILE_SHELL_HTML_CLASS = 'mobile-shell-app';

/** Mesmo `#0b1224` do layout `/m/[token]` / fundo inferior do degrade do topo — usado na raiz para o bounce iOS não revelar branco. */
export const MOBILE_WEBVIEW_PAGE_BG = '#0b1224';

/**
 * Nos WebViews/Safari, o “rubber band” no topo usa o fundo de `html`/`body`;
 * garante azul até ao infinito percebido mesmo ao puxar a página para baixo.
 */
export function MobileWebviewDocumentBackdrop() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlBgColor = html.style.backgroundColor;
    const prevHtmlBgImg = html.style.backgroundImage;
    const prevBodyBgColor = body.style.backgroundColor;

    html.style.backgroundColor = MOBILE_WEBVIEW_PAGE_BG;
    html.style.backgroundImage = 'linear-gradient(180deg, #172554 0%, #0b1224 100%)';
    body.style.backgroundColor = 'transparent';
    html.classList.add(MOBILE_SHELL_HTML_CLASS);

    return () => {
      html.style.backgroundColor = prevHtmlBgColor;
      html.style.backgroundImage = prevHtmlBgImg;
      body.style.backgroundColor = prevBodyBgColor;
      html.classList.remove(MOBILE_SHELL_HTML_CLASS);
    };
  }, []);

  return null;
}
