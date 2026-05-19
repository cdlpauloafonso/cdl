'use client';

type Props = {
  className?: string;
};

/** Faixa no topo ao visualizar evento/inscrição em modo rascunho (admin). */
export function CampaignDraftPreviewBanner({ className = '' }: Props) {
  return (
    <div
      className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
      role="status"
    >
      <p className="font-semibold">Visualização de rascunho</p>
      <p className="mt-0.5 text-amber-900/90">
        Esta página não está publicada. Somente administradores logados veem este conteúdo.
      </p>
    </div>
  );
}
