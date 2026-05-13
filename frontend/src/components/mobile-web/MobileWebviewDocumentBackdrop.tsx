'use client';

import { useEffect } from 'react';
import {
  MOBILE_SHELL_CANVAS_FALLBACK,
  MOBILE_SHELL_VIEWPORT_GRADIENT,
} from '@/components/mobile-web/mobile-shell-viewport-gradient';

/** Classe em `document.documentElement` — estilos globais só no app `/m/` (ex.: scrollbar). */
export const MOBILE_SHELL_HTML_CLASS = 'mobile-shell-app';

/** Fallback sólido atrás do degradê (tapete claro na zona inferior). */
export const MOBILE_WEBVIEW_PAGE_BG = MOBILE_SHELL_CANVAS_FALLBACK;

/**
 * Marca `html` e pinta o mesmo degradê fixo ao viewport que {@link MobileShellViewportBackdrop},
 * para o bounce da WKWebView revelar cores coerentes (sem pedir `overscroll-behavior-y: contain`,
 * que no WebKit tende a matar o elástico vertical).
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

    const paintFixedViewportGradient = (el: HTMLElement) => {
      el.style.backgroundColor = MOBILE_SHELL_CANVAS_FALLBACK;
      el.style.backgroundImage = MOBILE_SHELL_VIEWPORT_GRADIENT;
      el.style.backgroundAttachment = 'fixed';
      el.style.backgroundSize = '100% 100%';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center top';
    };

    paintFixedViewportGradient(html);
    paintFixedViewportGradient(body);

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
