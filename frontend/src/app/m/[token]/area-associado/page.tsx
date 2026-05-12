import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileAreaAssociadoPage } from '@/components/mobile-web/MobileAreaAssociadoPage';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Área do associado — CDL Paulo Afonso',
  description: 'Área do associado no modo app.',
  robots: { index: false, follow: false },
};

export default async function MobileAreaAssociadoSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileAreaAssociadoPage segment={`/m/${token}`} />;
}
