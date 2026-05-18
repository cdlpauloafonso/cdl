import { listHistoriaIdsAtBuild } from '@/lib/firestore-build';

export async function generateStaticParams() {
  try {
    const ids = await listHistoriaIdsAtBuild();
    const params = [{ id: 'nova' as string }, ...ids.map((id) => ({ id }))];
    return params;
  } catch {
    return [{ id: 'nova' }];
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
