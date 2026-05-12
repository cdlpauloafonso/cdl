import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileMeAssociarInShell } from '@/components/mobile-web/MobileMeAssociarInShell';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Me associar — CDL Paulo Afonso',
  description: 'Cadastro de associação — formulário adaptado ao app.',
  robots: { index: false, follow: false },
};

export default async function MobileMeAssociarSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileMeAssociarInShell segment={`/m/${token}`} />;
}
