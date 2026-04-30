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
  { href: '/admin/aniversarios', label: 'Aniversariantes' },
  { href: '/admin/eventos', label: 'Eventos' },
  { href: '/admin/cdl-paulo-afonso', label: 'CDL Paulo Afonso' },
  { href: '/admin/diretoria', label: 'Diretoria' },
  { href: '/admin/informativos', label: 'Informativos' },
  { href: '/admin/livro-caixa', label: 'Livro Caixa' },
    {
      label: 'Auditório',
      children: [
        { href: '/admin/agendamentos', label: 'Agenda' },
        { href: '/admin/auditorio', label: 'Auditório' },
      ],
    },
  { href: '/admin/contratos', label: 'Contratos' },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    setMobileMenuOpen(false);
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
    <div className="min-h-screen bg-cdl-gray lg:flex">
      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`${
          sidebarCollapsed ? 'lg:w-0 lg:min-w-0 lg:border-r-0' : 'lg:w-60'
        } fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] -translate-x-full border-r border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-slate-100 flex flex-col transition-all duration-300 lg:z-40 lg:max-w-none lg:translate-x-0 ${
          sidebarCollapsed ? 'overflow-hidden' : 'overflow-visible'
        } ${
          mobileMenuOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className={`${sidebarCollapsed ? 'lg:hidden' : 'flex'} justify-start border-b border-slate-800/90 p-4`}>
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="CDL Paulo Afonso" 
              width={85} 
              height={31} 
              className="h-7 w-auto object-contain opacity-95 transition-all duration-300" 
            />
          </Link>
        </div>
        
        {/* Botão de retrair/expandir */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`absolute hidden rounded-full border border-slate-700 bg-slate-800 p-1.5 text-slate-100 shadow-lg shadow-black/30 transition-colors hover:bg-slate-700 lg:block ${
            sidebarCollapsed ? 'left-2 top-4' : '-right-3 top-8'
          }`}
          aria-label={sidebarCollapsed ? 'Expandir menu' : 'Retrair menu'}
        >
          <svg
            className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <nav className={`${sidebarCollapsed ? 'lg:hidden' : ''} flex-1 space-y-0.5 overflow-y-auto p-2.5`}>
          {adminNav.map((item) =>
            'children' in item ? (
              <div key={item.label} className="mb-0.5">
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${
                    expandedMenus.has(item.label)
                      ? 'border-cyan-500/70 bg-cyan-500/20 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]'
                      : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700 hover:bg-slate-800/90'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className={`min-w-0 flex-1 truncate whitespace-nowrap ${sidebarCollapsed ? 'hidden' : ''}`}>
                    {item.label}
                  </span>
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
                {expandedMenus.has(item.label) && !sidebarCollapsed && (
                  <div className="mt-0.5 space-y-0.5">
                    {(item.children ?? []).map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`ml-2.5 block rounded-md border-l-2 px-2.5 py-1.5 text-[13px] transition-colors ${
                          isNavChildActive(pathname, child.href)
                            ? 'border-cyan-400 bg-cyan-500/15 font-medium text-cyan-100'
                            : 'border-transparent text-slate-400 hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-200'
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
                className={`block rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  (item.href === '/admin/eventos' ? pathname.startsWith('/admin/eventos') : pathname === item.href)
                    ? 'border border-cyan-500/70 bg-cyan-500/20 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]'
                    : 'border border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className={sidebarCollapsed ? 'hidden' : ''}>{item.label}</span>
              </Link>
            )
          )}
        </nav>
        <div className={`${sidebarCollapsed ? 'lg:hidden' : ''} border-t border-slate-800/90 p-3`}>
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
            className="block w-full rounded-xl border border-red-900/40 bg-red-500/10 px-3 py-2 text-left text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
          >
            Sair
          </button>
        </div>
      </aside>
      {sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="fixed left-3 top-4 z-50 hidden rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-100 shadow-lg shadow-black/30 transition-colors hover:bg-slate-800 lg:inline-flex"
          aria-label="Expandir menu"
          title="Expandir menu"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      <div className={`flex-1 lg:min-w-0 ${sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-60'}`}>
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
          >
            Menu
          </button>
          <span className="text-sm font-semibold text-gray-800">Painel Administrativo</span>
          <div className="w-12" />
        </div>
        <div className="admin-page w-full max-w-full overflow-x-hidden p-4 sm:p-5 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
