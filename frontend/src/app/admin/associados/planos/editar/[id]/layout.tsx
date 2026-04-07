import { listPlanoIdsAtBuild } from '@/lib/firestore-build';

export async function generateStaticParams() {
  try {
    const ids = await listPlanoIdsAtBuild();
    if (ids.length === 0) return [{ id: '_' }];
    return ids.map((id) => ({ id }));
  } catch {
    return [{ id: '_' }];
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
