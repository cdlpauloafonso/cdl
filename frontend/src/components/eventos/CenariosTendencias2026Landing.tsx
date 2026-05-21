'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { EventCountdown } from '@/components/eventos/EventCountdown';
import { RevealSection } from '@/components/eventos/useRevealOnScroll';
import {
  buildWhatsAppUrl,
  CDL_WHATSAPP_FALLBACK,
  resolveCdlWhatsAppNumber,
} from '@/lib/cdl-whatsapp';

const INSCRIPTION_HREF = '/institucional/campanhas/inscricao?slug=cenariosetendencias2026';

const WHATSAPP_EVENT_MESSAGE =
  'Olá! Gostaria de saber mais sobre o evento Cenários, Tendências e Mercado 2026.';

const PARTNER_CARD_CLASS =
  'group mx-auto flex h-[4.5rem] w-full max-w-[9.5rem] flex-col items-center justify-center rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-950/50 to-slate-900/30 p-2 transition hover:border-sky-400/35 hover:shadow-lg hover:shadow-sky-900/20 sm:h-20 sm:max-w-[10.5rem]';

type PartnerLogoConfig = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Remove fundo escuro (JPEG) no card escuro */
  blendLighten?: boolean;
  /** Remove fundo claro (JPEG) no card escuro */
  blendDarken?: boolean;
};

const REALIZACAO_LOGOS: PartnerLogoConfig[] = [
  {
    src: '/logo-site.png',
    alt: 'CDL Paulo Afonso',
    width: 240,
    height: 92,
  },
];

/** Patrocinadores comerciais (logos em public/eventos/cenarios-tendencias-2026/patrocinadores/). */
const PATROCINADORES_LOGOS: PartnerLogoConfig[] = [];

const APOIO_LOGOS: PartnerLogoConfig[] = [
  {
    src: '/eventos/cenarios-tendencias-2026/parceiros/sebrae.png',
    alt: 'Sebrae',
    width: 200,
    height: 108,
  },
  {
    src: '/eventos/cenarios-tendencias-2026/parceiros/governo-bahia.png',
    alt: 'Governo do Estado da Bahia',
    width: 260,
    height: 84,
    blendDarken: true,
  },
  {
    src: '/eventos/cenarios-tendencias-2026/parceiros/cielo.png',
    alt: 'Cielo',
    width: 200,
    height: 70,
  },
];

const INFO_CARDS = [
  {
    icon: CalendarIcon,
    title: 'Data',
    value: '11 de junho de 2026',
    sub: 'Quinta-feira',
  },
  {
    icon: PinIcon,
    title: 'Local',
    value: 'Auditório da UNIRIOS',
    sub: 'Paulo Afonso — BA',
  },
  {
    icon: UsersIcon,
    title: 'Público',
    value: 'Empresários e gestores',
    sub: 'Comércio e serviços',
  },
  {
    icon: ChartIcon,
    title: 'Expectativa',
    value: '250 empresários',
    sub: 'Bahia e região',
  },
] as const;

const STRUCTURE = [
  { time: '16h', label: 'Atividades externas', detail: 'Integração, networking e ações com parceiros no entorno do auditório.' },
  { time: '18h', label: 'Credenciamento', detail: 'Recepção dos participantes e check-in no auditório.' },
  { time: '19h', label: 'Abertura oficial', detail: 'Autoridades, CDL, Sebrae e instituições parceiras.' },
  { time: '19h40', label: 'Palestras e painéis', detail: 'Conteúdo técnico com especialistas nacionais e regionais.' },
  { time: '22h', label: 'Encerramento', detail: 'Coquetel de encerramento e relacionamento empresarial.' },
] as const;

type ScheduleParticipant = { name: string; role: string };

type ScheduleItem = {
  time: string;
  type: string;
  theme?: string;
  /** Texto curto quando não há lista de participantes (ex.: credenciamento). */
  note?: string;
  participants: ScheduleParticipant[];
};

const SCHEDULE: ScheduleItem[] = [
  {
    time: '18:00',
    type: 'Credenciamento',
    note: 'Recepção e check-in no auditório.',
    participants: [],
  },
  {
    time: '19:00',
    type: 'Abertura',
    participants: [
      { name: 'Caio Arruda', role: 'Presidente da CDL Paulo Afonso' },
      { name: 'Mário Galinho', role: 'Prefeito de Paulo Afonso' },
      { name: 'Jorge Khoury', role: 'Diretor-Superintendente do Sebrae Bahia' },
      { name: 'Angelo Almeida', role: 'Deputado Estadual' },
      { name: 'Zé Neto', role: 'Deputado Federal' },
    ],
  },
  {
    time: '19:40',
    type: 'Palestra 1',
    theme: 'Pós-NRF: o som da confiança em tempos artificiais',
    participants: [{ name: 'Marcela Cabral', role: 'Palestrante' }],
  },
  {
    time: '20:30',
    type: 'Painel 1',
    theme: 'A importância do associativismo',
    participants: [
      { name: 'Pedro Luiz Failla', role: 'Presidente da FCDL Bahia' },
      { name: 'Paulo Cavalcanti', role: 'Presidente da FACEB' },
      { name: 'Kelsor Fernandes', role: 'Presidente da Fecomércio — BA' },
    ],
  },
  {
    time: '21:00',
    type: 'Palestra 2',
    theme: 'Teses vinculantes do TST: impactos nas relações de trabalho',
    participants: [
      { name: 'Luziane Farias', role: 'Juíza da 37ª Vara do Trabalho de Salvador' },
    ],
  },
  {
    time: '21:30',
    type: 'Palestra 3',
    theme: 'Reforma Tributária',
    participants: [
      { name: 'Glicio Oliveira', role: 'Empresário e palestrante em finanças corporativas' },
    ],
  },
];

const HIGHLIGHTS = [
  {
    name: 'Marcela Cabral',
    role: 'Palestrante',
    topic: 'Pós-NRF: o som da confiança em tempos artificiais',
  },
] as const;

function ScheduleProgramCard({ item }: { item: ScheduleItem }) {
  return (
    <article className="rounded-xl border border-sky-500/15 bg-slate-900/40 p-4 transition hover:border-sky-400/30">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-lg font-bold leading-none text-sky-300">{item.time}</span>
        <span className="shrink-0 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
          {item.type}
        </span>
      </div>
      {item.note ? <p className="mt-2 text-xs leading-snug text-slate-400">{item.note}</p> : null}
      {item.theme ? (
        <p className="mt-2 text-xs font-medium leading-snug text-sky-200/90">
          <span className="text-sky-400/80">Tema: </span>
          <span className="italic text-white">&ldquo;{item.theme}&rdquo;</span>
        </p>
      ) : null}
      {item.participants.length > 0 ? (
        <ul className={`space-y-1.5 ${item.theme || item.note ? 'mt-2.5' : 'mt-2'}`}>
          {item.participants.map((p) => (
            <li key={p.name} className="flex gap-1.5 text-xs leading-snug sm:text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-400" aria-hidden />
              <span>
                <span className="font-semibold text-white">{p.name}</span>
                <span className="text-slate-400"> — {p.role}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function CenariosTendencias2026Landing() {
  const [whatsappHref, setWhatsappHref] = useState(() =>
    buildWhatsAppUrl(CDL_WHATSAPP_FALLBACK, WHATSAPP_EVENT_MESSAGE)
  );

  useEffect(() => {
    resolveCdlWhatsAppNumber().then((number) => {
      setWhatsappHref(buildWhatsAppUrl(number, WHATSAPP_EVENT_MESSAGE));
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#050d1a] text-slate-100">
      {/* Hero */}
      <header className="relative min-h-[100dvh] overflow-hidden">
        <Image
          src="/eventos/cenarios-tendencias-2026/banner-wide.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-40 md:opacity-50"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#050d1a]/30 via-[#050d1a]/70 to-[#050d1a]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl ctm-animate-glow" />
        <div className="pointer-events-none absolute -left-16 bottom-1/4 h-48 w-48 rounded-full bg-blue-600/15 blur-3xl ctm-animate-glow" />

        <div className="relative z-10 flex min-h-[100dvh] flex-col">
          <nav className="flex items-center justify-between px-4 py-5 sm:px-8 lg:px-12">
            <Link href="/" className="block shrink-0 opacity-90 transition hover:opacity-100">
              <Image
                src="/logo-cdl-paulo-afonso-transparente.png"
                alt="CDL Paulo Afonso"
                width={160}
                height={66}
                className="h-9 w-auto sm:h-10"
                priority
              />
            </Link>
            <a
              href="#inscricao"
              className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-sky-100 backdrop-blur-sm transition hover:border-sky-300 hover:bg-sky-500/20"
            >
              Inscreva-se
            </a>
          </nav>

          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-4 text-center sm:px-8">
            <div className="ctm-animate-float mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl">
              <Image
                src="/eventos/cenarios-tendencias-2026/logo-evento.png"
                alt="Cenários, Tendências e Mercado 2026"
                width={640}
                height={400}
                className="mx-auto h-auto w-full drop-shadow-[0_0_40px_rgba(56,189,248,0.25)]"
                priority
              />
            </div>

            <p className="mt-8 max-w-2xl text-sm font-medium uppercase tracking-[0.25em] text-sky-300/90 sm:text-base">
              Paulo Afonso — Bahia
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Qualificação, atualização e integração de empresários, lojistas e profissionais estratégicos da região.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <CalendarIcon className="h-4 w-4 text-sky-400" />
                11 de junho de 2026
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <PinIcon className="h-4 w-4 text-sky-400" />
                Auditório da UNIRIOS
              </span>
            </div>

            <Link
              href={INSCRIPTION_HREF}
              className="mt-8 inline-flex min-w-[220px] items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-sky-500/25 transition hover:scale-[1.02] hover:shadow-sky-500/40"
            >
              Inscrever-se agora
            </Link>

            <a
              href="#contador"
              className="mt-10 animate-bounce text-sky-400/80"
              aria-label="Rolar para o contador"
            >
              <ChevronDownIcon className="h-6 w-6" />
            </a>
          </div>
        </div>
      </header>

      {/* Countdown */}
      <section id="contador" className="relative border-y border-sky-500/20 bg-gradient-to-r from-[#0a1628] via-[#0f2847] to-[#0a1628] py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <RevealSection>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">
              Contagem regressiva
            </p>
            <h2 className="mt-3 text-center font-[var(--font-ctm-display)] text-3xl font-semibold text-white sm:text-4xl">
              Falta pouco para o <span className="ctm-text-shimmer">grande encontro</span>
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Início das atividades — 11 de junho de 2026, às 16h
            </p>
            <div className="mt-10">
              <EventCountdown />
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <RevealSection>
            <SectionLabel>Sobre o evento</SectionLabel>
            <h2 className="mt-4 max-w-3xl font-[var(--font-ctm-display)] text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
              Conhecimento prático para um comércio mais competitivo
            </h2>
          </RevealSection>
          <RevealSection delayMs={120} className="mt-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4 text-base leading-relaxed text-slate-300">
                <p>
                  A <strong className="text-white">Câmara de Dirigentes Lojistas de Paulo Afonso (CDL)</strong>, em
                  alinhamento com sua nova proposta institucional de fortalecimento do ambiente empresarial local,
                  realiza um encontro voltado à qualificação, atualização e integração de empresários, lojistas e
                  profissionais estratégicos da região.
                </p>
                <p>
                  O projeto <strong className="text-white">Cenários, Tendências &amp; Mercado</strong> proporciona uma
                  grande oportunidade para a partilha de conhecimentos e vivências no âmbito do comércio varejista,
                  atacadista e de serviços — com palestras e relatos de profissionais do setor sobre tendências,
                  desafios e inovações locais, regionais, nacionais e globais.
                </p>
                <p>
                  Através de painéis e palestras, o público tem acesso a temas como varejo pós-NRF, reforma tributária,
                  relações de trabalho, sistema financeiro e associativismo empresarial.
                </p>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-sky-500/20 shadow-2xl shadow-sky-900/30 lg:mx-0 lg:max-w-none">
                <Image
                  src="/eventos/cenarios-tendencias-2026/banner-vertical.png"
                  alt="Arte do evento Cenários, Tendências e Mercado 2026"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a]/80 via-transparent to-transparent" />
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Info cards */}
      <section className="bg-[#0a1628]/80 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <RevealSection>
            <SectionLabel>Informações</SectionLabel>
          </RevealSection>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INFO_CARDS.map((card, i) => (
              <RevealSection key={card.title} delayMs={i * 80}>
                <div className="group h-full rounded-2xl border border-sky-500/15 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6 transition hover:border-sky-400/35 hover:shadow-lg hover:shadow-sky-900/20">
                  <card.icon className="h-8 w-8 text-sky-400 transition group-hover:scale-110" />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-sky-400/80">{card.title}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{card.value}</p>
                  <p className="mt-1 text-sm text-slate-400">{card.sub}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Estrutura */}
      <section id="estrutura" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <RevealSection>
            <SectionLabel>Estrutura do evento</SectionLabel>
            <h2 className="mt-4 font-[var(--font-ctm-display)] text-3xl font-semibold text-white sm:text-4xl">
              Um dia inteiro de conteúdo e relacionamento
            </h2>
          </RevealSection>
          <div className="mt-12 space-y-0">
            {STRUCTURE.map((item, i) => (
              <RevealSection key={item.time} delayMs={i * 60}>
                <div className="relative flex gap-6 border-l border-sky-500/30 pb-10 pl-8 last:pb-0">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                  <div className="shrink-0 font-mono text-lg font-semibold text-sky-300">{item.time}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.detail}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Programação */}
      <section id="programacao" className="border-t border-sky-500/10 bg-gradient-to-b from-[#0a1628] to-[#050d1a] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <RevealSection>
            <SectionLabel>Programação</SectionLabel>
            <h2 className="mt-4 font-[var(--font-ctm-display)] text-3xl font-semibold text-white sm:text-4xl">
              Painéis e palestras
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Credenciamento às 18h, abertura às 19h e programação técnica a partir das 19h40, com especialistas de
              referência nacional e regional.
            </p>
          </RevealSection>

          <div className="mt-10 grid items-start gap-3 sm:grid-cols-2">
            {SCHEDULE.map((item, i) => (
              <RevealSection key={item.time + item.type} delayMs={i * 50}>
                <ScheduleProgramCard item={item} />
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <RevealSection>
            <SectionLabel>Destaques</SectionLabel>
            <h2 className="mt-4 font-[var(--font-ctm-display)] text-3xl font-semibold text-white sm:text-4xl">
              Referências que movem o mercado
            </h2>
          </RevealSection>
          <div className="mx-auto mt-10 max-w-xl">
            {HIGHLIGHTS.map((h, i) => (
              <RevealSection key={h.name} delayMs={i * 100}>
                <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-950/50 to-slate-900/30 p-8">
                  <h3 className="font-[var(--font-ctm-display)] text-2xl font-semibold text-white">{h.name}</h3>
                  <p className="mt-1 text-sm font-medium text-sky-400">{h.role}</p>
                  <p className="mt-4 text-slate-300 leading-relaxed">{h.topic}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Público + Institucional */}
      <section className="bg-[#0a1628]/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <RevealSection>
              <SectionLabel>Público-alvo</SectionLabel>
              <h2 className="mt-4 font-[var(--font-ctm-display)] text-2xl font-semibold text-white sm:text-3xl">
                Exclusivo para quem lidera o comércio
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                Empresários, lojistas, gestores e profissionais estratégicos do comércio e serviços — público qualificado,
                interessado em atualização profissional, networking e desenvolvimento empresarial.
              </p>
            </RevealSection>
            <RevealSection delayMs={100}>
              <SectionLabel>Objetivo institucional</SectionLabel>
              <h2 className="mt-4 font-[var(--font-ctm-display)] text-2xl font-semibold text-white sm:text-3xl">
                CDL como agente de desenvolvimento
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                A iniciativa integra o novo posicionamento da CDL Paulo Afonso: ampliar sua atuação na qualificação
                empresarial e no fortalecimento do comércio local, aproximando empresários, instituições e parceiros
                estratégicos — conectando conhecimento, inovação e desenvolvimento regional.
              </p>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="inscricao" className="relative overflow-hidden py-20 sm:py-28">
        <Image
          src="/eventos/cenarios-tendencias-2026/banner-wide.png"
          alt=""
          fill
          className="object-cover opacity-20"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-[#050d1a]/90 to-[#050d1a]/70" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
          <RevealSection>
            <h2 className="font-[var(--font-ctm-display)] text-3xl font-semibold text-white sm:text-5xl">
              Garanta sua participação
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Vagas limitadas para empresários e gestores do comércio e serviços. Faça sua inscrição e faça parte do
              principal encontro empresarial de Paulo Afonso em 2026.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={INSCRIPTION_HREF}
                className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-sky-500/25 transition hover:scale-[1.02] hover:shadow-sky-500/40"
              >
                Inscrever-se agora
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-white/25 px-8 py-4 text-sm font-semibold text-white transition hover:border-sky-400/50 hover:bg-white/5"
              >
                Fale com a CDL
              </a>
            </div>

            <div className="mt-16 border-t border-white/10 pt-12">
              <SectionLabel>Patrocinadores</SectionLabel>
              {PATROCINADORES_LOGOS.length > 0 ? (
                <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 sm:gap-4">
                  {PATROCINADORES_LOGOS.map((logo, i) => (
                    <RevealSection key={logo.alt} delayMs={i * 60}>
                      <PartnerLogoCard logo={logo} />
                    </RevealSection>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-500">Em breve divulgaremos nossos patrocinadores.</p>
              )}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Realização e apoio */}
      <section className="border-t border-white/10 bg-[#0a1628]/80 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <RevealSection>
            <div className="text-center">
              <SectionLabel>Realização</SectionLabel>
            </div>
            <div className="mx-auto mt-8 flex justify-center gap-3">
              {REALIZACAO_LOGOS.map((logo) => (
                <PartnerLogoCard key={logo.alt} logo={logo} />
              ))}
            </div>

            <div className="mt-14 text-center">
              <SectionLabel>Apoio</SectionLabel>
            </div>
            <div className="mt-8 grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 sm:gap-4">
              {APOIO_LOGOS.map((logo, i) => (
                <RevealSection key={logo.alt} delayMs={i * 60}>
                  <PartnerLogoCard logo={logo} />
                </RevealSection>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
          <div>
            <p className="text-sm font-semibold text-white">CDL Paulo Afonso</p>
            <p className="mt-1 text-xs text-slate-500">
              Rua Monsenhor Magalhães, 214 — Centro — Paulo Afonso/BA
              <br />
              CEP 48602-000 • CNPJ 04.264.509/0001-00
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500">
            <Link href="/" className="hover:text-sky-400">
              Site institucional
            </Link>
            <Link href="/institucional/campanhas" className="hover:text-sky-400">
              Eventos CDL
            </Link>
            <Link href="/associe-se" className="hover:text-sky-400">
              Associe-se
            </Link>
          </div>
        </div>
        <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-slate-600">
          Realização CDL Paulo Afonso — Cenários, Tendências &amp; Mercado 2026
        </p>
      </footer>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">{children}</span>
  );
}

function PartnerLogoCard({ logo }: { logo: PartnerLogoConfig }) {
  const blendClass = logo.blendLighten
    ? 'mix-blend-lighten'
    : logo.blendDarken
      ? 'mix-blend-darken'
      : '';

  return (
    <div className={`${PARTNER_CARD_CLASS} isolate`}>
      <div className="flex h-full w-full items-center justify-center">
        {/* img nativo preserva mix-blend e transparência PNG melhor que o pipeline do Next/Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
          className={`max-h-[90%] max-w-[90%] object-contain ${blendClass}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M4.5 9.75h15M4.5 19.5h15a1.5 1.5 0 001.5-1.5V7.5a1.5 1.5 0 00-1.5-1.5h-15a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5z" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
