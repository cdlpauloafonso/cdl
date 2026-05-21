import type { ReactNode } from 'react';
import type { Viewport } from 'next';

/** Credenciamento público (celular na entrada): sem zoom por gesto/pinch. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function PublicCredentialingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
