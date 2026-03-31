import { NoticiaDetailClient } from './NoticiaDetailClient';

export async function generateStaticParams() {
  // Em desenvolvimento, não gera params estáticos para permitir rotas dinâmicas
  if (process.env.NODE_ENV === 'development') {
    return [];
  }
  
  try {
    const { listNewsSlugsAtBuild } = await import('@/lib/firestore-build');
    const slugs = await listNewsSlugsAtBuild();
    
    // Se não houver slugs, retorna um fallback
    if (slugs.length === 0) {
      return [{ slug: 'not-found' }];
    }
    
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.error('Error generating static params for news:', error);
    // Retorna fallback em caso de erro
    return [{ slug: 'not-found' }];
  }
}

export default async function NewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NoticiaDetailClient slug={slug} />;
}
