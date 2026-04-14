import Link from 'next/link';

async function getServices(): Promise<{ id: string; title: string; slug: string; description: string }[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) return [];
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/services`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const list = await res.json();
    return list.slice(0, 6);
  } catch {
    return [];
  }
}

export async function ServicesPreview() {
  const services = await getServices();
  const serviceListWithoutVagas = services.filter(
    (s) => s.slug !== 'vagas-emprego' && !s.title.toLowerCase().includes('vaga')
  );

  return (
    <section className="py-16 sm:py-20">
      <div className="container-cdl">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Serviços para o seu negócio
          </h2>
          <p className="mt-3 text-cdl-gray-text">
            Soluções práticas que apoiam o crescimento e a competitividade do comércio local.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.length > 0 ? (
            <>
              <Link
                href="/servicos/vagas-emprego"
                className="group block p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-cdl-blue">Vagas de Emprego</h3>
                <p className="mt-2 text-sm text-cdl-gray-text line-clamp-2">
                  Consulte vagas, publique oportunidades e cadastre currículo.
                </p>
                <span className="mt-3 inline-flex items-center text-sm font-medium text-cdl-blue group-hover:underline">
                  Saiba mais
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
              {serviceListWithoutVagas.map((s) => (
                <Link
                  key={s.id}
                  href={`/servicos/${s.slug}`}
                  className="group block p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-gray-900 group-hover:text-cdl-blue">{s.title}</h3>
                  <p className="mt-2 text-sm text-cdl-gray-text line-clamp-2">{s.description}</p>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-cdl-blue group-hover:underline">
                    Saiba mais
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              ))}
            </>
          ) : (
            <>
              {['SPC e Serasa', 'Certificado Digital', 'Vagas de Emprego', 'Saúde empresarial', 'Defesa do comércio', 'Networking'].map((title, i) => {
                if (title === 'Certificado Digital') {
                  return (
                    <Link
                      key={i}
                      href="/servicos/certificado-digital"
                      className="group block p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 group-hover:text-cdl-blue">{title}</h3>
                      <p className="mt-2 text-sm text-cdl-gray-text">
                        Serviços empresariais para associados CDL.
                      </p>
                      <span className="mt-3 inline-flex items-center text-sm font-medium text-cdl-blue group-hover:underline">
                        Saiba mais
                        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </Link>
                  );
                }
                if (title === 'Vagas de Emprego') {
                  return (
                    <Link
                      key={i}
                      href="/servicos/vagas-emprego"
                      className="group block p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 group-hover:text-cdl-blue">{title}</h3>
                      <p className="mt-2 text-sm text-cdl-gray-text">
                        Consulte vagas, publique oportunidades e cadastre currículo.
                      </p>
                      <span className="mt-3 inline-flex items-center text-sm font-medium text-cdl-blue group-hover:underline">
                        Saiba mais
                        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </Link>
                  );
                }
                return (
                  <div
                    key={i}
                    className="p-6 rounded-xl border border-gray-200 bg-white"
                  >
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="mt-2 text-sm text-cdl-gray-text">
                      Serviços empresariais para associados CDL.
                    </p>
                    <span className="mt-3 inline-flex items-center text-sm font-medium text-cdl-blue">
                      Em breve
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="mt-10 text-center">
          <Link href="/servicos" className="btn-secondary">
            Ver todos os serviços
          </Link>
        </div>
      </div>
    </section>
  );
}
