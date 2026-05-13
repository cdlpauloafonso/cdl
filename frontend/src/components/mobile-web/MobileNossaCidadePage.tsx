'use client';

import Link from 'next/link';
import type { NossaCidadeInstitutionalPayload } from '@/lib/nossa-cidade-institutional-data';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';
import { PontosTuristicosSection } from '@/components/institucional/PontosTuristicosSection';
import { NOSSA_CIDADE_ECONOMIC_INDICATORS } from '@/constants/nossa-cidade-economic-indicators';

type MobileNossaCidadePageProps = {
  segment: string;
} & NossaCidadeInstitutionalPayload;

export function MobileNossaCidadePage({
  segment,
  excerptDisplay,
  showHtmlBlock,
  pontosCms,
}: MobileNossaCidadePageProps) {
  const subtitle =
    excerptDisplay?.trim() ||
    'História, turismo e indicadores — conheça Paulo Afonso no app CDL.';

  return (
    <MobileWebSubPageChrome backHref={segment} title="Nossa cidade" subtitle={subtitle}>
      <div className="space-y-6 pb-4 sm:space-y-8 sm:pb-2">
        <section>
          {showHtmlBlock ? (
            <div className="prose prose-sm prose-slate max-w-none break-words prose-headings:text-slate-900 prose-p:text-slate-700 prose-img:rounded-xl prose-pre:max-w-full prose-pre:overflow-x-auto [&_a]:break-words [&_a]:text-cdl-blue [&_a]:no-underline [&_a:hover]:underline [&_img]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
              <div dangerouslySetInnerHTML={{ __html: showHtmlBlock }} />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Sobre Paulo Afonso</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Paulo Afonso é um município da Bahia, polo comercial e de serviços no sertão do São Francisco, com forte
                identidade e potencial econômico.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                A cidade reúne infraestrutura, educação superior e um ecossistema empresarial dinâmico — espaço ideal para
                investir e prosperar com o apoio da CDL.
              </p>
            </div>
          )}
        </section>

        <PontosTuristicosSection pontosCms={pontosCms} variant="mobileApp" />

        <section>
          <div className="mb-3 flex items-end justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">Indicadores econômicos</h2>
            <Link
              href={`${segment}/indicadores-economicos`}
              prefetch={false}
              className="text-xs font-semibold text-cdl-blue hover:underline"
            >
              Ver mais
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {NOSSA_CIDADE_ECONOMIC_INDICATORS.map((indicator, i) => (
              <div
                key={`${indicator.label}-${i}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex shrink-0 scale-90 origin-top-left">{indicator.icon}</div>
                  <p className="text-right text-xl font-bold tabular-nums text-cdl-blue">{indicator.value}</p>
                </div>
                <h3 className="mt-1 text-xs font-semibold text-slate-900">{indicator.label}</h3>
                <p className="text-[11px] text-slate-500">{indicator.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-gradient-to-r from-cdl-blue to-cdl-blue-dark p-5 text-white shadow-lg shadow-blue-900/20">
          <h2 className="text-lg font-bold">Faça parte do desenvolvimento</h2>
          <p className="mt-1 text-xs leading-relaxed text-blue-100">
            Associe-se à CDL Paulo Afonso e fortaleça o seu negócio na nossa cidade.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={`${segment}/associe-se`}
              prefetch={false}
              className="flex justify-center rounded-lg bg-white py-2.5 text-center text-sm font-semibold text-cdl-blue hover:bg-slate-100"
            >
              Associe-se
            </Link>
            <Link
              href={`${segment}/atendimento`}
              prefetch={false}
              className="flex justify-center rounded-lg border-2 border-white/80 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10"
            >
              Fale conosco
            </Link>
          </div>
        </section>
      </div>
    </MobileWebSubPageChrome>
  );
}
