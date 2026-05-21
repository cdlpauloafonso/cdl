/** Deve coincidir com NEXT_PUBLIC_MOBILE_WEBVIEW_TOKEN no frontend / segmento do app iOS. */
export function getMobileWebviewToken(): string {
  const raw = process.env.MOBILE_WEBVIEW_TOKEN ?? process.env.NEXT_PUBLIC_MOBILE_WEBVIEW_TOKEN;
  const t = typeof raw === 'string' ? raw.trim() : '';
  return t.length > 0 ? t : 'cdl-mobile-x7k9m356yt1';
}

export function isValidMobileWebviewToken(token: string): boolean {
  return token === getMobileWebviewToken();
}
