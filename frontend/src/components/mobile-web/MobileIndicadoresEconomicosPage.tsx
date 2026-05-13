'use client';

import Link from 'next/link';
import { getMarketingSiteHomeAbsoluteUrl } from '@/lib/mobile-shell-links';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';
import {
  INDICADORES_CAPITAL_HUMANO,
  INDICADORES_HIGHLIGHTS,
  INDICADORES_PIB_PER_CAPITA_ROWS,
  INDICADORES_RENDIMENTO_DOMICILIAR_ROWS,
  INDICADORES_TABELA_COMPLETA,
} from '@/constants/indicadores-economicos-data';

type MobileIndicadoresEconomicosPageProps = {
  segment: string;
};

function ComparisonCard({
  title,
  rows,
  footnote,
}: {
  title: string;
  rows: readonly { city: string; value: string; widthPct: number }[];
  footnote: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md shadow-slate-900/[0.04]">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3">
        {rows.map((row) => {
          const highlight = row.city === 'Paulo Afonso';
          return (
            <div key={row.city}>
              <div className="flex justify-between gap-2 text-[11px]">
                <span className={highlight ? 'font-semibold text-slate-800' : 'text-slate-500'}>{row.city}</span>
                <span className={`shrink-0 tabular-nums font-semibold ${highlight ? 'text-cdl-blue' : 'text-slate-700'}`}>
                  {row.value}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${highlight ? 'bg-cdl-blue' : 'bg-slate-400'}`}
                  style={{ width: `${row.widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-slate-500">{footnote}</p>
    </div>
  );
}

export function MobileIndicadoresEconomicosPage({ segment }: MobileIndicadoresEconomicosPageProps) {
  const homeHref = segment;
  const sitePageUrl = (() => {
    try {
      return new URL('indicadores-economicos', getMarketingSiteHomeAbsoluteUrl()).href;
    } catch {
      return 'https://www.cdlpauloafonso.com/indicadores-economicos';
    }
  })();

  return (
    <MobileWebSubPageChrome
      backHref={homeHref}
      title="Indicadores econômicos"
      subtitle="Paulo Afonso em dados — mesmo conteúdo da página institucional, organizado para leitura no app."
    >
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md shadow-slate-900/[0.04]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Destaque</p>
        <h2 className="mt-1 text-base font-bold text-slate-900">Indicadores em destaque</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {INDICADORES_HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white px-2.5 py-2.5 shadow-sm shadow-slate-900/[0.03]"
            >
              <p className="text-[10px] font-medium text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums leading-none text-cdl-blue">{item.value}</p>
              <p className="mt-2 border-t border-slate-100 pt-2 text-[9px] leading-snug text-slate-500">{item.year}</p>
              <p className="mt-0.5 text-[9px] text-slate-400">Fonte: {item.source}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-cdl-blue/20 bg-gradient-to-br from-cdl-blue/[0.07] to-white p-4 shadow-md shadow-slate-900/[0.04]">
        <h2 className="text-base font-bold text-slate-900">Capital humano</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
          Profissionais qualificados para impulsionar sua empresa.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {INDICADORES_CAPITAL_HUMANO.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5 text-center shadow-sm shadow-slate-900/[0.03]"
            >
              <p className="text-[17px] font-bold tabular-nums leading-none text-cdl-blue">{item.value}</p>
              <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-snug text-slate-600">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="px-0.5 text-base font-bold text-slate-900">Análise comparativa</h2>
        <p className="mt-1 px-0.5 text-[12px] text-slate-600">Comparação com cidades de referência na região.</p>
        <div className="mt-3 space-y-3">
          <ComparisonCard title="PIB per capita (2021)" rows={INDICADORES_PIB_PER_CAPITA_ROWS} footnote="Fonte: IBGE" />
          <ComparisonCard
            title="Rendimento domiciliar per capita (2022)"
            rows={INDICADORES_RENDIMENTO_DOMICILIAR_ROWS}
            footnote="Fonte: IBGE"
          />
        </div>
      </section>

      <section className="mt-5">
        <h2 className="px-0.5 text-base font-bold text-slate-900">Dados completos</h2>
        <p className="mt-1 px-0.5 text-[12px] text-slate-600">Valores por cidade e fonte oficial.</p>
        <div className="mt-3 space-y-2">
          {INDICADORES_TABELA_COMPLETA.map((row) => (
            <div
              key={row.indicator}
              className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm shadow-slate-900/[0.03]"
            >
              <p className="text-[12px] font-semibold leading-snug text-slate-900">{row.indicator}</p>
              <dl className="mt-2 grid gap-2 text-[11px]">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-cdl-blue/[0.06] px-2 py-1.5">
                  <dt className="font-medium text-slate-700">Paulo Afonso</dt>
                  <dd className="tabular-nums font-bold text-cdl-blue">{row.pauloAfonso}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-0.5">
                  <dt className="text-slate-500">Juazeiro</dt>
                  <dd className="tabular-nums text-slate-700">{row.juazeiro}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-0.5">
                  <dt className="text-slate-500">Teixeira de Freitas</dt>
                  <dd className="tabular-nums text-slate-700">{row.teixeira}</dd>
                </div>
              </dl>
              <p className="mt-2 text-[10px] text-slate-400">Fonte: {row.fonte}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
        <p className="text-[11px] text-slate-600">Versão web com tabela larga e impressão no navegador.</p>
        <a
          href={sitePageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center justify-center gap-1 text-xs font-semibold text-cdl-blue hover:underline"
        >
          Abrir no site completo
          <span aria-hidden className="text-[11px]">
            ↗
          </span>
        </a>
      </div>

      <div className="mt-4 pb-1 text-center">
        <Link href={homeHref} prefetch={false} className="text-xs font-semibold text-slate-500 hover:text-cdl-blue hover:underline">
          Voltar à home do app
        </Link>
      </div>
    </MobileWebSubPageChrome>
  );
}
