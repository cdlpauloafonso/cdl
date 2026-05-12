import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileAtendimentoPage } from '@/components/mobile-web/MobileAtendimentoPage';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Fale conosco — CDL Paulo Afonso',
  description: 'Atendimento e contato — experiência para app.',
  robots: { index: false, follow: false },
};

export default async function MobileAtendimentoSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileAtendimentoPage segment={`/m/${token}`} />;
}
