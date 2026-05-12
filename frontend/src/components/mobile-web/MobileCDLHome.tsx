'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getMarketingSiteHomeAbsoluteUrl, resolveAppShellHref, segmentFromMobilePathname, shouldUseNativeAnchorForMobileNav, coerceToAppRelativePath } from '@/lib/mobile-shell-links';
import { HOME_PAGE_STATS } from '@/constants/home-stats';
import { listCarouselSlides, listNews, type CarouselSlide, type NewsItemFirestore } from '@/lib/firestore';
import { MobileHeroHeaderBackdrop } from '@/components/mobile-web/MobileHeroHeaderBackdrop';

type HeroSlideVM = {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  /** null quando o slide não tem botão/link nem foto linkável — esconder “Acessar” no app */
  href: string | null;
};

/** Mesmo conteúdo do bloco de destaques da home (`HOME_PAGE_STATS`). */
const APP_HOME_HIGHLIGHT_ROWS = HOME_PAGE_STATS.map((s) => ({
  label: s.label,
  value: s.value,
  detail: 'Conforme o bloco de destaques da página inicial do site',
}));

const MOCK_ALERTS = [
  {
    id: 'mock-1',
    title: 'Campanha de fortalecimento do comércio',
    date: '12 mai',
    excerpt: 'Incentive vendas locais com ações coordenadas pela CDL e parceiros.',
  },
  {
    id: 'mock-2',
    title: 'Horário especial de plantão',
    date: '08 mai',
    excerpt: 'Equipe disponível para dúvidas sobre certificado digital e eventos.',
  },
] as const;

const MOCK_SLIDES: HeroSlideVM[] = [
  {
    id: 'm1',
    title: 'Fortaleça o seu negócio',
    subtitle: 'Networking, capacitação e representação junto aos poderes públicos.',
    image: null,
    href: '/associe-se',
  },
  {
    id: 'm2',
    title: 'Serviços sob medida',
    subtitle: 'Certificado digital, convênios, defesa do empresário e muito mais.',
    image: null,
    href: '/servicos',
  },
];

const QUICK_TILES = [
  {
    href: '/servicos',
    title: 'Serviços',
    subtitle: 'Catálogo',
    gradient: 'from-blue-600/90 to-blue-900/95',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    ),
  },
  {
    href: '/servicos/beneficios-associados',
    title: 'Benefícios',
    subtitle: 'Parceiros',
    gradient: 'from-indigo-500/85 to-blue-950/95',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109 13v1.5"
        />
      </svg>
    ),
  },
  {
    href: '/institucional/campanhas',
    title: 'Campanhas',
    subtitle: 'Eventos',
    gradient: 'from-slate-600/95 to-slate-900',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    href: '/atendimento',
    title: 'Fale conosco',
    subtitle: 'Contato',
    gradient: 'from-cyan-600/85 to-blue-950/98',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
] as const;

function slideVmFromFirestore(s: CarouselSlide): HeroSlideVM {
  const fromBtn =
    (s.buttons || []).map((b) => b.href?.trim()).find((u) => u && u.length > 0) ?? null;
  const fromPhoto = s.photoLink?.trim() ? s.photoLink.trim() : null;
  const href = fromBtn || fromPhoto;
  return {
    id: s.id || `slide-${s.order}-${(s.title || 'x').slice(0, 12)}`,
    title: (s.title || 'CDL Paulo Afonso').trim() || 'CDL Paulo Afonso',
    subtitle:
      (s.description || '').trim() ||
      'Comunidade empresarial de Paulo Afonso — sua empresa mais forte aqui.',
    image: s.photo,
    href,
  };
}

function formatNewsDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

function formatNewsDateLabel(n: NewsItemFirestore): string {
  const fromIso = formatNewsDate(n.publishedAt);
  if (fromIso) return fromIso;
  const raw = String(n.publishedAt || '').trim();
  return raw || '';
}

export function MobileCDLHome() {
  const pathname = usePathname();
  const mobileSegment = useMemo(() => (pathname ? segmentFromMobilePathname(pathname) : null), [pathname]);
  const mobileAppShellHref = useMemo(
    () => (href: string) => resolveAppShellHref(mobileSegment, href),
    [mobileSegment],
  );

  const [slides, setSlides] = useState<HeroSlideVM[]>(MOCK_SLIDES);
  const [news, setNews] = useState<NewsItemFirestore[]>([]);
  const [feedError, setFeedError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [carousel, newsRows] = await Promise.all([
          listCarouselSlides().catch(() => [] as CarouselSlide[]),
          listNews(true, 24).catch(() => [] as NewsItemFirestore[]),
        ]);
        if (cancelled) return;

        const enabled = carousel.filter((x) => x.enabled !== false);
        if (enabled.length > 0) {
          const ordered = [...enabled].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 8);
          setSlides(ordered.map(slideVmFromFirestore));
        }

        const sortedNews = [...newsRows].sort((a, b) => {
          const ta = new Date(a.publishedAt || 0).getTime();
          const tb = new Date(b.publishedAt || 0).getTime();
          return tb - ta;
        });
        setNews(sortedNews.slice(0, 6));
        setFeedError(false);
      } catch {
        if (!cancelled) {
          setFeedError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayNews = useMemo(() => {
    if (news.length > 0) return news;
    return MOCK_ALERTS.map((m) => ({
      id: m.id,
      title: m.title,
      slug: '',
      excerpt: m.excerpt,
      content: '',
      image: null,
      links: null,
      published: true,
      publishedAt: m.date,
    })) satisfies NewsItemFirestore[];
  }, [news]);

  return (
    <div className="relative isolate flex min-h-0 flex-1 flex-col text-slate-100">
      <MobileHeroHeaderBackdrop variant="home" />
      <header className="relative z-10 shrink-0 px-5 pb-28 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
        <div className="relative flex items-center pt-1">
          <div className="relative min-h-[44px] min-w-0 flex-1">
            {/* Logo PNG com canal alpha — fundos explícitos transparentes */}
            <div className="relative isolate h-[2.75rem] w-full max-w-[min(20rem,calc(100vw-2.5rem))] overflow-visible bg-transparent lg:h-11">
              <Image
                src="/logo-cdl-paulo-afonso-transparente.png"
                alt="CDL Paulo Afonso"
                fill
                className="pointer-events-none object-contain object-left select-none bg-transparent"
                sizes="288px"
                priority
              />
            </div>
          </div>
        </div>

        <div className="relative mt-6 -mx-5">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-5 scroll-pr-5 px-5 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {slides.map((s, i) => {
              const href = s.href;
              const useNativeAnchor = !!href && shouldUseNativeAnchorForMobileNav(href);
              const nativeDest = href && useNativeAnchor ? coerceToAppRelativePath(href) : '';
              const shellDest = href && !useNativeAnchor ? resolveAppShellHref(mobileSegment, href) : '';

              const cardFrameClass = `group relative shrink-0 snap-start rounded-3xl border border-white/15 bg-white/[0.07] shadow-2xl shadow-blue-950/40 backdrop-blur-md transition-colors focus-within:ring-2 focus-within:ring-cyan-300/50 hover:border-white/25 ${
                s.image ? 'w-[82%]' : 'min-w-[78%]'
              } max-w-[20rem]`;

              const slideVisual = (
                <>
                  {s.image ? (
                    <div className="relative h-36 w-full overflow-hidden rounded-t-3xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.image} alt="" className="h-full w-full object-cover opacity-95" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1224]/95 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="h-2 rounded-t-3xl bg-gradient-to-r from-amber-300/70 via-blue-400/60 to-transparent" />
                  )}
                  <div className="space-y-1.5 p-4">
                    <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-white">{s.title}</h2>
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">{s.subtitle}</p>
                    {href ?
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 group-hover:text-white">
                        Acessar
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    : null}
                  </div>
                </>
              );

              const openHttpInNewTab = /^https?:\/\//i.test(nativeDest);

              if (!href) {
                return (
                  <article key={s.id + i} className={cardFrameClass}>
                    {slideVisual}
                  </article>
                );
              }

              if (useNativeAnchor) {
                return (
                  <a
                    key={s.id + i}
                    href={nativeDest}
                    className={`${cardFrameClass} block no-underline`}
                    {...(openHttpInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {slideVisual}
                  </a>
                );
              }

              return (
                <Link
                  key={s.id + i}
                  href={shellDest}
                  prefetch={false}
                  className={`${cardFrameClass} block text-inherit no-underline`}
                >
                  {slideVisual}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto mt-6 grid max-w-xl grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-2.5 backdrop-blur-md">
          {APP_HOME_HIGHLIGHT_ROWS.map((x) => (
            <div key={x.label} className="min-w-0 rounded-xl bg-[#121a34]/95 px-1.5 py-2 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{x.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{x.value}</p>
              <p className="mt-0.5 text-[9px] leading-tight text-slate-400">{x.detail}</p>
            </div>
          ))}
        </div>
      </header>

      <main className="relative z-10 -mt-16 flex min-h-0 flex-1 flex-col overscroll-y-none rounded-t-[1.75rem] bg-gradient-to-b from-slate-100 to-[#eef2fb] px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-7 text-slate-900 shadow-[0_-12px_40px_rgba(15,23,42,0.35)]">
        <div className="flex flex-1 flex-col">
        <div className="mx-auto mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Acesso rápido</p>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={mobileAppShellHref(tile.href)}
              prefetch={false}
              className={`group relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br ${tile.gradient} p-4 shadow-lg shadow-slate-900/15`}
            >
              <div className="flex flex-col gap-7">
                <span className="inline-flex rounded-lg bg-black/25 p-2 text-white">{tile.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{tile.title}</p>
                  <p className="text-[11px] text-white/85">{tile.subtitle}</p>
                </div>
              </div>
              <span
                className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur group-hover:bg-white/25"
                aria-hidden
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-2 px-0.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Notícias</p>
              <h3 className="text-base font-bold text-slate-900">O que há de novo</h3>
            </div>
            <Link href={mobileAppShellHref('/noticias')} prefetch={false} className="text-xs font-semibold text-cdl-blue hover:underline">
              Ver todas
            </Link>
          </div>
          {feedError && (
            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              Não foi possível carregar o feed ao vivo — exibindo conteúdo de exemplo abaixo.
            </p>
          )}
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {displayNews.map((n) => {
              const excerpt = (n.excerpt || '').trim() || MOCK_ALERTS.find((x) => x.id === n.id)?.excerpt || '—';
              const slug = typeof n.slug === 'string' && n.slug.trim() ? n.slug.trim() : null;
              const dateLabel = formatNewsDateLabel(n) || 'Novidade';
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-cdl-blue/80">{dateLabel || 'Novidade'}</span>
                    {slug ? (
                      <span className="text-[10px] font-semibold text-slate-400">Ler</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Exemplo</span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-600">{excerpt}</p>
                  {n.image ? (
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-100 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.image} alt="" className="h-24 w-full object-cover" />
                    </div>
                  ) : (
                    <div className="mt-2 flex h-[4.75rem] items-center justify-center rounded-lg bg-slate-100 text-[11px] text-slate-500">
                      Conteúdo institucional
                    </div>
                  )}
                </>
              );

              const cardCls =
                'shrink-0 snap-start rounded-2xl border border-slate-200/90 bg-white p-3 shadow-md shadow-slate-900/[0.04] w-[80%] max-w-[16.5rem]';

              return slug ? (
                <Link key={n.id || n.slug || n.title} href={mobileAppShellHref(`/noticias/${slug}`)} prefetch={false} className={cardCls}>
                  {inner}
                </Link>
              ) : (
                <article key={n.id || n.title} className={cardCls}>
                  {inner}
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-inner shadow-slate-200/70">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Área do associado</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Centralize pendências e oportunidades</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Acesse benefícios, documentos úteis e canais diretos da CDL.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href={mobileAppShellHref('/area-associado')}
              prefetch={false}
              className="flex items-center justify-center rounded-xl bg-[#172554] py-3 text-xs font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-[#131c48]"
            >
              Área associado
            </Link>
            <Link
              href={mobileAppShellHref('/associe-se')}
              prefetch={false}
              className="flex items-center justify-center rounded-xl border-2 border-cdl-blue py-3 text-xs font-semibold text-cdl-blue hover:bg-cdl-blue/5"
            >
              Associe-se
            </Link>
          </div>
        </section>

        <div className="mt-10 border-t border-slate-200/80 pt-6 text-center">
          <a
            href={getMarketingSiteHomeAbsoluteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-cdl-blue hover:underline"
          >
            Ir para o site completo ↗
          </a>
          <p className="mx-auto mt-3 max-w-xs text-[10px] leading-relaxed text-slate-500">
            Experiência mobile institucional — os destaques do topo e as notícias podem refletir o conteúdo publicado no
            site quando o app estiver online.
          </p>
        </div>
        </div>
      </main>
    </div>
  );
}
