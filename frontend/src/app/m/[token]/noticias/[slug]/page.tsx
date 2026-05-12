import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { NoticiaDetailClient } from '@/app/noticias/[slug]/NoticiaDetailClient';
import { buildMetadataForNewsSlug } from '@/lib/news-metadata';
import { getMobileWebviewToken, isValidMobileWebviewToken } from '@/lib/mobile-webview-token';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const base = await buildMetadataForNewsSlug(slug);
  return { ...base, robots: { index: false, follow: false } };
}

export async function generateStaticParams() {
  const token = getMobileWebviewToken();

  if (process.env.NODE_ENV === 'development') {
    return [];
  }

  try {
    const { listNewsSlugsAtBuild } = await import('@/lib/firestore-build');
    const slugs = await listNewsSlugsAtBuild();

    if (slugs.length === 0) {
      return [{ token, slug: 'not-found' }];
    }

    return slugs.map((slug) => ({ token, slug }));
  } catch (error) {
    console.error('Error generating static params for mobile news:', error);
    return [{ token, slug: 'not-found' }];
  }
}

export default async function MobileNewsDetailPage({
  params,
}: {
  params: Promise<{ token: string; slug: string }>;
}) {
  const { token, slug } = await params;
  if (!isValidMobileWebviewToken(token)) {
    notFound();
  }

  const segment = `/m/${token}`;
  return <NoticiaDetailClient slug={slug} noticiasIndexHref={`${segment}/noticias`} mobileShell />;
}
