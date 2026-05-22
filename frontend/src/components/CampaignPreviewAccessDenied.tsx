'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Props = {
  loginHref?: string;
  backHref?: string;
  /** Sem padding externo (dentro de `InscriptionPageShell` no app). */
  embedded?: boolean;
};

/** Exibido quando `?preview=1` mas não há sessão admin válida. */
export function CampaignPreviewAccessDenied({
  loginHref: loginHrefProp,
  backHref = '/admin/eventos',
  embedded = false,
}: Props) {
  const [loginHref, setLoginHref] = useState(loginHrefProp ?? '/admin/login');

  useEffect(() => {
    if (loginHrefProp) {
      setLoginHref(loginHrefProp);
      return;
    }
    const returnTo = `${window.location.pathname}${window.location.search}`;
    setLoginHref(`/admin/login?redirect=${encodeURIComponent(returnTo)}`);
  }, [loginHrefProp]);
  const card = (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Pré-visualização indisponível</h1>
      <p className="text-sm text-cdl-gray-text leading-relaxed mb-6">
        Para ver o rascunho deste evento, faça login na área administrativa no mesmo navegador e
        abra o link <strong>Ver rascunho</strong> novamente.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={loginHref} className="btn-primary">
          Ir para login admin
        </Link>
        <Link href={backHref} className="btn-secondary">
          Voltar aos eventos
        </Link>
      </div>
    </div>
  );

  if (embedded) {
    return card;
  }

  return (
    <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30 min-h-[50vh]">
      <div className="container-cdl max-w-lg">{card}</div>
    </div>
  );
}
