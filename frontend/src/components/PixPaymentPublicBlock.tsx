'use client';

import { useState } from 'react';
import type { EffectivePayment } from '@/lib/event-payment-fields';

type Props = {
  payment: Extract<EffectivePayment, { kind: 'pix' }>;
  className?: string;
};

export function PixPaymentPublicBlock({ payment, className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    const text = payment.copyPaste?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <section
      className={`rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6 ${className}`}
      aria-labelledby="pix-payment-heading"
    >
      <h2 id="pix-payment-heading" className="text-lg font-bold text-gray-900 mb-2">
        Pagamento (PIX)
      </h2>
      <p className="text-sm text-gray-700 mb-4">
        Utilize o QR Code ou copie o código abaixo no app do seu banco em <strong>Pix copia e cola</strong>.
      </p>
      <div className="space-y-4">
        {payment.imageUrl && (
          <div className="flex justify-center sm:justify-start">
            <img
              src={payment.imageUrl}
              alt="QR Code ou instruções visuais para pagamento PIX"
              className="max-w-full max-h-64 w-auto rounded-lg border border-emerald-100 bg-white p-2 shadow-sm"
            />
          </div>
        )}
        {payment.copyPaste && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código copia e cola</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <textarea
                readOnly
                value={payment.copyPaste}
                rows={4}
                className="min-h-[88px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900"
              />
              <button
                type="button"
                onClick={() => void copyCode()}
                className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {copied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
