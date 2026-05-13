'use client';

import Image from 'next/image';
import { useMemo, useEffect, useState } from 'react';

/** Atrações reais da região — textos institucionais; confirme horários antes de divulgar no app. */
const PONTOS_TURISTICOS = [
  {
    id: 'igreja-sao-francisco',
    nome: 'Igreja São Francisco de Assis ("Igreja de Pedra")',
    descricaoCurta:
      'Primeira igreja católica de Paulo Afonso; destaque pela construção em pedra que remete a estilos sóbrios e pela localização próxima à Rua da Gangorra.',
    detalhes:
      'Construída em 1949, é um dos marcos mais conhecidos do centro histórico. Vale a visita para conhecer a arquitetura e o papel da instituição na formação religiosa da cidade.',
    iconKind: 'church' as const,
    imageSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/GleidsonSantos_Igreja_de_Sao_Francisco_Paulo_Afonso_BA.jpg/960px-GleidsonSantos_Igreja_de_Sao_Francisco_Paulo_Afonso_BA.jpg',
    imageAlt: 'Igreja de São Francisco de Assis em Paulo Afonso — vista frontal em pedra.',
  },
  {
    id: 'complexo-chesf',
    nome: 'Complexo hidrelétrico da Chesf',
    descricaoCurta:
      'Conjunto de usinas sobre o São Francisco na região de Paulo Afonso, símbolo da “capital da energia” e importante para o país.',
    detalhes:
      'É possível encontrar passeios institucionais e roteiros de visitação oficiais, sujeitos a agenda e vagas da Chesf ou de parceiros credenciados. Consulte sempre o canal oficial antes de ir.',
    iconKind: 'hydro' as const,
    imageSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Cachoeira_de_Paulo_Afons.jpg/960px-Cachoeira_de_Paulo_Afons.jpg',
    imageAlt: 'Vertedouros da usina de Paulo Afonso no Rio São Francisco.',
  },
  {
    id: 'ponte-dom-pedro',
    nome: 'Ponte Dom Pedro II (Ponte Metálica)',
    descricaoCurta:
      'Ponte ícone sobre o Rio São Francisco (~84 m), ligando Paulo Afonso (BA) a Delmiro Gouveia (AL).',
    detalhes:
      'Também chamada Ponte Metálica, marca a divisa entre estados sobre o Velho Chico e é cenário marcante ao pôr do sol. Adequado observar apenas com segurança e onde for permitido.',
    iconKind: 'bridge' as const,
    imageSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Gleidson_Santos_-_Ponte_Metalica_-_Liga_os_Estados_da_Bahia_e_Alagoas_Paulo_Afonso_BA_%2839151930800%29.jpg/960px-Gleidson_Santos_-_Ponte_Metalica_-_Liga_os_Estados_da_Bahia_e_Alagoas_Paulo_Afonso_BA_%2839151930800%29.jpg',
    imageAlt: 'Ponte metálica sobre o Rio São Francisco entre Paulo Afonso (BA) e Alagoas.',
  },
  {
    id: 'raso-da-catarina',
    nome: 'Raso da Catarina',
    descricaoCurta:
      'Vasta região de caatinga, cânions e chapadas no sertão, com forte apelo ambiental próximo ao entorno hidrográfico baiano.',
    detalhes:
      'Um dos maiores blocos sedimentares contínuos das Américas, com comunidades tradicionais e paisagens marcantes para ecoturismo responsável. Planeje com tempo, guias locais e respeito à fauna e flora.',
    iconKind: 'nature' as const,
    imageSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Contraste_na_Caatinga.jpg/960px-Contraste_na_Caatinga.jpg',
    imageAlt: 'Paisagem de caatinga na região do Raso da Catarina (Baixa do Chico), Bahia.',
  },
  {
    id: 'museu-maria-bonita',
    nome: 'Museu Casa de Maria Bonita',
    descricaoCurta:
      'Espaço museístico na zona rural que preserva a memória de Maria Bonita e o contexto do cangaço na região de Paulo Afonso.',
    detalhes:
      'Localizado no entorno de Malhada da Caíçara / distrito de Santo Estêvão, reúne acervo e narrativas sobre a história do cangaço no sertão. Combine com roteiro cultural e apoio de guias locais.',
    iconKind: 'museum' as const,
    imageSrc: '/nossa-cidade/museu-casa-maria-bonita.jpg',
    imageAlt:
      'Casa de reboco do Museu Casa de Maria Bonita, na Malhada da Caiçara (Paulo Afonso, BA). Imagem: Guia das Artes.',
  },
  {
    id: 'malhada-grande',
    nome: 'Malhada Grande (artesanato)',
    descricaoCurta:
      'Distrito a cerca de 18 km do centro com forte tradição artesanal em teares — tapetes, redes e trabalhos típicos do sertão.',
    detalhes:
      'Roteiros costumam combinar compra direta ao artesanato e gastronomia local. Ótimo para quem quer conhecer produção manual reconhecida na região.',
    iconKind: 'craft' as const,
    imageSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Piren%C3%B3polis_-_State_of_Goi%C3%A1s%2C_Brazil_-_panoramio_%2872%29.jpg/960px-Piren%C3%B3polis_-_State_of_Goi%C3%A1s%2C_Brazil_-_panoramio_%2872%29.jpg',
    imageAlt:
      'Tecelagem artesanal em tear manual com fios coloridos — mesmo tipo de trabalho de tapetes e redes produzido em Malhada Grande (Paulo Afonso, BA). Foto de referência: Pirenópolis (GO).',
  },
  {
    id: 'ilha-canions',
    nome: 'Ilhas e canyon da represa',
    descricaoCurta:
      'Passeios de barco pela represa paulo-afonseana com vistas de ilhas e cânions hidrográficos — em geral com guia autorizado.',
    detalhes:
      'Por depender das condições da represa, do tempo e dos operadores, verifique segurança, capacidade máxima e regulamentação atual dos passeios antes de contratar.',
    iconKind: 'boat' as const,
    imageSrc:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Gleidson_Santos_Ponte_sobre_o_Canions_do_Rio_Sao_Francisco_Paulo_Afonso_Bahia_%2839151931530%29.jpg/960px-Gleidson_Santos_Ponte_sobre_o_Canions_do_Rio_Sao_Francisco_Paulo_Afonso_Bahia_%2839151931530%29.jpg',
    imageAlt: 'Cânions do Rio São Francisco em Paulo Afonso — paisagem típica dos passeios pela represa.',
  },
] as const;

type IconKind = (typeof PONTOS_TURISTICOS)[number]['iconKind'];

export type PontoTuristicoPublic = {
  id: string;
  nome: string;
  descricaoCurta: string;
  detalhes: string;
  iconKind: IconKind;
  imageSrc: string;
  imageAlt: string;
};

/** Lista padrão (site) — útil para pré-preencher o admin. */
export const DEFAULT_PONTOS_TURISTICOS_LIST: PontoTuristicoPublic[] = PONTOS_TURISTICOS.map((p) => ({
  id: p.id,
  nome: p.nome,
  descricaoCurta: p.descricaoCurta,
  detalhes: p.detalhes,
  iconKind: p.iconKind,
  imageSrc: p.imageSrc,
  imageAlt: p.imageAlt,
}));

const ICON_KINDS_SET = new Set<string>([
  'church',
  'hydro',
  'bridge',
  'nature',
  'museum',
  'craft',
  'boat',
]);

function normalizeIconKind(k: unknown): IconKind {
  return typeof k === 'string' && ICON_KINDS_SET.has(k) ? (k as IconKind) : 'nature';
}

/** Mescla pontos vindos do CMS com validação; lista vazia usa os padrões do site. */
export function mergePontosTuristicos(cms: unknown[] | null | undefined): PontoTuristicoPublic[] {
  if (!cms || cms.length === 0) return DEFAULT_PONTOS_TURISTICOS_LIST;
  const mapped = cms.map((raw, i) => {
    const p = raw as Record<string, unknown>;
    const order = typeof p.order === 'number' && !Number.isNaN(p.order) ? p.order : i;
    return {
      order,
      id: typeof p.id === 'string' && p.id.trim() ? p.id : `ponto-${i}`,
      nome: typeof p.nome === 'string' ? p.nome : '',
      descricaoCurta: typeof p.descricaoCurta === 'string' ? p.descricaoCurta : '',
      detalhes: typeof p.detalhes === 'string' ? p.detalhes : '',
      iconKind: normalizeIconKind(p.iconKind),
      imageSrc: typeof p.imageSrc === 'string' ? p.imageSrc : '',
      imageAlt: typeof p.imageAlt === 'string' ? p.imageAlt : '',
    };
  });
  mapped.sort((a, b) => a.order - b.order);
  return mapped.map(({ order: _o, ...rest }) => rest);
}

function CardHeroIcon({ kind }: { kind: IconKind }) {
  const cls = 'h-14 w-14 text-cdl-blue/45 sm:h-16 sm:w-16';
  switch (kind) {
    case 'church':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M12 3v4m0 0l-2.5 2V10h5V9.5L12 7M7 10v10h10V10M9 22v-4h6v4"
          />
        </svg>
      );
    case 'hydro':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7M9 21v-4h6v4"
          />
        </svg>
      );
    case 'bridge':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M4 18h16M6 18V8l6-3 6 3v10M8 14h4M12 11h4"
          />
        </svg>
      );
    case 'nature':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M3 20h18M5 20l4-10 3 6 3-8 4 12M12 4v2"
          />
        </svg>
      );
    case 'museum':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M4 10h16M6 10V8l6-3 6 3v2M6 10v10h4v-6h4v6h4V10M8 22h8"
          />
        </svg>
      );
    case 'craft':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M4 8h16M4 8l2 12h12l2-12M8 8V6a4 4 0 118 0v2"
          />
        </svg>
      );
    case 'boat':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M4 16l2 4h12l2-4M6 16h12M8 12h8M10 8h4M12 4v4"
          />
        </svg>
      );
    default:
      return null;
  }
}

function PontoTuristicoCard({
  nome,
  descricaoCurta,
  detalhes,
  iconKind,
  imageSrc,
  imageAlt,
  compact = false,
}: {
  nome: string;
  descricaoCurta: string;
  detalhes: string;
  iconKind: IconKind;
  imageSrc: string;
  imageAlt: string;
  compact?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = imageSrc && !imageFailed;

  return (
    <>
      <article
        className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md shadow-gray-900/5 transition-all duration-300 hover:border-cdl-blue/35 hover:shadow-xl hover:shadow-cdl-blue/10 ${
          compact ? '' : 'sm:hover:-translate-y-1'
        }`}
      >
        <div
          className={`relative w-full shrink-0 bg-gradient-to-br from-slate-100 via-slate-50 to-cdl-blue/10 ${
            compact ? 'aspect-[16/10]' : 'aspect-[5/3]'
          }`}
        >
          {showPhoto ? (
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes={compact ? '(max-width: 640px) 100vw, 28rem' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
              onError={() => setImageFailed(true)}
            />
          ) : null}
          {showPhoto ? (
            <>
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-[linear-gradient(to_top,rgba(0,0,0,0.48)_0%,rgba(0,0,0,0.12)_38%,transparent_100%)] sm:h-[26%]"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-3 pb-3 pt-10 sm:px-4 sm:pb-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                  Paulo Afonso — BA
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-5">
              <div className="flex flex-col items-center gap-2 text-cdl-blue/35">
                <CardHeroIcon kind={iconKind} />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Paulo Afonso — BA
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={`flex flex-1 flex-col ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}`}>
          <h3 className={`font-bold leading-snug text-gray-900 ${compact ? 'text-[15px]' : 'text-base sm:text-lg'}`}>
            {nome}
          </h3>
          <p
            className={`mt-1.5 flex-1 text-cdl-gray-text leading-relaxed ${compact ? 'line-clamp-4 text-[13px]' : 'line-clamp-3 text-sm'}`}
          >
            {descricaoCurta}
          </p>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-cdl-blue font-semibold text-white shadow-sm transition-colors hover:bg-cdl-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-cdl-blue focus-visible:ring-offset-2 sm:mt-4 ${
              compact ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-sm'
            }`}
          >
            Saiba mais
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </article>

      {modalOpen ? (
        <PontoModal title={nome} body={detalhes} onClose={() => setModalOpen(false)} centered={compact} />
      ) : null}
    </>
  );
}

function PontoModal({
  title,
  body,
  onClose,
  centered = false,
}: {
  title: string;
  body: string;
  onClose: () => void;
  /** Modo app WebView: cartão flutuante centrado em vez de folha inferior */
  centered?: boolean;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const overlayCls = centered
    ? 'fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-6 py-10 backdrop-blur-[2px] sm:px-10 sm:py-12'
    : 'fixed inset-0 z-[110] flex items-end justify-center bg-black/50 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[min(15vh,6rem)] sm:items-center sm:p-4 sm:pb-4 sm:pt-4';

  const dialogCls = centered
    ? 'flex min-h-0 max-h-[min(82dvh,520px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5'
    : 'mx-auto flex w-full max-h-[min(82dvh,620px)] max-w-lg flex-col rounded-2xl bg-white shadow-2xl sm:max-h-[min(85vh,720px)]';

  return (
    <div
      className={overlayCls}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ponto-modal-title"
        className={dialogCls}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-3.5">
          <h2 id="ponto-modal-title" className="pr-2 text-base font-bold text-gray-900 sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-gray-800 sm:px-6 sm:py-5">
          <p className="whitespace-pre-line">{body}</p>
        </div>

        <div className="flex shrink-0 justify-end border-t border-gray-100 px-5 py-3 sm:px-6 sm:py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-cdl-blue py-2.5 text-sm font-semibold text-white hover:bg-cdl-blue-dark sm:w-auto sm:min-w-[120px] sm:px-5"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function PontosTuristicosSection({
  pontosCms,
  variant = 'default',
}: {
  pontosCms?: unknown[] | null;
  variant?: 'default' | 'mobileApp';
}) {
  const pontos = useMemo(() => mergePontosTuristicos(pontosCms), [pontosCms]);
  const mobileApp = variant === 'mobileApp';

  return (
    <section className={mobileApp ? 'mb-8' : 'mb-16'}>
      <div
        className={
          mobileApp
            ? 'mb-4 text-left'
            : 'mb-8 text-center sm:text-left'
        }
      >
        <h2 className={mobileApp ? 'text-xl font-bold text-gray-900' : 'text-2xl font-bold text-gray-900 sm:text-3xl'}>
          Pontos turísticos
        </h2>
        <p
          className={
            mobileApp
              ? 'mt-1.5 max-w-none text-sm leading-relaxed text-cdl-gray-text'
              : 'mt-2 max-w-3xl text-cdl-gray-text sm:mx-auto sm:text-lg'
          }
        >
          Natureza, história e o Rio São Francisco se encontram em Paulo Afonso. Conheça alguns dos atrativos que fazem
          parte do roteiro local.
        </p>
      </div>

      <div
        className={
          mobileApp
            ? 'grid grid-cols-2 gap-2 gap-y-3 sm:gap-3'
            : 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6'
        }
      >
        {pontos.map((ponto) => (
          <PontoTuristicoCard
            key={ponto.id}
            nome={ponto.nome}
            descricaoCurta={ponto.descricaoCurta}
            detalhes={ponto.detalhes}
            iconKind={ponto.iconKind}
            imageSrc={ponto.imageSrc}
            imageAlt={ponto.imageAlt}
            compact={mobileApp}
          />
        ))}
      </div>

      <p
        className={
          mobileApp
            ? 'mt-5 rounded-xl border border-cdl-blue/20 bg-white p-3 text-center text-xs leading-snug text-cdl-gray-text shadow-sm'
            : 'mt-8 rounded-xl border border-cdl-blue/20 bg-white p-4 text-center text-sm text-cdl-gray-text shadow-sm'
        }
      >
        Para roteiros oficiais, horários atualizados e visitação guiada, consulte também a{' '}
        <a
          href="https://vivapauloafonso.com.br/atrativos/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-cdl-blue hover:underline"
        >
          plataforma Viva Paulo Afonso
        </a>
        .
      </p>
    </section>
  );
}
