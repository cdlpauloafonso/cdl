import Link from 'next/link';

const opcoes = [
  {
    titulo: 'Ver vagas',
    descricao: 'Consulte as oportunidades de emprego disponíveis e encontre a vaga ideal para o seu perfil.',
    cta: 'Em breve',
    href: '',
  },
  {
    titulo: 'Publicar vaga',
    descricao: 'Empresas podem divulgar novas vagas para alcançar candidatos da região com mais agilidade.',
    cta: 'Em breve',
    href: '',
  },
  {
    titulo: 'Cadastrar currículo',
    descricao: 'Cadastre seu currículo para facilitar o contato com empresas que estão buscando talentos.',
    cta: 'Enviar currículo',
    href: '/servicos/vagas-emprego/cadastrar-curriculo',
  },
];

export default function VagasEmpregoPage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl max-w-5xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Vagas de Emprego</h1>
        <p className="mt-4 text-lg text-cdl-gray-text max-w-3xl">
          Espaço da CDL Paulo Afonso para conectar empresas e profissionais.
          Escolha uma das opções abaixo para continuar.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {opcoes.map((opcao) => (
            <div
              key={opcao.titulo}
              className="rounded-xl border border-gray-200 bg-white p-6 hover:border-cdl-blue/30 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-cdl-blue/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h8m-8 4h6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">{opcao.titulo}</h2>
              <p className="mt-2 text-cdl-gray-text">{opcao.descricao}</p>
              {opcao.href ? (
                <Link href={opcao.href} className="mt-5 inline-flex btn-secondary">
                  {opcao.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex btn-secondary cursor-not-allowed opacity-60"
                  aria-disabled="true"
                >
                  {opcao.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
