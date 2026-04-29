import type { ReactNode } from 'react';

/**
 * Necessário com `output: 'export'`: o segmento `[id]` precisa de generateStaticParams.
 * Os IDs reais são resolvidos no cliente (Firebase); o build gera a rota vazia.
 */
export async function generateStaticParams() {
  /* Export estático exige ao menos um caminho; IDs reais são resolvidos no cliente após o deploy. */
  return [{ id: '__placeholder__' }];
}

export default function AdminCarouselIdLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
