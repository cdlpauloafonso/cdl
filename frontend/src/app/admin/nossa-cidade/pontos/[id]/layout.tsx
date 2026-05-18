import { listNossaCidadePontoIdsAtBuild } from '@/lib/firestore-build';

export async function generateStaticParams() {
  try {
    const ids = await listNossaCidadePontoIdsAtBuild();
    return [{ id: 'novo' }, ...ids.map((id) => ({ id }))];
  } catch {
    return [{ id: 'novo' }];
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
