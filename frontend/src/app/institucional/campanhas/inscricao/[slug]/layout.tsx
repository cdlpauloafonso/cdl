import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscrição no evento',
  description: 'Formulário de inscrição em eventos da CDL Paulo Afonso.',
};

export default function InscricaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
