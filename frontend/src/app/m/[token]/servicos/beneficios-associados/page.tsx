import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileBeneficiosAssociadosPage } from '@/components/mobile-web/MobileBeneficiosAssociadosPage';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Benefícios — CDL Paulo Afonso',
  description: 'Convênios e benefícios para associados na experiência para app.',
  robots: { index: false, follow: false },
};

export default async function MobileBeneficiosAssociadosSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  return <MobileBeneficiosAssociadosPage segment={`/m/${token}`} />;
}
