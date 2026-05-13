'use client';

import { useEffect } from 'react';

/** Classe em `document.documentElement` — estilos globais só no app `/m/` (ex.: scrollbar). */
export const MOBILE_SHELL_HTML_CLASS = 'mobile-shell-app';

/** Tom base do canvas do shell — alinhado ao painel claro; hero azul cobre o topo via camadas fixas. */
export const MOBILE_WEBVIEW_PAGE_BG = '#eef2fb';

/**
 * Marca `html`, define tapete claro no canvas (bounce inferior contínuo com o <main>).
 * O degradê do hero fica em {@link MobileShellViewportBackdrop} (`position: fixed`).
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

    html.style.backgroundColor = MOBILE_WEBVIEW_PAGE_BG;
    html.style.backgroundImage = 'none';
    html.style.backgroundSize = '';
    html.style.backgroundRepeat = '';
    html.style.backgroundPosition = '';
    body.style.backgroundColor = MOBILE_WEBVIEW_PAGE_BG;
    body.style.backgroundImage = 'none';
    body.style.backgroundSize = '';
    body.style.backgroundRepeat = '';
    body.style.backgroundPosition = '';
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
