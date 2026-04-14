'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initFirebase } from '@/lib/firebase';

const adminNav = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/carousel', label: 'Carrossel' },
  {
    label: 'Associados',
    children: [
      { href: '/admin/associados', label: 'Lista de Associados' },
      { href: '/admin/associados/adicionar', label: 'Adicionar Associado' },
      { href: '/admin/associados/planos', label: 'Planos' },
    ],
  },
  { href: '/admin/aniversarios', label: 'Aniversários' },
  { href: '/admin/eventos', label: 'Eventos' },
  { href: '/admin/paginas', label: 'Páginas' },
  { href: '/admin/cdl-paulo-afonso', label: 'CDL Paulo Afonso' },
  { href: '/admin/diretoria', label: 'Diretoria' },
    {
      label: 'Auditório',
      children: [
        { href: '/admin/agendamentos', label: 'Agenda' },
        { href: '/admin/contratos', label: 'Contrato' },
        { href: '/admin/auditorio', label: 'Auditório' },
      ],
    },
    {
      label: 'Soluções para Empresas',
      children: [
        { href: '/admin/certificado-digital', label: 'Certificado Digital' },
        { href: '/admin/beneficios-associados', label: 'Benefícios para Associados' },
        { href: '/admin/servicos', label: 'Serviços' },
      ],
    },
  {
    label: 'Vagas de Emprego',
    children: [
      { href: '/admin/vagas-emprego/vagas', label: 'Vagas' },
      { href: '/admin/vagas-emprego/curriculos', label: 'Currículos' },
    ],
  },
  { href: '/admin/noticias', label: 'Notícias' },
  { href: '/admin/campanhas', label: 'Campanhas' },
  { href: '/admin/contato', label: 'Mensagens' },
  { href: '/admin/configuracoes', label: 'Configurações' },
];

/** Lista de associados (/admin/associados) não deve ficar ativa em /admin/associados/... */
function isNavChildActive(pathname: string, childHref: string) {
  if (pathname === childHref) return true;
  if (childHref === '/admin/associados') return false;
  return pathname.startsWith(`${childHref}/`);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [firebaseSessionReady, setFirebaseSessionReady] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Firestore usa request.auth; precisamos da sessão Firebase restaurada antes das queries (ex.: associados).
  useEffect(() => {
    if (!mounted) return;
    if (pathname === '/admin/login') return;
    if (!pathname.startsWith('/admin')) return;
    const token = localStorage.getItem('cdl_admin_token');
    if (!token) return;

    initFirebase();
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseSessionReady(true);
      if (!user) {
        localStorage.removeItem('cdl_admin_token');
        if (pathname !== '/admin/login') router.replace('/admin/login');
        return;
      }
      try {
        await user.getIdToken(true);
      } catch {
        /* token refresh opcional */
      }
    });
    return () => unsub();
  }, [mounted, pathname, router]);

  useEffect(() => {
    if (typeof document !== 'undefined' && pathname.startsWith('/admin')) {
      document.title = 'Painel ADM | CDL';
    }
  }, [pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  // Auto-expand menus when their children are active
  useEffect(() => {
    const activeMenus = new Set<string>();
    adminNav.forEach(item => {
      if ('children' in item) {
        const hasActiveChild = item.children?.some(child => isNavChildActive(pathname, child.href));
        if (hasActiveChild) {
          activeMenus.add(item.label);
        }
      }
    });
    setExpandedMenus(activeMenus);
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

  if (token && pathname.startsWith('/admin') && !firebaseSessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cdl-gray">
        <p className="text-cdl-gray-text">Carregando sessão...</p>
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
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors text-left border ${
                    expandedMenus.has(item.label)
                      ? 'bg-cdl-blue text-white border-cdl-blue'
                      : 'text-gray-800 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                  }`}
                >
                  <span className="flex-1">{item.label}</span>
                  <svg
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${
                      expandedMenus.has(item.label) ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {expandedMenus.has(item.label) && (
                  <div className="mt-1 space-y-0.5">
                    {(item.children ?? []).map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-4 ${
                          isNavChildActive(pathname, child.href)
                            ? 'bg-cdl-blue text-white'
                            : 'text-gray-600 hover:bg-cdl-gray'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (item.href === '/admin/eventos' ? pathname.startsWith('/admin/eventos') : pathname === item.href)
                    ? 'bg-cdl-blue text-white'
                    : 'text-gray-700 hover:bg-cdl-gray'
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
            onClick={async () => {
              localStorage.removeItem('cdl_admin_token');
              try {
                initFirebase();
                await signOut(getAuth());
              } catch {
                /* noop */
              }
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
