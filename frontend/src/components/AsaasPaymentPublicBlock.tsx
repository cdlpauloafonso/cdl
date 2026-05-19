'use client';

import { formatPaymentAmountBrl } from '@/lib/event-payment-fields';

type Props = {
  amount: number;
  description?: string;
  invoiceUrl: string;
  className?: string;
};

export function AsaasPaymentPublicBlock({ amount, description, invoiceUrl, className = '' }: Props) {
  return (
    <section
      className={`rounded-xl border border-cdl-blue/25 bg-gradient-to-b from-cdl-blue/5 to-white p-6 sm:p-8 ${className}`}
    >
      <p className="text-sm font-semibold text-cdl-blue uppercase tracking-wide">Pagamento da inscrição</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{formatPaymentAmountBrl(amount)}</p>
      {description && <p className="mt-1 text-sm text-cdl-gray-text">{description}</p>}
      <p className="mt-4 text-sm text-cdl-gray-text leading-relaxed">
        Clique no botão abaixo para pagar com PIX, boleto ou cartão na página segura do Asaas. Após a confirmação
        do pagamento, sua inscrição será atualizada automaticamente.
      </p>
      <a
        href={invoiceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-block mt-6 w-full sm:w-auto text-center"
      >
        Ir para pagamento
      </a>
    </section>
  );
}
