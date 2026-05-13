import Link from 'next/link';
import {
  INDICADORES_CAPITAL_HUMANO,
  INDICADORES_HIGHLIGHTS,
  INDICADORES_PIB_PER_CAPITA_ROWS,
  INDICADORES_RENDIMENTO_DOMICILIAR_ROWS,
  INDICADORES_TABELA_COMPLETA,
} from '@/constants/indicadores-economicos-data';

export const dynamic = 'force-static';

export default function IndicadoresEconomicosPage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl max-w-6xl">
        <div className="mb-10">
          <Link href="/" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">
            ← Voltar ao início
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Indicadores Econômicos
          </h1>
          <p className="text-lg text-cdl-gray-text">
            Dados socioeconômicos de Paulo Afonso que refletem o dinamismo e potencial econômico da cidade.
          </p>
        </div>

        {/* Indicadores em Destaque */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Indicadores em Destaque</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INDICADORES_HIGHLIGHTS.map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all"
              >
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-cdl-gray-text mb-1">{item.label}</h3>
                  <p className="text-3xl font-bold text-cdl-blue">{item.value}</p>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-cdl-gray-text">{item.year}</p>
                  <p className="text-xs text-cdl-gray-text mt-1">Fonte: {item.source}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Capital Humano */}
        <section className="mb-12">
          <div className="mb-8 p-8 rounded-xl bg-gradient-to-r from-cdl-blue/10 to-cdl-blue-dark/10 border-2 border-cdl-blue/30">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Capital Humano</h2>
            <p className="text-lg text-cdl-gray-text">
              Profissionais qualificados para impulsionar sua empresa
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INDICADORES_CAPITAL_HUMANO.map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-gray-200 bg-white hover:border-cdl-blue/30 hover:shadow-md transition-all text-center"
              >
                <p className="text-3xl sm:text-4xl font-bold text-cdl-blue mb-2">
                  {item.value}
                </p>
                <p className="text-sm font-medium text-cdl-gray-text">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Análise Comparativa */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Análise Comparativa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 mb-4">PIB per capita (2021)</h3>
              <div className="space-y-3">
                {INDICADORES_PIB_PER_CAPITA_ROWS.map((row) => (
                  <div key={row.city}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-cdl-gray-text">{row.city}</span>
                      <span className="font-medium text-gray-900">{row.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${row.city === 'Paulo Afonso' ? 'bg-cdl-blue' : 'bg-gray-400'}`}
                        style={{ width: `${row.widthPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-cdl-gray-text mt-4">Fonte: IBGE</p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 mb-4">Rendimento Domiciliar per capita (2022)</h3>
              <div className="space-y-3">
                {INDICADORES_RENDIMENTO_DOMICILIAR_ROWS.map((row) => (
                  <div key={row.city}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-cdl-gray-text">{row.city}</span>
                      <span className="font-medium text-gray-900">{row.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${row.city === 'Paulo Afonso' ? 'bg-cdl-blue' : 'bg-gray-400'}`}
                        style={{ width: `${row.widthPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-cdl-gray-text mt-4">Fonte: IBGE</p>
            </div>
          </div>
        </section>

        {/* Dados Completos */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados Completos</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="bg-cdl-gray">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Indicador</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Paulo Afonso</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Juazeiro</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Teixeira de Freitas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Fonte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {INDICADORES_TABELA_COMPLETA.map((row) => (
                  <tr key={row.indicator} className="hover:bg-cdl-gray/50">
                    <td className="px-6 py-4 text-sm text-gray-900">{row.indicator}</td>
                    <td className="px-6 py-4 text-sm font-medium text-cdl-blue">{row.pauloAfonso}</td>
                    <td className="px-6 py-4 text-sm text-cdl-gray-text">{row.juazeiro}</td>
                    <td className="px-6 py-4 text-sm text-cdl-gray-text">{row.teixeira}</td>
                    <td className="px-6 py-4 text-sm text-cdl-gray-text">{row.fonte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
