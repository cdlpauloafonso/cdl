'use client';

import { useEffect, useState } from 'react';

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
  },
  {
    id: 'complexo-chesf',
    nome: 'Complexo hidrelétrico da Chesf',
    descricaoCurta:
      'Conjunto de usinas sobre o São Francisco na região de Paulo Afonso, símbolo da “capital da energia” e importante para o país.',
    detalhes:
      'É possível encontrar passeios institucionais e roteiros de visitação oficiais, sujeitos a agenda e vagas da Chesf ou de parceiros credenciados. Consulte sempre o canal oficial antes de ir.',
    iconKind: 'hydro' as const,
  },
  {
    id: 'ponte-dom-pedro',
    nome: 'Ponte Dom Pedro II (Ponte Metálica)',
    descricaoCurta:
      'Ponte ícone sobre o Rio São Francisco (~84 m), ligando Paulo Afonso (BA) a Delmiro Gouveia (AL).',
    detalhes:
      'Também chamada Ponte Metálica, marca a divisa entre estados sobre o Velho Chico e é cenário marcante ao pôr do sol. Adequado observar apenas com segurança e onde for permitido.',
    iconKind: 'bridge' as const,
  },
  {
    id: 'raso-da-catarina',
    nome: 'Raso da Catarina',
    descricaoCurta:
      'Vasta região de caatinga, cânions e chapadas no sertão, com forte apelo ambiental próximo ao entorno hidrográfico baiano.',
    detalhes:
      'Um dos maiores blocos sedimentares contínuos das Américas, com comunidades tradicionais e paisagens marcantes para ecoturismo responsável. Planeje com tempo, guias locais e respeito à fauna e flora.',
    iconKind: 'nature' as const,
  },
  {
    id: 'museu-maria-bonita',
    nome: 'Museu Casa de Maria Bonita',
    descricaoCurta:
      'Espaço museístico na zona rural que preserva a memória de Maria Bonita e o contexto do cangaço na região de Paulo Afonso.',
    detalhes:
      'Localizado no entorno de Malhada da Caíçara / distrito de Santo Estêvão, reúne acervo e narrativas sobre a história do cangaço no sertão. Combine com roteiro cultural e apoio de guias locais.',
    iconKind: 'museum' as const,
  },
  {
    id: 'malhada-grande',
    nome: 'Malhada Grande (artesanato em tear)',
    descricaoCurta:
      'Distrito a cerca de 18 km do centro com forte tradição artesanal em teares — tapetes, redes e trabalhos típicos do sertão.',
    detalhes:
      'Roteiros costumam combinar compra direta ao artesanato e gastronomia local. Ótimo para quem quer conhecer produção manual reconhecida na região.',
    iconKind: 'craft' as const,
  },
  {
    id: 'ilha-canions',
    nome: 'Ilhas e canyon da represa (ex.: Ilha do Urubu)',
    descricaoCurta:
      'Passeios de barco pela represa paulo-afonseana com vistas de ilhas e cânions hidrográficos — em geral com guia autorizado.',
    detalhes:
      'Por depender das condições da represa, do tempo e dos operadores, verifique segurança, capacidade máxima e regulamentação atual dos passeios antes de contratar.',
    iconKind: 'boat' as const,
  },
  {
    id: 'leno-water-park',
    nome: 'Leno Suites & Waterpark',
    descricaoCurta:
      'Parque aquático próximo ao entorno das represas, com atrações aquáticas para famílias e visitantes.',
    detalhes:
      'Ótimo para dias quentes combinando hospedagem e lazer. Horários de funcionamento e ingressos devem ser verificados diretamente com o empreendimento.',
    iconKind: 'water' as const,
  },
] as const;

type IconKind = (typeof PONTOS_TURISTICOS)[number]['iconKind'];

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
    case 'water':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.25}
            d="M12 3c-2 4-6 7-6 11a6 6 0 1012 0c0-4-4-7-6-11z"
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
}: {
  nome: string;
  descricaoCurta: string;
  detalhes: string;
  iconKind: IconKind;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <article
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md shadow-gray-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-cdl-blue/35 hover:shadow-xl hover:shadow-cdl-blue/10"
      >
        <div className="relative aspect-[5/3] w-full shrink-0 bg-gradient-to-br from-slate-100 via-slate-50 to-cdl-blue/10">
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-5">
            <div className="flex flex-col items-center gap-2 text-cdl-blue/35">
              <CardHeroIcon kind={iconKind} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Paulo Afonso — BA
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <h3 className="text-base font-bold leading-snug text-gray-900 sm:text-lg">{nome}</h3>
          <p className="mt-1.5 flex-1 line-clamp-3 text-sm leading-relaxed text-cdl-gray-text">
            {descricaoCurta}
          </p>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-cdl-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cdl-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-cdl-blue focus-visible:ring-offset-2"
          >
            Saiba mais
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </article>

      {modalOpen ? (
        <PontoModal title={nome} body={detalhes} onClose={() => setModalOpen(false)} />
      ) : null}
    </>
  );
}

function PontoModal({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ponto-modal-title"
        className="flex max-h-[min(88dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(85vh,720px)] sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-800 sm:px-5 sm:py-5">
          <p className="whitespace-pre-line">{body}</p>
        </div>

        <div className="flex shrink-0 justify-end border-t border-gray-100 px-4 py-3 sm:px-5">
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

export function PontosTuristicosSection() {
  return (
    <section className="mb-16">
      <div className="mb-8 text-center sm:text-left">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Pontos turísticos</h2>
        <p className="mt-2 max-w-3xl text-cdl-gray-text sm:mx-auto sm:text-lg">
          Natureza, história e o Rio São Francisco se encontram em Paulo Afonso. Conheça alguns dos atrativos que fazem parte do roteiro local.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {PONTOS_TURISTICOS.map((ponto) => (
          <PontoTuristicoCard
            key={ponto.id}
            nome={ponto.nome}
            descricaoCurta={ponto.descricaoCurta}
            detalhes={ponto.detalhes}
            iconKind={ponto.iconKind}
          />
        ))}
      </div>

      <p className="mt-8 rounded-xl border border-cdl-blue/20 bg-white p-4 text-center text-sm text-cdl-gray-text shadow-sm">
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
