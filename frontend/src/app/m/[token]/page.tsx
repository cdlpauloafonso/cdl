import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileCDLHome } from '@/components/mobile-web/MobileCDLHome';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'CDL Paulo Afonso',
  description: 'Experiência mobile da CDL Paulo Afonso — comércio, serviços e comunidade empresarial.',
  robots: { index: false, follow: false },
};

export default async function MobileWebviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileCDLHome />;
}
