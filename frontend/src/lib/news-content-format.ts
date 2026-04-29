/**
 * Detecta se o texto parece HTML (tags), para decidir entre dangerouslySetInnerHTML
 * e texto puro com preservação de quebras de linha.
 */
export function isProbablyHtml(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  return /<\/?[a-z][a-z0-9]*\b/i.test(s);
}
