export type ServicoDisplayItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  href?: string;
  external?: boolean;
};

const mockServicos: ServicoDisplayItem[] = [
  {
    id: 'spc-serasa',
    title: 'Consulta SPC e Serasa',
    slug: 'consulta-spc-serasa',
    description:
      'Acesse consultas de crédito e informações comerciais através das plataformas SPC e Serasa.',
    href: 'https://sistema.spc.org.br/spc/controleacesso/autenticacao/entry.action',
    external: true,
  },
  {
    id: 'certificado-digital',
    title: 'Certificado Digital',
    slug: 'certificado-digital',
    description: 'Emissão e renovação de certificado digital com condições especiais para associados.',
    href: '/servicos/certificado-digital',
    external: false,
  },
  {
    id: 'clube-beneficios',
    title: 'Clube de Benefícios',
    slug: 'beneficios-associados',
    description: 'Acesse descontos e vantagens exclusivas em diversos estabelecimentos parceiros.',
    href: '/servicos/beneficios-associados',
    external: false,
  },
  {
    id: 'vagas-emprego',
    title: 'Vagas de Emprego',
    slug: 'vagas-emprego',
    description: 'Divulgue oportunidades e conecte empresas a candidatos com espaço para vagas e currículos.',
    href: '/servicos/vagas-emprego',
    external: false,
  },
  {
    id: 'defesa-comercio',
    title: 'Defesa do Comércio',
    slug: 'defesa-comercio',
    description: 'Representação institucional e defesa dos interesses do comércio local junto às autoridades.',
    href: '/atendimento',
    external: false,
  },
  {
    id: 'palestras-cursos',
    title: 'Palestras e Mini cursos',
    slug: 'palestras-mini-cursos',
    description: 'Programas de capacitação, palestras e mini cursos para desenvolvimento empresarial.',
    href: '/atendimento',
    external: false,
  },
];

async function fetchServicesFromApi(): Promise<ServicoDisplayItem[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) return [];
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/services`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getServiciosDisplayList(): Promise<ServicoDisplayItem[]> {
  const services = await fetchServicesFromApi();
  return services.length > 0 ? services : mockServicos;
}
