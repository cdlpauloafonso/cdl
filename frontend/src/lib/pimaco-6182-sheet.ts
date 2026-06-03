/**
 * Pimaco 6182 — folha Carta, 14 etiquetas (2 colunas × 7 linhas).
 * Etiqueta: 101,6 mm × 33,9 mm (paisagem).
 */
export const PIMACO_6182 = {
  pageWidthMm: 215.9,
  pageHeightMm: 279.4,
  labelWidthMm: 101.6,
  labelHeightMm: 33.9,
  cols: 2,
  rows: 7,
  labelsPerSheet: 14,
  marginTopMm: 12.7,
  marginLeftMm: 4.8,
  gapHorizontalMm: 2.5,
  gapVerticalMm: 0,
  /** Margem interna de segurança dentro de cada etiqueta. */
  safePaddingMm: 2,
} as const;

export function pimaco6182LabelOrigin(col: number, row: number): { x: number; y: number } {
  const { marginLeftMm, marginTopMm, labelWidthMm, labelHeightMm, gapHorizontalMm, gapVerticalMm } =
    PIMACO_6182;
  return {
    x: marginLeftMm + col * (labelWidthMm + gapHorizontalMm),
    y: marginTopMm + row * (labelHeightMm + gapVerticalMm),
  };
}

export function pimaco6182SafeArea(labelX: number, labelY: number): {
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
} {
  const pad = PIMACO_6182.safePaddingMm;
  return {
    x: labelX + pad,
    y: labelY + pad,
    widthMm: PIMACO_6182.labelWidthMm - pad * 2,
    heightMm: PIMACO_6182.labelHeightMm - pad * 2,
  };
}
