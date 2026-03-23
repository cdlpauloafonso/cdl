import { NoticiaDetailClient } from './NoticiaDetailClient';

// Em desenvolvimento, não precisa de generateStaticParams
export async function generateStaticParams() {
  // Apenas para produção com output: export
  if (process.env.NODE_ENV === 'production') {
    try {
      const { listNewsSlugsAtBuild } = await import('@/lib/firestore-build');
      const slugs = await listNewsSlugsAtBuild();
      if (slugs.length === 0) return [{ slug: '__fallback__' }];
      return slugs.map((slug) => ({ slug }));
    } catch {
      return [{ slug: '__fallback__' }];
    }
  }
  
  // Em desenvolvimento, retorna array vazio para permitir rotas dinâmicas
  return [];
}

export default async function NewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NoticiaDetailClient slug={slug} />;
}
