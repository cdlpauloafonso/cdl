'use client';

import { useEffect } from 'react';

/** Classe em `document.documentElement` — estilos globais só no app `/m/` (ex.: scrollbar). */
export const MOBILE_SHELL_HTML_CLASS = 'mobile-shell-app';

/** Mesmo `#0b1224` do layout `/m/[token]` / fundo inferior do degrade do topo — raiz ao elastic/bounce ver só este tom. */
export const MOBILE_WEBVIEW_PAGE_BG = '#0b1224';

/** Degradê idêntico em `html` e `body` para o bounce não revelar seams nem o `bg-white` default do layout. */
const MOBILE_WEBVIEW_DOCUMENT_GRADIENT = 'linear-gradient(180deg, #172554 0%, #0b1224 100%)';

/**
 * Nos WebViews/Safari, o “rubber band” pinta atrás contra `html`/`body`; ambos com o mesmo degradê azul escuro,
 * assim o elastic continua evidente mas não aparece ruído (branco, listras, conteúdo “além” do strip).
 */
export function MobileWebviewDocumentBackdrop() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlBgColor = html.style.backgroundColor;
    const prevHtmlBgImg = html.style.backgroundImage;
    const prevBodyBgColor = body.style.backgroundColor;
    const prevBodyBgImg = body.style.backgroundImage;

    html.style.backgroundColor = MOBILE_WEBVIEW_PAGE_BG;
    html.style.backgroundImage = MOBILE_WEBVIEW_DOCUMENT_GRADIENT;
    body.style.backgroundColor = MOBILE_WEBVIEW_PAGE_BG;
    body.style.backgroundImage = MOBILE_WEBVIEW_DOCUMENT_GRADIENT;
    html.classList.add(MOBILE_SHELL_HTML_CLASS);

    return () => {
      html.style.backgroundColor = prevHtmlBgColor;
      html.style.backgroundImage = prevHtmlBgImg;
      body.style.backgroundColor = prevBodyBgColor;
      body.style.backgroundImage = prevBodyBgImg;
      html.classList.remove(MOBILE_SHELL_HTML_CLASS);
    };
  }, []);

  return null;
}
