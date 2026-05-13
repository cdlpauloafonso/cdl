'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getMarketingSiteHomeAbsoluteUrl, resolveAppShellHref, segmentFromMobilePathname, shouldUseNativeAnchorForMobileNav, coerceToAppRelativePath } from '@/lib/mobile-shell-links';
import { HOME_PAGE_STATS } from '@/constants/home-stats';
import { HOME_ECONOMIC_INDICATORS } from '@/constants/home-economic-indicators';
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
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
] as const;

/** Imagem de destaque Paulo Afonso (ponte metálica / São Francisco) — mesmo ficheiro usado nos pontos turísticos. */
const APP_HOME_NOSSA_CIDADE_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Gleidson_Santos_-_Ponte_Metalica_-_Liga_os_Estados_da_Bahia_e_Alagoas_Paulo_Afonso_BA_%2839151930800%29.jpg/960px-Gleidson_Santos_-_Ponte_Metalica_-_Liga_os_Estados_da_Bahia_e_Alagoas_Paulo_Afonso_BA_%2839151930800%29.jpg';

/** Miniaturas da secção home — mesma ordem que `HOME_ECONOMIC_INDICATORS`. */
const APP_HOME_ECONOMIC_TILE_ICONS = [
  (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  ),
  (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
] as const;

/** Mesmo degradê do atalho «Serviços» nos acessos rápidos (`QUICK_TILES`). */
const ECONOMIC_INDICATOR_HOME_GRADIENT = 'from-blue-600/90 to-blue-900/95';

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

      <main className="relative z-10 -mt-16 flex min-h-0 flex-1 flex-col rounded-t-[1.75rem] bg-gradient-to-b from-slate-100 to-[#eef2fb] px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-7 text-slate-900 shadow-[0_-12px_40px_rgba(15,23,42,0.35)]">
        <div className="flex flex-1 flex-col">
        <div className="grid grid-cols-3 gap-2">
          {QUICK_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={mobileAppShellHref(tile.href)}
              prefetch={false}
              className={`group flex min-h-0 items-center gap-1.5 overflow-hidden rounded-xl border border-white/35 bg-gradient-to-br ${tile.gradient} px-2 py-2 shadow-md shadow-slate-900/12 sm:gap-2 sm:px-2.5`}
            >
              <span className="inline-flex shrink-0 rounded-md bg-black/25 p-1 text-white">{tile.icon}</span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-xs font-bold text-white">{tile.title}</p>
                <p className="text-[10px] text-white/85">{tile.subtitle}</p>
              </div>
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm group-hover:border-white/35 group-hover:bg-black/50"
                aria-hidden
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-2 px-0.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Economia local</p>
              <h3 className="text-base font-bold text-slate-900">Indicadores econômicos</h3>
            </div>
            <Link
              href={mobileAppShellHref('/indicadores-economicos')}
              prefetch={false}
              className="text-xs font-semibold text-cdl-blue hover:underline"
            >
              Ver mais
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {HOME_ECONOMIC_INDICATORS.map((item, i) => (
              <Link
                key={item.label}
                href={mobileAppShellHref('/indicadores-economicos')}
                prefetch={false}
                className={`group flex min-h-0 items-center gap-2 overflow-hidden rounded-xl border border-white/35 bg-gradient-to-br ${ECONOMIC_INDICATOR_HOME_GRADIENT} px-2.5 py-2 shadow-md shadow-slate-900/12 transition-[transform,filter] duration-200 hover:brightness-[1.06] active:scale-[0.99]`}
              >
                <span className="inline-flex shrink-0 rounded-md bg-black/25 p-1 text-white">{APP_HOME_ECONOMIC_TILE_ICONS[i]}</span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-xs font-bold tabular-nums tracking-tight text-white">{item.value}</p>
                  <p className="text-[10px] leading-snug text-white/85">{item.label}</p>
                </div>
                <span
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm group-hover:border-white/35 group-hover:bg-black/50"
                  aria-hidden
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ))}
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

        <section className="mt-8 flex flex-row items-stretch overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.06]">
          <div className="relative min-h-[5.25rem] w-[34%] min-w-[6.75rem] max-w-[9rem] shrink-0 self-stretch bg-slate-200 sm:max-w-[10rem] sm:min-h-[5.5rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={APP_HOME_NOSSA_CIDADE_IMAGE}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-900/25" />
          </div>
          <div className="flex min-h-[5.25rem] min-w-0 flex-1 flex-col justify-center gap-1 py-2 pl-2.5 pr-3 sm:min-h-[5.5rem] sm:pl-3 sm:pr-3.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Conheça nossa cidade</p>
            <h3 className="text-sm font-bold leading-tight text-slate-900">Paulo Afonso</h3>
            <p className="line-clamp-2 text-[10px] leading-snug text-slate-600">
              História no São Francisco, turismo e dados locais no app.
            </p>
            <Link
              href={mobileAppShellHref('/institucional/nossa-cidade')}
              prefetch={false}
              className="mt-1 flex min-h-[34px] w-full items-center justify-center rounded-lg bg-[#172554] px-2 text-[11px] font-semibold text-white shadow-sm shadow-blue-900/20 hover:bg-[#131c48] sm:min-h-[36px] sm:text-xs"
            >
              Explorar cidade
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
