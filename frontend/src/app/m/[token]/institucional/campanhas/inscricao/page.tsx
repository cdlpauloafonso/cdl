import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CampaignInscriptionContent } from '@/app/institucional/campanhas/inscricao/CampaignInscriptionContent';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export function generateStaticParams() {
  return [{ token: getMobileWebviewToken() }];
}

export const metadata: Metadata = {
  title: 'Inscrição — CDL Paulo Afonso',
  robots: { index: false, follow: false },
};

export default async function MobileCampanhaInscricaoPage({
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
    <CampaignInscriptionContent
      campanhasIndexHref={`${segment}/institucional/campanhas`}
      associeHref={`${segment}/associe-se`}
      fillAppShellViewport
    />
  );
}
