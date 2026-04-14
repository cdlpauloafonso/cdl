import { listCampaignIdsAtBuild } from '@/lib/firestore-build';
import { EventInscriptionClient } from './EventInscriptionClient';

/**
 * Com `output: 'export'`, a inscrição fica em `/campanhas/inscricao/[slug]` (um único segmento
 * dinâmico), evitando erro do Next com rotas `[slug]/inscricao` aninhadas.
 */
export async function generateStaticParams() {
  const ids = await listCampaignIdsAtBuild();
  if (ids.length === 0) return [{ slug: '__fallback__' }];
  return ids.map((slug) => ({ slug }));
}

export default async function EventInscriptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EventInscriptionClient slug={slug} />;
}
