import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CampaignVerContent } from '@/app/institucional/campanhas/ver/CampaignVerContent';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Campanha — CDL Paulo Afonso',
  robots: { index: false, follow: false },
};

export default async function MobileCampanhaVerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  const segment = `/m/${token}`;
  return (
    <CampaignVerContent
      campanhasIndexHref={`${segment}/institucional/campanhas`}
      associeHref={`${segment}/associe-se`}
      atendimentoHref={`${segment}/atendimento`}
      fillAppShellViewport
    />
  );
}
