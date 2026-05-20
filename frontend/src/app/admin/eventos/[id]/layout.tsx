import { listCampaignIdsAtBuild } from '@/lib/firestore-build';

export async function generateStaticParams() {
  try {
    const ids = await listCampaignIdsAtBuild();
    if (ids.length > 0) return ids.map((id) => ({ id }));
  } catch {
    /* build sem Firebase Admin */
  }
  // `output: export` exige ao menos um id; rotas reais vêm do Firestore no cliente.
  return [{ id: '_' }];
}

export default function AdminEventoDetalheLayout({ children }: { children: React.ReactNode }) {
  return children;
}
