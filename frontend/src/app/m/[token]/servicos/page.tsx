import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MobileServicosPage } from '@/components/mobile-web/MobileServicosPage';
import { getServiciosDisplayList } from '@/lib/servicos-page-data';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Serviços — CDL Paulo Afonso',
  description: 'Catálogo de serviços no modo app.',
  robots: { index: false, follow: false },
};

export default async function MobileServicosSegmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  const services = await getServiciosDisplayList();
  return <MobileServicosPage segment={`/m/${token}`} services={services} />;
}
