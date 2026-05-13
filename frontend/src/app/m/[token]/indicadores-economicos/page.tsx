import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileIndicadoresEconomicosPage } from '@/components/mobile-web/MobileIndicadoresEconomicosPage';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Indicadores econômicos — CDL Paulo Afonso',
  description: 'Dados socioeconômicos de Paulo Afonso no modo app.',
  robots: { index: false, follow: false },
};

export default async function MobileIndicadoresEconomicosSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileIndicadoresEconomicosPage segment={`/m/${token}`} />;
}
