import type { ReactNode } from 'react';

const iconCls = 'h-10 w-10 shrink-0 text-cdl-blue';

function EconomicIconWrapper({ children }: { children: ReactNode }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-xl bg-cdl-blue/[0.06] p-2 ring-1 ring-cdl-blue/15">
      {children}
    </span>
  );
}

export type NossaCidadeEconomicIndicator = {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
};

/** Indicadores usados na página «Nossa cidade» (site e app). */
export const NOSSA_CIDADE_ECONOMIC_INDICATORS: NossaCidadeEconomicIndicator[] = [
  {
    label: 'População Total',
    value: '119.213',
    description: 'Estimativa 2024',
    icon: (
      <EconomicIconWrapper>
        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </EconomicIconWrapper>
    ),
  },
  {
    label: 'Empregados Formais',
    value: '16.540',
    description: 'RAIS',
    icon: (
      <EconomicIconWrapper>
        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </EconomicIconWrapper>
    ),
  },
  {
    label: 'Estudantes de Ensino Superior',
    value: '7.158',
    description: 'INEP',
    icon: (
      <EconomicIconWrapper>
        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </EconomicIconWrapper>
    ),
  },
  {
    label: 'Empresas Ativas',
    value: '7.546',
    description: 'RFB',
    icon: (
      <EconomicIconWrapper>
        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </EconomicIconWrapper>
    ),
  },
  {
    label: 'PIB per capita',
    value: 'R$ 33.262,53',
    description: '2021 - IBGE',
    icon: (
      <EconomicIconWrapper>
        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </EconomicIconWrapper>
    ),
  },
  {
    label: 'IDH',
    value: '0,674',
    description: '2010 - PNUD',
    icon: (
      <EconomicIconWrapper>
        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </EconomicIconWrapper>
    ),
  },
];
