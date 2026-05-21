'use client';

import type { ReactNode } from 'react';

export type AdminSensitiveConfirmModalProps = {
  open: boolean;
  title: string;
  titleId?: string;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  /** Botão de confirmação: vermelho (exclusão), âmbar (alerta) ou azul (ação principal). */
  confirmTone?: 'danger' | 'warning' | 'primary';
  /** Faixa “Área sensível — administrador” no topo (desligar em fluxos públicos). */
  showSensitiveBanner?: boolean;
  /** Apenas um botão de fechar (ex.: mensagem de sucesso). */
  alertOnly?: boolean;
  /** Ícone e destaque em verde (sucesso). */
  successVariant?: boolean;
};

export function AdminSensitiveConfirmModal({
  open,
  title,
  titleId = 'admin-sensitive-confirm-title',
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  busy = false,
  confirmTone = 'danger',
  showSensitiveBanner = true,
  alertOnly = false,
  successVariant = false,
}: AdminSensitiveConfirmModalProps) {
  if (!open) return null;

  const iconWrapClass = successVariant
    ? 'flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100'
    : 'flex h-14 w-14 items-center justify-center rounded-full bg-amber-100';
  const iconClass = successVariant ? 'h-7 w-7 text-emerald-700' : 'h-7 w-7 text-amber-700';

  const confirmClass =
    confirmTone === 'primary'
      ? 'rounded-lg bg-cdl-blue px-4 py-2 text-sm font-medium text-white hover:bg-cdl-blue-dark disabled:opacity-50'
      : confirmTone === 'warning'
        ? 'rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50'
        : 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {showSensitiveBanner ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
            <p className="text-sm font-semibold text-amber-900">Área sensível — administrador</p>
            <p className="mt-1 text-xs text-amber-800">
              Esta ação altera dados oficiais do evento. Prossiga somente se tiver autorização e certeza do impacto.
            </p>
          </div>
        ) : null}
        <div className="p-6">
          <div className="mb-4 flex justify-center">
            <div className={iconWrapClass}>
              {successVariant ? (
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              )}
            </div>
          </div>
          <h3 id={titleId} className="text-center text-lg font-bold text-gray-900">
            {title}
          </h3>
          {children ? <div className="mt-3 text-center text-sm text-gray-600">{children}</div> : null}
          <div
            className={`mt-6 flex flex-wrap gap-2 ${alertOnly ? 'justify-center' : 'justify-end'}`}
          >
            {!alertOnly ? (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            ) : null}
            <button type="button" onClick={onConfirm} disabled={busy} className={confirmClass}>
              {busy ? 'Aguarde…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
