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

  if (isAdmin) {
    return (
      <>
        {children}
        <WhatsAppButton />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
