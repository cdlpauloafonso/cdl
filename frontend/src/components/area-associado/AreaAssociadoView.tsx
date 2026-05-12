'use client';

import Link from 'next/link';
import { resolveAppShellHref } from '@/lib/mobile-shell-links';

export type AreaAssociadoViewProps = {
  mobileShell?: boolean;
  /** `/m/:token` para reescrever links do shell */
  shellSegment?: string | null;
};

const SPC_LOGIN = 'https://sistema.spc.org.br/spc/controleacesso/autenticacao/entry.action';

export function AreaAssociadoView({ mobileShell = false, shellSegment = null }: AreaAssociadoViewProps) {
  const r = (href: string) => resolveAppShellHref(shellSegment, href);

  const cardBase = mobileShell
    ? 'rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-900/[0.04]'
    : 'rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-md';

  const iconBoxSm = mobileShell ? 'h-10 w-10' : 'h-12 w-12';
  const sectionTitle = mobileShell ? 'mb-4 text-base font-bold text-slate-900' : 'mb-6 text-2xl font-bold text-gray-900';

  return (
    <div className={mobileShell ? 'pb-2' : undefined}>
      {!mobileShell ?
        <>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">Área do Associado</h1>
          <p className="mb-10 text-lg text-cdl-gray-text">
            Acesse serviços exclusivos e gerencie sua conta de associado da CDL Paulo Afonso.
          </p>
        </>
      : <>
          <p className="mb-5 text-[13px] leading-relaxed text-slate-600">
            Serviços exclusivos e canais da CDL Paulo Afonso para associados.
          </p>
        </>
      }

      <div
        className={
          mobileShell ?
            'mb-5 rounded-2xl bg-gradient-to-r from-cdl-blue to-cdl-blue-dark p-5 text-white'
          : 'mb-10 rounded-xl bg-gradient-to-r from-cdl-blue to-cdl-blue-dark p-8 text-white'
        }
      >
        <div className={mobileShell ? 'text-left' : 'text-center'}>
          <h2 className={`font-bold ${mobileShell ? 'mb-2 text-base' : 'mb-3 text-2xl sm:text-3xl'}`}>
            Faça parte da maior comunidade empresarial
          </h2>
          <p className={`text-blue-100 ${mobileShell ? 'mb-4 text-[13px]' : 'mb-6 text-lg'}`}>
            Seja um associado e tenha acesso a benefícios exclusivos
          </p>
          <Link
            href={r('/associe-se')}
            prefetch={false}
            className={
              mobileShell ?
                'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-cdl-blue hover:bg-blue-50'
              : 'inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-cdl-blue transition-colors hover:bg-blue-50'
            }
          >
            Associe-se agora
          </Link>
        </div>
      </div>

      <div
        className={`mb-10 rounded-xl border-2 border-cdl-blue bg-gradient-to-br from-cdl-blue/5 to-transparent ${mobileShell ? 'p-4' : 'p-8'}`}
      >
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2">
              <div className={`${iconBoxSm} flex shrink-0 items-center justify-center rounded-lg bg-cdl-blue`}>
                <svg className={mobileShell ? 'h-5 w-5 text-white' : 'h-6 w-6 text-white'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className={mobileShell ? 'text-lg font-bold text-gray-900' : 'text-2xl font-bold text-gray-900'}>
                Sistema SPC
              </h2>
            </div>
            <p className={`text-cdl-gray-text ${mobileShell ? 'mb-4 text-[13px]' : 'mb-4'}`}>
              Acesse o sistema SPC para realizar consultas de crédito, gerenciar informações e utilizar os serviços disponíveis
              para associados.
            </p>
            <a
              href={SPC_LOGIN}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-primary inline-flex items-center gap-2 ${mobileShell ? 'w-full justify-center text-sm' : ''}`}
            >
              Acessar Sistema SPC
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className={sectionTitle}>Benefícios Exclusivos</h2>
        <div className={`grid grid-cols-1 gap-4 ${mobileShell ? '' : 'gap-6 md:grid-cols-2'}`}>
          <div className={cardBase}>
            <div className={`flex items-start ${mobileShell ? 'gap-3' : 'gap-4'}`}>
              <div className={`flex ${iconBoxSm} shrink-0 items-center justify-center rounded-lg bg-cdl-blue/10`}>
                <svg className={`${mobileShell ? 'h-5 w-5' : 'h-6 w-6'} text-cdl-blue`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`mb-2 font-semibold text-gray-900 ${mobileShell ? 'text-[15px]' : ''}`}>Acesso às Consultas</h3>
                <p className={`text-cdl-gray-text ${mobileShell ? 'text-xs leading-snug' : 'text-sm'}`}>
                  Acesso às plataformas de consulta limitado ao tipo de pacote escolhido na sua associação.
                </p>
              </div>
            </div>
          </div>

          <div className={cardBase}>
            <div className={`flex items-start ${mobileShell ? 'gap-3' : 'gap-4'}`}>
              <div className={`flex ${iconBoxSm} shrink-0 items-center justify-center rounded-lg bg-cdl-blue/10`}>
                <svg className={`${mobileShell ? 'h-5 w-5' : 'h-6 w-6'} text-cdl-blue`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`mb-2 font-semibold text-gray-900 ${mobileShell ? 'text-[15px]' : ''}`}>Certificado Digital</h3>
                <p className={`text-cdl-gray-text ${mobileShell ? 'mb-2 text-xs' : 'mb-2 text-sm'}`}>Desconto especial para associados.</p>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-cdl-blue">R$ 156,00</span>
                  <span className={`text-cdl-gray-text line-through ${mobileShell ? 'text-xs' : 'text-sm'}`}>R$ 189,00</span>
                </div>
                <Link href={r('/servicos/certificado-digital')} prefetch={false} className="mt-2 inline-block text-sm font-medium text-cdl-blue hover:underline">
                  Saiba mais →
                </Link>
              </div>
            </div>
          </div>

          <div className={cardBase}>
            <div className={`flex items-start ${mobileShell ? 'gap-3' : 'gap-4'}`}>
              <div className={`flex ${iconBoxSm} shrink-0 items-center justify-center rounded-lg bg-cdl-blue/10`}>
                <svg className={`${mobileShell ? 'h-5 w-5' : 'h-6 w-6'} text-cdl-blue`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`mb-2 font-semibold text-gray-900 ${mobileShell ? 'text-[15px]' : ''}`}>Clube de Benefícios</h3>
                <p className={`text-cdl-gray-text ${mobileShell ? 'mb-3 text-xs' : 'mb-3 text-sm'}`}>
                  Acesse descontos e vantagens exclusivas em diversos estabelecimentos parceiros.
                </p>
                <Link href={r('/servicos/beneficios-associados')} prefetch={false} className="inline-flex items-center gap-1 text-sm font-medium text-cdl-blue hover:underline">
                  Veja mais
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className={cardBase}>
            <div className={`flex items-start ${mobileShell ? 'gap-3' : 'gap-4'}`}>
              <div className={`flex ${iconBoxSm} shrink-0 items-center justify-center rounded-lg bg-cdl-blue/10`}>
                <svg className={`${mobileShell ? 'h-5 w-5' : 'h-6 w-6'} text-cdl-blue`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`mb-2 font-semibold text-gray-900 ${mobileShell ? 'text-[15px]' : ''}`}>Participação em Campanhas</h3>
                <p className={`text-cdl-gray-text ${mobileShell ? 'text-xs leading-snug' : 'text-sm'}`}>
                  Participe de campanhas promocionais exclusivas como Natal Premiado, Liquida Paulo Afonso e outras ações especiais.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`mb-10 rounded-xl border border-gray-200 bg-cdl-gray ${mobileShell ? 'p-4' : 'p-6'}`}>
        <div className={`flex items-start ${mobileShell ? 'gap-3' : 'gap-4'}`}>
          <div className={`flex ${iconBoxSm} shrink-0 items-center justify-center rounded-lg bg-cdl-blue/10`}>
            <svg className={`${mobileShell ? 'h-5 w-5' : 'h-6 w-6'} text-cdl-blue`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`mb-2 font-semibold text-gray-900 ${mobileShell ? 'text-[15px]' : ''}`}>Segunda Via</h3>
            <p className={`text-cdl-gray-text mb-4 ${mobileShell ? 'text-xs' : 'text-sm'}`}>
              Precisa de segunda via de documentos ou comprovantes? Entre em contato conosco através do atendimento.
            </p>
            <Link href={r('/atendimento')} prefetch={false} className="inline-flex items-center gap-1 text-sm font-medium text-cdl-blue hover:underline">
              Solicitar segunda via
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className={cardBase}>
        <h3 className={`mb-4 font-semibold text-gray-900 ${mobileShell ? 'text-sm' : ''}`}>Links Rápidos</h3>
        <div className={`flex flex-wrap gap-2 ${mobileShell ? 'flex-col' : 'gap-3'}`}>
          <a
            href={SPC_LOGIN}
            target="_blank"
            rel="noopener noreferrer"
            className={
              mobileShell ?
                'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50'
              : 'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
            }
          >
            Sistema SPC
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <Link
            href={r('/servicos/beneficios-associados')}
            prefetch={false}
            className={
              mobileShell ?
                'inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50'
              : 'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
            }
          >
            Clube de Benefícios
          </Link>
          <Link
            href={r('/servicos/certificado-digital')}
            prefetch={false}
            className={
              mobileShell ?
                'inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50'
              : 'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
            }
          >
            Certificado Digital
          </Link>
          <Link
            href={r('/atendimento')}
            prefetch={false}
            className={
              mobileShell ?
                'inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50'
              : 'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
            }
          >
            Atendimento
          </Link>
        </div>
      </div>
    </div>
  );
}
