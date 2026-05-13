'use client';

import { useEffect } from 'react';
import { MOBILE_SHELL_CANVAS_FALLBACK } from '@/components/mobile-web/mobile-shell-viewport-gradient';

/** Classe em `document.documentElement` — estilos globais só no app `/m/` (ex.: scrollbar). */
export const MOBILE_SHELL_HTML_CLASS = 'mobile-shell-app';

/** Tom base do canvas do documento (painel claro). Degradê do hero: só {@link MobileShellViewportBackdrop}. */
export const MOBILE_WEBVIEW_PAGE_BG = MOBILE_SHELL_CANVAS_FALLBACK;

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
    const prevBodyBgColor = body.style.backgroundColor;
    const prevBodyBgImg = body.style.backgroundImage;
    const prevBodyBgSize = body.style.backgroundSize;
    const prevBodyBgRepeat = body.style.backgroundRepeat;
    const prevBodyBgPosition = body.style.backgroundPosition;
    const prevBodyBgAttachment = body.style.backgroundAttachment;

    const paintSolid = (el: HTMLElement) => {
      el.style.backgroundColor = MOBILE_SHELL_CANVAS_FALLBACK;
      el.style.backgroundImage = 'none';
      el.style.backgroundSize = '';
      el.style.backgroundRepeat = '';
      el.style.backgroundPosition = '';
      el.style.backgroundAttachment = '';
    };

    paintSolid(html);
    paintSolid(body);

    html.classList.add(MOBILE_SHELL_HTML_CLASS);

    return () => {
      html.style.backgroundColor = prevHtmlBgColor;
      html.style.backgroundImage = prevHtmlBgImg;
      html.style.backgroundSize = prevHtmlBgSize;
      html.style.backgroundRepeat = prevHtmlBgRepeat;
      html.style.backgroundPosition = prevHtmlBgPosition;
      html.style.backgroundAttachment = prevHtmlBgAttachment;
      body.style.backgroundColor = prevBodyBgColor;
      body.style.backgroundImage = prevBodyBgImg;
      body.style.backgroundSize = prevBodyBgSize;
      body.style.backgroundRepeat = prevBodyBgRepeat;
      body.style.backgroundPosition = prevBodyBgPosition;
      body.style.backgroundAttachment = prevBodyBgAttachment;
      html.classList.remove(MOBILE_SHELL_HTML_CLASS);
    };
  }, []);

  return null;
}
