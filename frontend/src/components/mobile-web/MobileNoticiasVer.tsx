'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { MobileNewsReaderSurface, MobileNewsReaderToolbar } from '@/components/mobile-web/MobileNewsReaderShell';
import { resolveNewsSlugFromSearchAndPath } from '@/lib/news-path-slug';
import { NoticiaDetailClient } from '@/app/noticias/[slug]/NoticiaDetailClient';

function MobileVerInner({ segment }: { segment: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const slug = resolveNewsSlugFromSearchAndPath(searchParams, pathname).trim();
  const indexHref = `${segment}/noticias`;

  if (!slug) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[#0b1224]">
        <MobileNewsReaderToolbar
          noticiasIndexHref={indexHref}
          shareDisabled
          sharing={false}
          onShareClick={() => {}}
        />
        <MobileNewsReaderSurface>
          <p className="text-[14px] leading-relaxed text-slate-600">Link da notícia inválido.</p>
        </MobileNewsReaderSurface>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <NoticiaDetailClient slug={slug} noticiasIndexHref={indexHref} mobileShell />
    </div>
  );
}

export function MobileNoticiasVer({ segment }: { segment: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center py-12">
          <p className="text-center text-sm text-slate-600">Carregando...</p>
        </div>
      }
    >
      <MobileVerInner segment={segment} />
    </Suspense>
  );
}
