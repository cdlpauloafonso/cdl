import Link from 'next/link';
import { HOME_ECONOMIC_INDICATORS } from '@/constants/home-economic-indicators';

export function EconomicIndicators() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="container-cdl">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            CDL Indicadores Econômicos
          </h2>
          <p className="text-cdl-gray-text max-w-2xl mx-auto">
            Dados que refletem o dinamismo e potencial econômico de Paulo Afonso.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {HOME_ECONOMIC_INDICATORS.map((item, i) => (
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

        <div className="text-center">
          <Link href="/indicadores-economicos" className="btn-secondary">
            Ver mais
          </Link>
        </div>
      </div>
    </section>
  );
}
