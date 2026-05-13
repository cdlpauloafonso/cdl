import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileNossaCidadePage } from '@/components/mobile-web/MobileNossaCidadePage';
import { getNossaCidadeInstitutionalPayload } from '@/lib/nossa-cidade-institutional-data';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Nossa cidade — CDL Paulo Afonso',
  description: 'Conheça Paulo Afonso no modo app.',
  robots: { index: false, follow: false },
};

export default async function MobileNossaCidadeSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  const payload = await getNossaCidadeInstitutionalPayload();
  return <MobileNossaCidadePage segment={`/m/${token}`} {...payload} />;
}
