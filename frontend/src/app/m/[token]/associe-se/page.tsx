import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileAssocieSePage } from '@/components/mobile-web/MobileAssocieSePage';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Associe-se — CDL Paulo Afonso',
  description: 'Faça parte da CDL Paulo Afonso — experiência para app/WebView.',
  robots: { index: false, follow: false },
};

export default async function MobileAssocieSeSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileAssocieSePage segment={`/m/${token}`} />;
}
