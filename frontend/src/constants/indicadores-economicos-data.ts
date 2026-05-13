/**
 * Conteúdo da página pública `/indicadores-economicos` — partilhado com o modo app `/m/:token/indicadores-economicos`.
 */

export const INDICADORES_HIGHLIGHTS = [
  { label: 'IDH', value: '0,674', year: '2010', source: 'PNUD' },
  { label: 'População', value: '119.213', year: 'Estimativa 2024', source: 'IBGE' },
  { label: 'PIB per capita', value: 'R$ 33.262,53', year: '2021', source: 'IBGE' },
  { label: 'Taxa de Escolarização', value: '95,5%', year: '6 a 14 anos (2022)', source: 'IBGE' },
] as const;

export const INDICADORES_CAPITAL_HUMANO = [
  { value: '119.213', label: 'População Total' },
  { value: '16.540', label: 'Empregados Formais' },
  { value: '7.158', label: 'Estudantes de Ensino Superior' },
  { value: '7.546', label: 'Empresas Ativas' },
] as const;

export const INDICADORES_PIB_PER_CAPITA_ROWS = [
  { city: 'Paulo Afonso', value: 'R$ 33.262,53', widthPct: 100 },
  { city: 'Juazeiro', value: 'R$ 28.145,20', widthPct: 85 },
  { city: 'Teixeira de Freitas', value: 'R$ 25.890,10', widthPct: 78 },
] as const;

export const INDICADORES_RENDIMENTO_DOMICILIAR_ROWS = [
  { city: 'Paulo Afonso', value: 'R$ 1.245,00', widthPct: 100 },
  { city: 'Juazeiro', value: 'R$ 1.180,00', widthPct: 95 },
  { city: 'Teixeira de Freitas', value: 'R$ 1.100,00', widthPct: 88 },
] as const;

export type IndicadorTabelaRow = {
  indicator: string;
  pauloAfonso: string;
  juazeiro: string;
  teixeira: string;
  fonte: string;
};

export const INDICADORES_TABELA_COMPLETA: readonly IndicadorTabelaRow[] = [
  {
    indicator: 'População (2024)',
    pauloAfonso: '119.213',
    juazeiro: '218.162',
    teixeira: '162.438',
    fonte: 'IBGE',
  },
  {
    indicator: 'PIB per capita (2021)',
    pauloAfonso: 'R$ 33.262,53',
    juazeiro: 'R$ 28.145,20',
    teixeira: 'R$ 25.890,10',
    fonte: 'IBGE',
  },
  {
    indicator: 'IDH (2010)',
    pauloAfonso: '0,674',
    juazeiro: '0,677',
    teixeira: '0,682',
    fonte: 'PNUD',
  },
  {
    indicator: 'Taxa de Escolarização 6-14 anos (2022)',
    pauloAfonso: '95,5%',
    juazeiro: '94,2%',
    teixeira: '93,8%',
    fonte: 'IBGE',
  },
  {
    indicator: 'Empregados Formais',
    pauloAfonso: '16.540',
    juazeiro: '28.450',
    teixeira: '22.180',
    fonte: 'RAIS',
  },
  {
    indicator: 'Estudantes de Ensino Superior',
    pauloAfonso: '7.158',
    juazeiro: '12.450',
    teixeira: '9.820',
    fonte: 'INEP',
  },
  {
    indicator: 'Empresas Ativas',
    pauloAfonso: '7.546',
    juazeiro: '13.280',
    teixeira: '10.450',
    fonte: 'RFB',
  },
];
