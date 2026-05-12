/**
 * Segmento secreto para WebView/App (ex.: /m/cdl-mobile-x7k9m356yt1).
 * Deve coincidir com `AppWebConfig.mobileSecretPath` no app iOS (Xcode CDLPauloAfonso).
 * Defina NEXT_PUBLIC_MOBILE_WEBVIEW_TOKEN no build para trocar o token (Swift e este valor devem ficar iguais).
 */
export function getMobileWebviewToken(): string {
  const raw = process.env.NEXT_PUBLIC_MOBILE_WEBVIEW_TOKEN;
  const t = typeof raw === 'string' ? raw.trim() : '';
  return t.length > 0 ? t : 'cdl-mobile-x7k9m356yt1';
}

export function isValidMobileWebviewToken(token: string): boolean {
  return token === getMobileWebviewToken();
}
