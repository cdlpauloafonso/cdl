import type { Metadata } from 'next';
import AdminShell from './AdminShell';

export const metadata: Metadata = {
  title: 'Painel ADM | CDL',
  icons: {
    icon: [{ url: '/admin-favicon.png', sizes: 'any' }],
    apple: [{ url: '/admin-favicon.png', sizes: '180x180' }],
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
