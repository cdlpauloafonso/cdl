import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileNoticiasPage } from '@/components/mobile-web/MobileNoticiasPage';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Notícias — CDL Paulo Afonso',
  description: 'Notícias no modo app.',
  robots: { index: false, follow: false },
};

export default async function MobileNoticiasSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileNoticiasPage segment={`/m/${token}`} />;
}
