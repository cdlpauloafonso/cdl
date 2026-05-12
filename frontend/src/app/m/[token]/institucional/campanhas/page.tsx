import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileCampanhasPage } from '@/components/mobile-web/MobileCampanhasPage';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Campanhas — CDL Paulo Afonso',
  description: 'Campanhas e eventos no modo app.',
  robots: { index: false, follow: false },
};

export default async function MobileCampanhasSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileCampanhasPage segment={`/m/${token}`} />;
}
