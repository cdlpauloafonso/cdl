import Link from 'next/link';

// Serviços mockados para exibir quando não houver serviços da API
const mockServices = [
  {
    id: 'spc-serasa',
    title: 'Consulta SPC e Serasa',
    slug: 'consulta-spc-serasa',
    description: 'Acesse consultas de crédito e informações comerciais através das plataformas SPC e Serasa.',
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

async function getServices() {
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

export default async function ServicosPage() {
  const services = await getServices();
  const displayServices = services.length > 0 ? services : mockServices;

  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl">
        <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
        <p className="mt-4 text-lg text-cdl-gray-text max-w-2xl">
          Hub de serviços para empresas: SPC, certificado digital, saúde, coworking e mais. 
          Apoio ao crescimento e competitividade do comércio local.
        </p>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayServices.map((s: { id: string; title: string; slug: string; description: string; href?: string; external?: boolean }) => {
            const cardContent = (
              <>
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-cdl-blue/10 flex items-center justify-center group-hover:bg-cdl-blue transition-colors">
                    <svg className="w-6 h-6 text-cdl-blue group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-lg text-gray-900 group-hover:text-cdl-blue transition-colors">{s.title}</h2>
                  </div>
                </div>
                <p className="text-cdl-gray-text mb-4">{s.description}</p>
                <span className="inline-flex items-center text-sm font-medium text-cdl-blue group-hover:gap-2 transition-all">
                  Saiba mais
                  <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </>
            );

            if (s.external) {
              return (
                <a
                  key={s.id}
                  href={s.href || 'https://sistema.spc.org.br/spc/controleacesso/autenticacao/entry.action'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all group"
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <Link
                key={s.id}
                href={s.href || `/servicos/${s.slug}`}
                className="block p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all group"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
