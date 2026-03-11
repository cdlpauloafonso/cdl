import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auditório CDL | Agendamentos',
  description: 'Sistema de agendamentos do auditório da CDL Paulo Afonso',
};

export default function AgendamentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
