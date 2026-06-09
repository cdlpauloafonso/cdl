/**
 * Folha A4 — 14 etiquetas (2 colunas × 7 linhas), coladas verticalmente.
 * Célula: 99,1 mm × 38,1 mm; conteúdo útil: 80 mm de largura.
 */
export const PIMACO_6182 = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  labelWidthMm: 99.1,
  labelHeightMm: 38.1,
  cols: 2,
  rows: 7,
  labelsPerSheet: 14,
  /** Primeira fila a 1,7 cm do topo da folha A4. */
  marginTopMm: 17,
  marginLeftMm: (210 - 2 * 99.1) / 2,
  gapHorizontalMm: 0,
  gapVerticalMm: 0,
  /** Largura útil para título, nome, empresa e QR. */
  contentWidthMm: 80,
} as const;

export function pimaco6182LabelOrigin(col: number, row: number): { x: number; y: number } {
  const { marginLeftMm, marginTopMm, labelWidthMm, labelHeightMm, gapHorizontalMm, gapVerticalMm } =
    PIMACO_6182;
  return {
    x: marginLeftMm + col * (labelWidthMm + gapHorizontalMm),
    y: marginTopMm + row * (labelHeightMm + gapVerticalMm),
  };
}

/** Área de 80 mm centralizada na célula da etiqueta. */
export function pimaco6182ContentArea(labelX: number, labelY: number): {
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
} {
  const offsetX = (PIMACO_6182.labelWidthMm - PIMACO_6182.contentWidthMm) / 2;
  return {
    x: labelX + offsetX,
    y: labelY,
    widthMm: PIMACO_6182.contentWidthMm,
    heightMm: PIMACO_6182.labelHeightMm,
  };
}
