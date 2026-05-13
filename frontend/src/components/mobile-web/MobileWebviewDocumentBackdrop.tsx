'use client';

import { useEffect } from 'react';

/** Classe em `document.documentElement` — estilos globais só no app `/m/` (ex.: scrollbar). */
export const MOBILE_SHELL_HTML_CLASS = 'mobile-shell-app';

/** Tom inferior do degradê azul (miolo / hero). */
export const MOBILE_WEBVIEW_PAGE_BG = '#0b1224';

/** Cor “tapete” por baixo de todo o scroll — alinha ao fim do painel claro (`to-[#eef2fb]` na home mobile). No bounce no fim da página não aparece #0b1224 atrás do branco. */
export const MOBILE_WEBVIEW_DOCUMENT_BOTTOM_BG = '#eef2fb';

/** Altura da faixa degradê no topo do documento; abaixo disso vê-se só `MOBILE_WEBVIEW_DOCUMENT_BOTTOM_BG`. */
const MOBILE_WEBVIEW_DOCUMENT_GRADIENT_HEIGHT = 'min(92vh, 760px)';

/** Azul institucional (`cdl.blue`) — deve ser o primeiro stop do degradê para o bounce no topo não revelar `#172554`. */
export const MOBILE_WEBVIEW_DOCUMENT_TOP_BLUE = '#1E3A8A';

/** Degradê só na zona superior; o resto do canvas usa `MOBILE_WEBVIEW_DOCUMENT_BOTTOM_BG`. */
const MOBILE_WEBVIEW_DOCUMENT_GRADIENT = `linear-gradient(180deg, ${MOBILE_WEBVIEW_DOCUMENT_TOP_BLUE} 0%, ${MOBILE_WEBVIEW_PAGE_BG} 100%)`;

/**
 * Nos WebViews/Safari, o “rubber band” pinta contra `html`/`body`:
 * mesmo azul do topo na faixa inicial; fundo claro por defeito para o elastic no fim da página não mostrar azul escuro atrás da área branca.
 */
export function MobileWebviewDocumentBackdrop() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlBgColor = html.style.backgroundColor;
    const prevHtmlBgImg = html.style.backgroundImage;
    const prevHtmlBgSize = html.style.backgroundSize;
    const prevHtmlBgRepeat = html.style.backgroundRepeat;
    const prevHtmlBgPosition = html.style.backgroundPosition;
    const prevBodyBgColor = body.style.backgroundColor;
    const prevBodyBgImg = body.style.backgroundImage;
    const prevBodyBgSize = body.style.backgroundSize;
    const prevBodyBgRepeat = body.style.backgroundRepeat;
    const prevBodyBgPosition = body.style.backgroundPosition;

    html.style.backgroundColor = MOBILE_WEBVIEW_DOCUMENT_BOTTOM_BG;
    html.style.backgroundImage = MOBILE_WEBVIEW_DOCUMENT_GRADIENT;
    html.style.backgroundSize = `100% ${MOBILE_WEBVIEW_DOCUMENT_GRADIENT_HEIGHT}`;
    html.style.backgroundRepeat = 'no-repeat';
    html.style.backgroundPosition = 'top center';
    body.style.backgroundColor = MOBILE_WEBVIEW_DOCUMENT_BOTTOM_BG;
    body.style.backgroundImage = MOBILE_WEBVIEW_DOCUMENT_GRADIENT;
    body.style.backgroundSize = `100% ${MOBILE_WEBVIEW_DOCUMENT_GRADIENT_HEIGHT}`;
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundPosition = 'top center';
    html.classList.add(MOBILE_SHELL_HTML_CLASS);

    return () => {
      html.style.backgroundColor = prevHtmlBgColor;
      html.style.backgroundImage = prevHtmlBgImg;
      html.style.backgroundSize = prevHtmlBgSize;
      html.style.backgroundRepeat = prevHtmlBgRepeat;
      html.style.backgroundPosition = prevHtmlBgPosition;
      body.style.backgroundColor = prevBodyBgColor;
      body.style.backgroundImage = prevBodyBgImg;
      body.style.backgroundSize = prevBodyBgSize;
      body.style.backgroundRepeat = prevBodyBgRepeat;
      body.style.backgroundPosition = prevBodyBgPosition;
      html.classList.remove(MOBILE_SHELL_HTML_CLASS);
    };
  }, []);

  return null;
}
