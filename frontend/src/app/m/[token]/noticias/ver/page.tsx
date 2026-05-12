import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileNoticiasVer } from '@/components/mobile-web/MobileNoticiasVer';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Notícia — CDL Paulo Afonso',
  robots: { index: false, follow: false },
};

export default async function MobileNoticiasVerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileNoticiasVer segment={`/m/${token}`} />;
}
