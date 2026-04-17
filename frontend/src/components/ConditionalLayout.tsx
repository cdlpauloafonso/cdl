'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { WhatsAppButton } from './WhatsAppButton';
import { initFirebase } from '@/lib/firebase';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const isAgendamentosPage = pathname === '/agendamentos';
  const isConfiguracoesPage = pathname === '/admin/configuracoes';

  useEffect(() => {
    // Initialize Firebase/Analytics only on public pages (not in admin and not agendamentos)
    if (!isAdmin && !isAgendamentosPage) {
      initFirebase();
    }
  }, [isAdmin, isAgendamentosPage]);

  // Página de agendamentos - layout limpo sem header, footer ou WhatsApp
  if (isAgendamentosPage) {
    return <>{children}</>;
  }

  // Área admin - WhatsApp apenas na página de configurações
  if (isAdmin) {
    return (
      <>
        {children}
        {isConfiguracoesPage && <WhatsAppButton />}
      </>
    );
  }

  // Páginas públicas - layout completo com header, footer e WhatsApp
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <Header />
      <main className="min-w-0 w-full flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
