import type { PontoTuristicoCMS, PontoTuristicoIconKind } from '@/lib/firestore';

export const PONTO_TURISTICO_ICON_OPTIONS: { value: PontoTuristicoIconKind; label: string }[] = [
  { value: 'church', label: 'Igreja / patrimônio' },
  { value: 'hydro', label: 'Hidrelétrica / barragem' },
  { value: 'bridge', label: 'Ponte' },
  { value: 'nature', label: 'Natureza / caatinga' },
  { value: 'museum', label: 'Museu / cultura' },
  { value: 'craft', label: 'Artesanato' },
  { value: 'boat', label: 'Rio / passeio aquático' },
];

export function labelPontoTuristicoIcon(kind: PontoTuristicoIconKind): string {
  return PONTO_TURISTICO_ICON_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

export function sortPontosTuristicos(list: PontoTuristicoCMS[]): PontoTuristicoCMS[] {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function freshPontoTuristico(order: number): PontoTuristicoCMS {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ponto-${Date.now()}`,
    nome: '',
    descricaoCurta: '',
    detalhes: '',
    iconKind: 'nature',
    imageSrc: '',
    imageAlt: '',
    order,
  };
}
