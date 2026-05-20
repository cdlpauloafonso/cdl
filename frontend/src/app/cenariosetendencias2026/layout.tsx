import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ctm-display',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-ctm-body',
});

export const viewport: Viewport = {
  themeColor: '#050d1a',
};

export const metadata: Metadata = {
  title: 'Cenários, Tendências & Mercado 2026 | CDL Paulo Afonso',
  description:
    'Encontro de qualificação empresarial da CDL Paulo Afonso: palestras, painéis e networking para empresários e gestores do comércio. 11 de junho de 2026 — Auditório da UNIRIOS.',
  openGraph: {
    title: 'Cenários, Tendências & Mercado 2026',
    description:
      'Palestras, painéis e networking para empresários do comércio e serviços. Paulo Afonso — BA.',
    images: ['/eventos/cenarios-tendencias-2026/banner-wide.png'],
  },
};

export default function CenariosTendenciasLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${body.variable} ${body.className}`}>{children}</div>;
}
