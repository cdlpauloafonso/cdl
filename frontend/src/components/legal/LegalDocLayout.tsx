import type { ReactNode } from 'react';

type LegalDocLayoutProps = {
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalDocLayout({ title, updatedAt, children }: LegalDocLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-12">
        <header className="mb-8 border-b border-gray-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-cdl-blue">CDL Paulo Afonso</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-cdl-gray-text">Última atualização: {updatedAt}</p>
        </header>
        <div className="prose-cdl space-y-6 text-sm leading-relaxed text-gray-700 sm:text-[15px]">
          {children}
        </div>
      </div>
    </div>
  );
}
