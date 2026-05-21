import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AppEventCredentialingClient } from '@/components/mobile-web/AppEventCredentialingClient';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export const metadata: Metadata = {
  title: 'Credenciamento — CDL Paulo Afonso',
  robots: { index: false, follow: false },
};

export default async function MobileAppEventCredentialingPage({
  params,
}: {
  params: Promise<{ token: string; eventId: string }>;
}) {
  const { token, eventId } = await params;
  if (!isValidMobileWebviewToken(token) || !eventId?.trim()) {
    notFound();
  }

  return <AppEventCredentialingClient eventId={eventId.trim()} mobileToken={token} />;
}
