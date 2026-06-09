import { formatEtiquetaEventTitle } from '@/lib/inscription-etiqueta-layout';

/** Largura do sheet no modal (`w-[90mm]`) + `text-[9px]`. */
const ETIQUETA_TITLE_REF_WIDTH_MM = 90;
const TITLE_FONT_PX = 9;
const TITLE_FONT_WEIGHT = 600;
const TITLE_TRACKING_EM = 0.025;
const TITLE_LINE_HEIGHT = 1.25;
const TITLE_COLOR = '#6b7280';
const TITLE_MARGIN_BOTTOM_PX = 4;
const RENDER_SCALE = 4;

export type EtiquetaEventTitleImage = {
  dataUrl: string;
  textWidthMm: number;
  /** Altura só do texto (sem margem inferior). */
  textHeightMm: number;
  /** mb-1 abaixo do título, proporcional à largura da etiqueta. */
  marginBottomMm: number;
};

function scaleForLabelWidth(labelWidthMm: number): number {
  return labelWidthMm / ETIQUETA_TITLE_REF_WIDTH_MM;
}

function measureWithTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  trackingPx: number,
): number {
  if (!text) return 0;
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += ctx.measureText(text[i]!).width;
    if (i < text.length - 1) w += trackingPx;
  }
  return w;
}

function wrapWordWithTracking(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidthPx: number,
  trackingPx: number,
): string[] {
  if (measureWithTracking(ctx, word, trackingPx) <= maxWidthPx) return [word];

  const chunks: string[] = [];
  let chunk = '';
  for (const ch of word) {
    const candidate = `${chunk}${ch}`;
    if (measureWithTracking(ctx, candidate, trackingPx) <= maxWidthPx) {
      chunk = candidate;
    } else {
      if (chunk) chunks.push(chunk);
      chunk = ch;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks.length > 0 ? chunks : [word];
}

/** Quebra o título em linhas dentro da largura útil, sem truncar. */
function wrapTextWithTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
  trackingPx: number,
): string[] {
  const words = text.split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  const pushLine = (line: string) => {
    if (line) lines.push(line);
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureWithTracking(ctx, candidate, trackingPx) <= maxWidthPx) {
      current = candidate;
      continue;
    }

    pushLine(current);

    const wordLines = wrapWordWithTracking(ctx, word, maxWidthPx, trackingPx);
    for (let i = 0; i < wordLines.length - 1; i++) {
      pushLine(wordLines[i]!);
    }
    current = wordLines[wordLines.length - 1] ?? '';
  }

  pushLine(current);
  return lines;
}

function drawWithTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  trackingPx: number,
): void {
  let cursor = x;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + (i < text.length - 1 ? trackingPx : 0);
  }
}

function canvasFont(scale: number): string {
  const fontPx = TITLE_FONT_PX * scale * RENDER_SCALE;
  return `${TITLE_FONT_WEIGHT} ${fontPx}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
}

/**
 * Renderiza o título do evento como PNG (tipografia idêntica à etiqueta web).
 * Só no browser — `document` + canvas.
 */
export function createEtiquetaEventTitleImage(
  eventTitle: string | undefined,
  labelWidthMm: number,
  maxTextWidthMm: number,
): EtiquetaEventTitleImage | null {
  if (typeof document === 'undefined') return null;

  const formatted = formatEtiquetaEventTitle(eventTitle);
  if (!formatted) return null;

  const scale = scaleForLabelWidth(labelWidthMm);
  const fontPx = TITLE_FONT_PX * scale * RENDER_SCALE;
  const trackingPx = fontPx * TITLE_TRACKING_EM;
  const maxWidthPx = (maxTextWidthMm / 25.4) * 96 * RENDER_SCALE;
  const lineHeightPx = Math.ceil(fontPx * TITLE_LINE_HEIGHT);

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) return null;

  measureCtx.font = canvasFont(scale);
  const lines = wrapTextWithTracking(measureCtx, formatted, maxWidthPx, trackingPx);
  if (lines.length === 0) return null;

  const textWidthPx = Math.ceil(maxWidthPx);
  const textHeightPx = lines.length * lineHeightPx;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, textWidthPx);
  canvas.height = Math.max(1, textHeightPx);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.font = canvasFont(scale);
  ctx.fillStyle = TITLE_COLOR;
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    drawWithTracking(ctx, line, 0, index * lineHeightPx, trackingPx);
  });

  const pxToMm = (px: number) => (px / RENDER_SCALE / 96) * 25.4;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    textWidthMm: pxToMm(textWidthPx),
    textHeightMm: pxToMm(textHeightPx),
    marginBottomMm: ((TITLE_MARGIN_BOTTOM_PX * scale) / 96) * 25.4,
  };
}
