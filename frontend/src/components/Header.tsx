'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const menuItems = [
  { href: '/', label: 'Home' },
  {
    label: 'Institucional',
    children: [
      { href: '/institucional/cdl-paulo-afonso', label: 'CDL Paulo Afonso' },
      { href: '/institucional/nossa-cidade', label: 'Nossa Cidade' },
      { href: '/institucional/campanhas', label: 'Campanhas e Eventos' },
    ],
  },
  {
    label: 'Soluções para empresas',
    children: [
      { href: '/servicos', label: 'Todos os serviços' },
      { href: '/servicos/auditorio', label: 'Auditório' },
      { href: '/servicos/certificado-digital', label: 'Certificado Digital' },
      { href: '/servicos/beneficios-associados', label: 'Benefícios para associados' },
      { href: '/servicos/vagas-emprego', label: 'Vagas de Emprego' },
    ],
  },
  { href: '/noticias', label: 'Notícias' },
  { href: '/atendimento', label: 'Atendimento' },
  { href: '/area-associado', label: 'Área do Associado' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200/80">
      <div className="container-cdl">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center bg-transparent"
            aria-label="CDL Paulo Afonso - Home"
          >
            <Image
              src="/logo-site.png"
              alt="CDL Paulo Afonso"
              width={256}
              height={99}
              sizes="(max-width: 640px) 200px, 240px"
              className="h-9 w-auto object-contain object-left sm:h-11"
              priority
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-nowrap" aria-label="Menu principal">
            {menuItems.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-cdl-blue rounded-lg hover:bg-cdl-gray transition-colors flex items-center gap-1 whitespace-nowrap"
                    aria-expanded={openDropdown === item.label}
                    aria-haspopup="true"
                  >
                    {item.label}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === item.label && (
                    <div className="absolute left-0 top-full pt-1 w-48 animate-fade-in">
                      <div className="rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-cdl-gray hover:text-cdl-blue"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.href!}
                  href={item.href!}
                  className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-cdl-blue rounded-lg hover:bg-cdl-gray transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/associe-se"
              className="btn-primary text-sm py-2.5 px-4 hidden sm:inline-flex whitespace-nowrap"
            >
              Associe-se
            </Link>
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-cdl-gray hover:text-cdl-blue"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white animate-slide-up">
          <nav className="container-cdl py-4 flex flex-col gap-1" aria-label="Menu mobile">
            {menuItems.map((item) =>
              item.children ? (
                <div key={item.label} className="py-2">
                  <span className="block px-4 py-1 text-xs font-semibold uppercase text-cdl-gray-text">{item.label}</span>
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block px-4 py-2 text-gray-700 hover:bg-cdl-gray rounded-lg"
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.href!}
                  href={item.href!}
                  className="px-4 py-3 text-gray-700 hover:bg-cdl-gray rounded-lg font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}
            <Link
              href="/associe-se"
              className="btn-primary mx-4 mt-2"
              onClick={() => setMobileOpen(false)}
            >
              Associe-se
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
