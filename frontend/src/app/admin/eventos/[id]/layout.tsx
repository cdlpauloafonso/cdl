import { listCampaignIdsAtBuild } from '@/lib/firestore-build';

export async function generateStaticParams() {
  try {
    const ids = await listCampaignIdsAtBuild();
    return ids.map((id) => ({ id }));
  } catch {
    return [];
  }
}

export default function AdminEventoDetalheLayout({ children }: { children: React.ReactNode }) {
  return children;
}
