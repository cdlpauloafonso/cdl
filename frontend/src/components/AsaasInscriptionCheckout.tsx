'use client';

import { useEffect, useState } from 'react';
import { formatPaymentAmountBrl } from '@/lib/event-payment-fields';
import type { InscriptionPaymentPixCheckout } from '@/lib/asaas-api';
import { subscribeEventInscription, type EventInscriptionPaymentStatus } from '@/lib/firestore';

type Props = {
  campaignId: string;
  inscriptionId: string;
  amount: number;
  description?: string;
  invoiceUrl: string;
  pix: InscriptionPaymentPixCheckout;
  className?: string;
  onPaid?: () => void;
};

function pixImageSrc(encodedImage: string): string {
  const raw = encodedImage.trim();
  if (raw.startsWith('data:')) return raw;
  return `data:image/png;base64,${raw}`;
}

export function AsaasInscriptionCheckout({
  campaignId,
  inscriptionId,
  amount,
  description,
  invoiceUrl,
  pix,
  className = '',
  onPaid,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<EventInscriptionPaymentStatus | undefined>(
    undefined,
  );

  useEffect(() => {
    const unsub = subscribeEventInscription(campaignId, inscriptionId, (row) => {
      const status = row?.paymentStatus;
      setPaymentStatus(status);
      if (status === 'paid') {
        onPaid?.();
      }
    });
    return () => unsub();
  }, [campaignId, inscriptionId, onPaid]);

  async function copyPixPayload() {
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback silencioso */
    }
  }

  const isPaid = paymentStatus === 'paid';
  const isPending = !paymentStatus || paymentStatus === 'pending';

  return (
    <section
      className={`rounded-xl border border-cdl-blue/25 bg-gradient-to-b from-cdl-blue/5 to-white p-6 sm:p-8 ${className}`}
    >
      <p className="text-sm font-semibold text-cdl-blue uppercase tracking-wide">Pagamento da inscrição</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{formatPaymentAmountBrl(amount)}</p>
      {description ? <p className="mt-1 text-sm text-cdl-gray-text">{description}</p> : null}

      {isPaid ? (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Pagamento confirmado. Seu QR Code de credenciamento aparecerá abaixo em instantes.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-cdl-gray-text leading-relaxed">
            Escaneie o QR Code PIX abaixo ou copie o código. A confirmação é automática — não feche esta página
            após pagar.
          </p>

          <div className="mt-6 flex flex-col items-center">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pixImageSrc(pix.encodedImage)}
                alt="QR Code PIX para pagamento da inscrição"
                width={220}
                height={220}
                className="mx-auto h-[220px] w-[220px]"
              />
            </div>
            {pix.expirationDate ? (
              <p className="mt-2 text-xs text-cdl-gray-text">
                Validade do QR: {pix.expirationDate}
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <label className="block text-xs font-medium text-gray-600 mb-1">PIX copia e cola</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={pix.payload}
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-800"
              />
              <button type="button" onClick={copyPixPayload} className="btn-secondary shrink-0 text-sm">
                {copied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
          </div>

          {isPending ? (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-cdl-blue">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cdl-blue border-t-transparent" />
              Aguardando confirmação do pagamento…
            </p>
          ) : null}

          <details className="mt-6 rounded-lg border border-gray-200 bg-gray-50/80">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-800">
              Pagar com cartão ou boleto
            </summary>
            <p className="px-4 pb-3 text-xs text-cdl-gray-text">
              Abre a página segura do Asaas em nova aba. Volte aqui após pagar — a confirmação atualiza
              automaticamente.
            </p>
            <div className="px-4 pb-4">
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-block text-sm"
              >
                Abrir outras formas de pagamento
              </a>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
