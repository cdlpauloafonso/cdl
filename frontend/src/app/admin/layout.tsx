'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const adminNav = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/carousel', label: 'Carrossel' },
  { href: '/admin/agendamentos', label: 'Agenda' },
  { href: '/admin/contratos', label: 'Contrato' },
  { href: '/admin/associados', label: 'Associados' },
  { href: '/admin/aniversarios', label: 'Aniversários' },
  { href: '/admin/paginas', label: 'Páginas' },
  { href: '/admin/cdl-paulo-afonso', label: 'CDL Paulo Afonso' },
  { href: '/admin/diretoria', label: 'Diretoria' },
    {
      label: 'Soluções para Empresas',
      children: [
        { href: '/admin/auditorio', label: 'Auditório' },
        { href: '/admin/certificado-digital', label: 'Certificado Digital' },
        { href: '/admin/beneficios-associados', label: 'Benefícios para Associados' },
        { href: '/admin/servicos', label: 'Serviços' },
      ],
    },
  { href: '/admin/noticias', label: 'Notícias' },
  { href: '/admin/campanhas', label: 'Campanhas' },
  { href: '/admin/contato', label: 'Mensagens' },
  { href: '/admin/configuracoes', label: 'Configurações' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined' && pathname.startsWith('/admin')) {
      document.title = 'Painel ADM | CDL';
    }
  }, [pathname]);

  if (!mounted) return null;

  const isLogin = pathname === '/admin' && !pathname.startsWith('/admin/');
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) return <>{children}</>;

  const token = typeof window !== 'undefined' ? localStorage.getItem('cdl_admin_token') : null;
  if (!token && pathname.startsWith('/admin')) {
    router.replace('/admin/login');
    return (
      <div className="min-h-screen flex items-center justify-center bg-cdl-gray">
        <p className="text-cdl-gray-text">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cdl-gray flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 bottom-0 z-40">
        <div className="p-4 border-b border-gray-200 flex justify-start">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="CDL Paulo Afonso" width={85} height={31} className="h-7 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {adminNav.map((item) =>
            'children' in item ? (
              <div key={item.label} className="mb-1">
                <p className="px-3 py-1.5 text-xs font-semibold text-cdl-gray-text uppercase tracking-wider">
                  {item.label}
                </p>
                {(item.children ?? []).map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-1 ${
                      pathname === child.href ? 'bg-cdl-blue text-white' : 'text-gray-700 hover:bg-cdl-gray'
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href ? 'bg-cdl-blue text-white' : 'text-gray-700 hover:bg-cdl-gray'
                }`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <Link href="/" className="block px-3 py-2 text-sm text-cdl-gray-text hover:text-cdl-blue">
            Ver site
          </Link>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('cdl_admin_token');
              router.push('/admin/login');
            }}
            className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            Sair
          </button>
        </div>
      </aside>
      <div className="flex-1 pl-56">
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
