/** Rola a janela e ancestrais scrolláveis ao topo (site e WebView `/m/`). */
export function scrollViewportToTop(anchor?: HTMLElement | null): void {
  if (typeof window === 'undefined') return;

  const scrollInstant = (el: Element | Window) => {
    try {
      el.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    } catch {
      /* fall through */
    }
    if (el instanceof HTMLElement) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  };

  scrollInstant(window);
  scrollInstant(document.documentElement);
  scrollInstant(document.body);

  const scrollingEl = document.scrollingElement;
  if (scrollingEl) scrollInstant(scrollingEl);

  document.querySelectorAll('[data-mobile-shell]').forEach((node) => scrollInstant(node));

  if (anchor) {
    let parent = anchor.parentElement;
    while (parent) {
      const { overflowY } = getComputedStyle(parent);
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
        scrollInstant(parent);
      }
      parent = parent.parentElement;
    }
    try {
      anchor.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
    } catch {
      anchor.scrollIntoView(true);
    }
  }
}

/** Após pintura do DOM (troca de etapa / exibição do QR). */
export function scrollViewportToTopAfterPaint(anchor?: HTMLElement | null): void {
  scrollViewportToTop(anchor);
  requestAnimationFrame(() => {
    scrollViewportToTop(anchor);
    requestAnimationFrame(() => scrollViewportToTop(anchor));
  });
}
