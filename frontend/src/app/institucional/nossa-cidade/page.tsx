import Link from 'next/link';
import { PontosTuristicosSection } from '@/components/institucional/PontosTuristicosSection';
import { NOSSA_CIDADE_ECONOMIC_INDICATORS } from '@/constants/nossa-cidade-economic-indicators';
import { getNossaCidadeInstitutionalPayload } from '@/lib/nossa-cidade-institutional-data';

export default async function NossaCidadePage() {
  const { excerptDisplay, showHtmlBlock, pontosCms } = await getNossaCidadeInstitutionalPayload();
  return (
    <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
      <div className="container-cdl max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Nossa Cidade
          </h1>
          {excerptDisplay ? (
            <p className="text-lg sm:text-xl text-cdl-gray-text max-w-3xl mx-auto">
              {excerptDisplay}
            </p>
          ) : (
            <p className="text-lg sm:text-xl text-cdl-gray-text max-w-3xl mx-auto">
              Conheça Paulo Afonso, uma cidade em constante crescimento e desenvolvimento
            </p>
          )}
        </div>

        {/* Descrição sobre a Cidade */}
        <section className="mb-16">
          {showHtmlBlock ? (
            <div className="prose prose-cdl max-w-none" dangerouslySetInnerHTML={{ __html: showHtmlBlock }} />
          ) : (
            <div className="prose prose-cdl max-w-none">
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Sobre Paulo Afonso</h2>
                
                <p className="text-lg text-cdl-gray-text leading-relaxed mb-4">
                  Paulo Afonso é um município brasileiro localizado no estado da Bahia, conhecido por sua rica história, 
                  potencial econômico e posição estratégica na região do sertão nordestino. A cidade se destaca como um 
                  importante polo comercial e de serviços, sendo referência para toda a região.
                </p>

                <p className="text-lg text-cdl-gray-text leading-relaxed mb-4">
                  Com uma população de mais de 119 mil habitantes, Paulo Afonso apresenta um cenário econômico dinâmico, 
                  com destaque para o setor comercial, que é fortalecido pela atuação da CDL Paulo Afonso. A cidade possui 
                  uma infraestrutura consolidada, com acesso facilitado às principais capitais do Nordeste, o que favorece 
                  o desenvolvimento de negócios e o crescimento empresarial.
                </p>

                <p className="text-lg text-cdl-gray-text leading-relaxed">
                  O município conta com um ambiente propício para investimentos, apresentando indicadores econômicos positivos 
                  e uma população empreendedora. A presença de instituições de ensino superior, empresas ativas e um mercado 
                  de trabalho formal em expansão demonstram o potencial de crescimento e desenvolvimento sustentável da região.
                </p>
              </div>
            </div>
          )}
        </section>

        <PontosTuristicosSection pontosCms={pontosCms} />

        {/* Indicadores Econômicos */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Indicadores Econômicos</h2>
            <Link
              href="/indicadores-economicos"
              className="text-sm text-cdl-blue hover:underline font-medium"
            >
              Ver mais indicadores →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {NOSSA_CIDADE_ECONOMIC_INDICATORS.map((indicator, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex shrink-0">{indicator.icon}</div>
                  <div className="text-right">
                    <p className="text-2xl sm:text-3xl font-bold text-cdl-blue">{indicator.value}</p>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{indicator.label}</h3>
                <p className="text-xs text-cdl-gray-text">{indicator.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16 text-center">
          <div className="bg-gradient-to-r from-cdl-blue to-cdl-blue-dark rounded-xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-3">Faça parte do desenvolvimento de Paulo Afonso</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Associe-se à CDL Paulo Afonso e fortaleça seu negócio enquanto contribui para o crescimento da nossa cidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/associe-se" className="btn-secondary bg-white text-cdl-blue hover:bg-gray-100">
                Associe-se
              </Link>
              <Link href="/atendimento" className="btn-secondary border-2 border-white text-white hover:bg-white/10">
                Entre em contato
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
