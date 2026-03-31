import Link from 'next/link';

export default function AssocieSePage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900">Associe-se</h1>
        <p className="mt-4 text-lg text-cdl-gray-text">
          Faça parte da comunidade que impulsiona o comércio de Paulo Afonso. 
          Menos institucional, mais resultado, mais local.
        </p>
        <div className="mt-10 rounded-xl border border-gray-200 bg-cdl-gray/50 p-8">
          <h2 className="text-xl font-semibold text-gray-900">Por que associar-se?</h2>
          <ul className="mt-4 space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Segurança para vender (SPC, consultas)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Apoio institucional e representação do comércio
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Economia de custos em serviços empresariais
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Acesso a estrutura profissional e networking
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Pertencimento a um grupo forte e conectado
            </li>
          </ul>
        </div>
        <div className="mt-10">
          <p className="text-gray-700">
            Entre em contato para falar com um especialista e fazer sua proposta de associação.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/atendimento" className="btn-primary">
              Fale com especialista
            </Link>
            <a href="mailto:cdlpauloafonso@hotmail.com" className="btn-secondary">
              cdlpauloafonso@hotmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
