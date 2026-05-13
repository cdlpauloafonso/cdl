'use client';

import { useEffect } from 'react';

/** Classe em `document.documentElement` — estilos globais só no app `/m/` (ex.: scrollbar). */
export const MOBILE_SHELL_HTML_CLASS = 'mobile-shell-app';

/** Canvas do documento para o overscroll superior do iOS: deve revelar azul (nunca branco). */
export const MOBILE_WEBVIEW_PAGE_BG = '#0b1224';

/**
 * Marca `html` e define fundo sólido no canvas.
 * Evita `background-attachment: fixed` e degradê em html/body — no Safari/WKWebView isso costuma matar o rubber-band.
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
    const prevHtmlBgAttachment = html.style.backgroundAttachment;
    const prevHtmlOverflowX = html.style.overflowX;
    const prevHtmlOverflowY = html.style.overflowY;
    const prevHtmlWebkitOverflowScrolling = html.style.getPropertyValue('-webkit-overflow-scrolling');
    const prevBodyBgColor = body.style.backgroundColor;
    const prevBodyBgImg = body.style.backgroundImage;
    const prevBodyBgSize = body.style.backgroundSize;
    const prevBodyBgRepeat = body.style.backgroundRepeat;
    const prevBodyBgPosition = body.style.backgroundPosition;
    const prevBodyBgAttachment = body.style.backgroundAttachment;
    const prevBodyOverflowX = body.style.overflowX;
    const prevBodyOverflowY = body.style.overflowY;
    const prevBodyWebkitOverflowScrolling = body.style.getPropertyValue('-webkit-overflow-scrolling');

    const paintSolid = (el: HTMLElement) => {
      el.style.backgroundColor = MOBILE_WEBVIEW_PAGE_BG;
      el.style.backgroundImage = 'none';
      el.style.backgroundSize = '';
      el.style.backgroundRepeat = '';
      el.style.backgroundPosition = '';
      el.style.backgroundAttachment = '';
    };

    paintSolid(html);
    paintSolid(body);
    // Defensive reset: alguns fluxos do drawer podem deixar overflow inline preso e matar o rubber-band.
    html.style.overflowX = 'visible';
    html.style.overflowY = 'auto';
    html.style.setProperty('-webkit-overflow-scrolling', 'touch');
    body.style.overflowX = 'visible';
    body.style.overflowY = 'auto';
    body.style.setProperty('-webkit-overflow-scrolling', 'touch');

    html.classList.add(MOBILE_SHELL_HTML_CLASS);

    return () => {
      html.style.backgroundColor = prevHtmlBgColor;
      html.style.backgroundImage = prevHtmlBgImg;
      html.style.backgroundSize = prevHtmlBgSize;
      html.style.backgroundRepeat = prevHtmlBgRepeat;
      html.style.backgroundPosition = prevHtmlBgPosition;
      html.style.backgroundAttachment = prevHtmlBgAttachment;
      html.style.overflowX = prevHtmlOverflowX;
      html.style.overflowY = prevHtmlOverflowY;
      if (prevHtmlWebkitOverflowScrolling) {
        html.style.setProperty('-webkit-overflow-scrolling', prevHtmlWebkitOverflowScrolling);
      } else {
        html.style.removeProperty('-webkit-overflow-scrolling');
      }
      body.style.backgroundColor = prevBodyBgColor;
      body.style.backgroundImage = prevBodyBgImg;
      body.style.backgroundSize = prevBodyBgSize;
      body.style.backgroundRepeat = prevBodyBgRepeat;
      body.style.backgroundPosition = prevBodyBgPosition;
      body.style.backgroundAttachment = prevBodyBgAttachment;
      body.style.overflowX = prevBodyOverflowX;
      body.style.overflowY = prevBodyOverflowY;
      if (prevBodyWebkitOverflowScrolling) {
        body.style.setProperty('-webkit-overflow-scrolling', prevBodyWebkitOverflowScrolling);
      } else {
        body.style.removeProperty('-webkit-overflow-scrolling');
      }
      html.classList.remove(MOBILE_SHELL_HTML_CLASS);
    };
  }, []);

  return null;
}
