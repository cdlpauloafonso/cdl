import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AppParticipantCheckInClient } from '@/components/mobile-web/AppParticipantCheckInClient';
import { listCampaignIdsAtBuild } from '@/lib/firestore-build';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export const metadata: Metadata = {
  title: 'Check-in — CDL Paulo Afonso',
  robots: { index: false, follow: false },
};

export async function generateStaticParams() {
  const token = getMobileWebviewToken();
  try {
    const ids = await listCampaignIdsAtBuild();
    if (ids.length > 0) {
      return ids.map((eventId) => ({ token, eventId }));
    }
  } catch {
    /* build sem Firebase Admin */
  }
  return [{ token, eventId: '_' }];
}

export default async function MobileAppCheckInPage({
  params,
}: {
  params: Promise<{ token: string; eventId: string }>;
}) {
  const { token, eventId } = await params;
  if (!isValidMobileWebviewToken(token) || !eventId?.trim() || eventId === '_') {
    notFound();
  }

  return <AppParticipantCheckInClient eventId={eventId.trim()} />;
}
