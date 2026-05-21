'use client';

import { useEffect, useState } from 'react';
import { formatPaymentAmountBrl } from '@/lib/event-payment-fields';
import {
  payAsaasInscriptionWithCreditCard,
  type AsaasCreditCardHolderInput,
  type AsaasCreditCardInput,
  type CreateInscriptionPaymentResponse,
  type InscriptionCardHolderPrefill,
  type InscriptionPaymentBoletoCheckout,
  type InscriptionPaymentPixCheckout,
} from '@/lib/asaas-api';
import { formatCnpjDisplay } from '@/lib/brasil-api-cnpj';
import { formatBrazilPhoneDisplay, formatCpfDisplay } from '@/lib/input-masks-br';
import { subscribeEventInscription, type EventInscriptionPaymentStatus } from '@/lib/firestore';

type PaymentMethodTab = 'pix' | 'boleto' | 'card';

type Props = {
  campaignId: string;
  inscriptionId: string;
  amount: number;
  description?: string;
  checkout: CreateInscriptionPaymentResponse;
  holderPrefill?: InscriptionCardHolderPrefill;
  className?: string;
  onPaid?: () => void;
  onCheckoutRefresh?: () => Promise<CreateInscriptionPaymentResponse>;
};

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function pixImageSrc(encodedImage: string): string {
  const raw = encodedImage.trim();
  if (raw.startsWith('data:')) return raw;
  return `data:image/png;base64,${raw}`;
}

function formatBoletoLine(field: string): string {
  const d = onlyDigits(field);
  if (d.length <= 5) return d;
  const parts: string[] = [];
  let i = 0;
  while (i < d.length) {
    const size = parts.length === 0 ? 5 : parts.length < 3 ? 5 : parts.length === 3 ? 6 : 5;
    parts.push(d.slice(i, i + size));
    i += size;
    if (parts.length >= 8) break;
  }
  if (i < d.length) parts.push(d.slice(i));
  return parts.join(' ');
}

function formatCepDisplay(raw: string): string {
  const d = onlyDigits(raw).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function buildHolderDefaults(prefill?: InscriptionCardHolderPrefill): AsaasCreditCardHolderInput {
  return {
    name: prefill?.name?.trim() ?? '',
    email: prefill?.email?.trim() ?? '',
    cpfCnpj: prefill?.cpfCnpj ? formatCpfDisplay(prefill.cpfCnpj) : '',
    postalCode: prefill?.postalCode ? formatCepDisplay(prefill.postalCode) : '',
    addressNumber: prefill?.addressNumber?.trim() ?? 'S/N',
    phone: prefill?.phone ? formatBrazilPhoneDisplay(prefill.phone) : '',
    addressComplement: prefill?.addressComplement?.trim() ?? '',
  };
}

export function AsaasInscriptionCheckout({
  campaignId,
  inscriptionId,
  amount,
  description,
  checkout: initialCheckout,
  holderPrefill,
  className = '',
  onPaid,
  onCheckoutRefresh,
}: Props) {
  const [checkout, setCheckout] = useState(initialCheckout);
  const [tab, setTab] = useState<PaymentMethodTab>('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<EventInscriptionPaymentStatus | undefined>(
    undefined,
  );

  const [card, setCard] = useState({
    holderName: '',
    number: '',
    expiry: '',
    ccv: '',
  });
  const [holder, setHolder] = useState(() => buildHolderDefaults(holderPrefill));
  const [payingCard, setPayingCard] = useState(false);
  const [cardError, setCardError] = useState('');

  useEffect(() => {
    setCheckout(initialCheckout);
  }, [initialCheckout]);

  useEffect(() => {
    const unsub = subscribeEventInscription(campaignId, inscriptionId, (row) => {
      const status = row?.paymentStatus;
      setPaymentStatus(status);
      if (status === 'paid') onPaid?.();
    });
    return () => unsub();
  }, [campaignId, inscriptionId, onPaid]);

  const pix = checkout.pix;
  const boleto = checkout.boleto;
  const isPaid = paymentStatus === 'paid';
  const isPending = !paymentStatus || paymentStatus === 'pending';
  const hasPix = Boolean(pix?.payload?.trim() && pix?.encodedImage?.trim());
  const hasBoleto = Boolean(boleto?.identificationField?.trim());

  async function refreshCheckout() {
    if (!onCheckoutRefresh) return;
    setRefreshing(true);
    try {
      const next = await onCheckoutRefresh();
      setCheckout(next);
    } finally {
      setRefreshing(false);
    }
  }

  async function copyText(text: string, which: 'pix' | 'boleto') {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'pix') {
        setCopiedPix(true);
        window.setTimeout(() => setCopiedPix(false), 2500);
      } else {
        setCopiedBoleto(true);
        window.setTimeout(() => setCopiedBoleto(false), 2500);
      }
    } catch {
      /* silencioso */
    }
  }

  async function submitCard(e: React.FormEvent) {
    e.preventDefault();
    setCardError('');
    const expiryParts = card.expiry.replace(/\s/g, '').split('/');
    const expiryMonth = expiryParts[0]?.trim();
    let expiryYear = expiryParts[1]?.trim() ?? '';
    if (expiryYear.length === 2) expiryYear = `20${expiryYear}`;

    if (!card.holderName.trim() || onlyDigits(card.number).length < 13 || !expiryMonth || !expiryYear) {
      setCardError('Preencha nome no cartão, número e validade (MM/AA).');
      return;
    }
    if (!card.ccv.trim()) {
      setCardError('Informe o código de segurança (CVV).');
      return;
    }
    if (onlyDigits(holder.cpfCnpj).length < 11) {
      setCardError('Informe CPF ou CNPJ do titular.');
      return;
    }
    if (!holder.email.trim()) {
      setCardError('Informe o e-mail do titular.');
      return;
    }
    if (onlyDigits(holder.postalCode).length < 8) {
      setCardError('Informe o CEP do titular.');
      return;
    }
    if (!onlyDigits(holder.phone)) {
      setCardError('Informe o telefone do titular.');
      return;
    }

    const creditCard: AsaasCreditCardInput = {
      holderName: card.holderName.trim(),
      number: onlyDigits(card.number),
      expiryMonth,
      expiryYear,
      ccv: card.ccv.trim(),
    };
    const creditCardHolderInfo: AsaasCreditCardHolderInput = {
      name: holder.name.trim(),
      email: holder.email.trim(),
      cpfCnpj: onlyDigits(holder.cpfCnpj),
      postalCode: onlyDigits(holder.postalCode),
      addressNumber: holder.addressNumber.trim() || 'S/N',
      phone: onlyDigits(holder.phone),
      ...(holder.addressComplement?.trim()
        ? { addressComplement: holder.addressComplement.trim() }
        : {}),
    };

    setPayingCard(true);
    try {
      const result = await payAsaasInscriptionWithCreditCard(
        campaignId,
        inscriptionId,
        creditCard,
        creditCardHolderInfo,
      );
      if (result.paid) {
        onPaid?.();
      } else {
        setCardError(
          'Pagamento em processamento. Aguarde a confirmação nesta página ou tente outra forma de pagamento.',
        );
      }
    } catch (err) {
      setCardError(err instanceof Error ? err.message : 'Não foi possível processar o cartão.');
    } finally {
      setPayingCard(false);
    }
  }

  const tabBtn = (id: PaymentMethodTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        tab === id
          ? 'bg-cdl-blue text-white shadow-sm'
          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

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
            Escolha a forma de pagamento abaixo. Tudo é feito nesta página — a confirmação é automática.
          </p>

          <div className="mt-5 flex gap-2" role="tablist" aria-label="Forma de pagamento">
            {tabBtn('pix', 'PIX')}
            {tabBtn('boleto', 'Boleto')}
            {tabBtn('card', 'Cartão')}
          </div>

          <div className="mt-6" role="tabpanel">
            {tab === 'pix' && (
              <PixPanel
                pix={pix}
                hasPix={hasPix}
                copied={copiedPix}
                isPending={isPending}
                refreshing={refreshing}
                onRefresh={onCheckoutRefresh ? refreshCheckout : undefined}
                onCopy={() => pix?.payload && copyText(pix.payload, 'pix')}
              />
            )}
            {tab === 'boleto' && (
              <BoletoPanel
                boleto={boleto}
                hasBoleto={hasBoleto}
                copied={copiedBoleto}
                isPending={isPending}
                refreshing={refreshing}
                onRefresh={onCheckoutRefresh ? refreshCheckout : undefined}
                onCopy={() => boleto?.identificationField && copyText(boleto.identificationField, 'boleto')}
              />
            )}
            {tab === 'card' && (
              <CardPanel
                card={card}
                holder={holder}
                cardError={cardError}
                payingCard={payingCard}
                isPending={isPending}
                onCardChange={setCard}
                onHolderChange={setHolder}
                onSubmit={submitCard}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

function PixPanel({
  pix,
  hasPix,
  copied,
  isPending,
  refreshing,
  onRefresh,
  onCopy,
}: {
  pix: InscriptionPaymentPixCheckout | null;
  hasPix: boolean;
  copied: boolean;
  isPending: boolean;
  refreshing: boolean;
  onRefresh?: () => void;
  onCopy: () => void;
}) {
  if (!hasPix || !pix) {
    return (
      <UnavailableMethod
        message="O QR Code PIX ainda está sendo gerado. Aguarde alguns segundos e atualize."
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    );
  }
  return (
    <>
      <p className="text-sm text-cdl-gray-text">
        Escaneie o QR Code ou copie o código PIX copia e cola no app do seu banco.
      </p>
      <div className="mt-5 flex flex-col items-center">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pixImageSrc(pix.encodedImage)}
            alt="QR Code PIX"
            width={220}
            height={220}
            className="mx-auto h-[220px] w-[220px]"
          />
        </div>
        {pix.expirationDate ? (
          <p className="mt-2 text-xs text-cdl-gray-text">Validade do QR: {pix.expirationDate}</p>
        ) : null}
      </div>
      <div className="mt-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">PIX copia e cola</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            readOnly
            value={pix.payload}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-800"
          />
          <button type="button" onClick={onCopy} className="btn-secondary shrink-0 text-sm">
            {copied ? 'Copiado!' : 'Copiar código'}
          </button>
        </div>
      </div>
      {isPending ? <PendingSpinner /> : null}
    </>
  );
}

function BoletoPanel({
  boleto,
  hasBoleto,
  copied,
  isPending,
  refreshing,
  onRefresh,
  onCopy,
}: {
  boleto: InscriptionPaymentBoletoCheckout | null;
  hasBoleto: boolean;
  copied: boolean;
  isPending: boolean;
  refreshing: boolean;
  onRefresh?: () => void;
  onCopy: () => void;
}) {
  if (!hasBoleto || !boleto) {
    return (
      <UnavailableMethod
        message="A linha digitável do boleto ainda está sendo gerada. Aguarde alguns segundos e atualize."
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    );
  }
  return (
    <>
      <p className="text-sm text-cdl-gray-text">
        Copie a linha digitável e pague no internet banking ou app do banco. O boleto também pode ser pago em
        lotéricas e caixas eletrônicos.
      </p>
      {boleto.dueDate ? (
        <p className="mt-2 text-sm font-medium text-gray-800">Vencimento: {boleto.dueDate}</p>
      ) : null}
      <div className="mt-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Linha digitável</label>
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-mono text-gray-900 break-all leading-relaxed">
          {formatBoletoLine(boleto.identificationField)}
        </p>
        <button type="button" onClick={onCopy} className="btn-secondary mt-2 text-sm">
          {copied ? 'Copiado!' : 'Copiar linha digitável'}
        </button>
      </div>
      {boleto.barCode ? (
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Código de barras</label>
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-800 break-all">
            {boleto.barCode}
          </p>
        </div>
      ) : null}
      {isPending ? <PendingSpinner /> : null}
    </>
  );
}

function CardPanel({
  card,
  holder,
  cardError,
  payingCard,
  isPending,
  onCardChange,
  onHolderChange,
  onSubmit,
}: {
  card: { holderName: string; number: string; expiry: string; ccv: string };
  holder: AsaasCreditCardHolderInput & { addressComplement?: string };
  cardError: string;
  payingCard: boolean;
  isPending: boolean;
  onCardChange: (v: typeof card) => void;
  onHolderChange: (v: typeof holder) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-cdl-gray-text">
        Informe os dados do cartão. O pagamento é processado de forma segura; os dados não ficam armazenados
        neste site.
      </p>
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Cartão</legend>
        <input
          type="text"
          autoComplete="cc-name"
          placeholder="Nome impresso no cartão"
          value={card.holderName}
          onChange={(e) => onCardChange({ ...card, holderName: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="Número do cartão"
          value={card.number}
          onChange={(e) => onCardChange({ ...card, number: e.target.value.replace(/\D/g, '').slice(0, 19) })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="Validade (MM/AA)"
            value={card.expiry}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, '').slice(0, 4);
              if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
              onCardChange({ ...card, expiry: v });
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="CVV"
            value={card.ccv}
            onChange={(e) => onCardChange({ ...card, ccv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
          />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Titular</legend>
        <input
          type="text"
          placeholder="Nome completo"
          value={holder.name}
          onChange={(e) => onHolderChange({ ...holder, name: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          autoComplete="email"
          placeholder="E-mail"
          value={holder.email}
          onChange={(e) => onHolderChange({ ...holder, email: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="CPF ou CNPJ"
          value={holder.cpfCnpj}
          onChange={(e) => {
            const d = onlyDigits(e.target.value);
            const cpfCnpj =
              d.length > 11 ? formatCnpjDisplay(e.target.value) : formatCpfDisplay(e.target.value);
            onHolderChange({ ...holder, cpfCnpj });
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="numeric"
            placeholder="CEP"
            value={holder.postalCode}
            onChange={(e) =>
              onHolderChange({ ...holder, postalCode: formatCepDisplay(e.target.value) })
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Número"
            value={holder.addressNumber}
            onChange={(e) => onHolderChange({ ...holder, addressNumber: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="Telefone com DDD"
          value={holder.phone}
          onChange={(e) =>
            onHolderChange({ ...holder, phone: formatBrazilPhoneDisplay(e.target.value) })
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </fieldset>
      {cardError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{cardError}</p>
      ) : null}
      <button type="submit" disabled={payingCard} className="btn-primary w-full sm:w-auto">
        {payingCard ? 'Processando…' : 'Pagar com cartão'}
      </button>
      {isPending && !payingCard ? <PendingSpinner /> : null}
    </form>
  );
}

function UnavailableMethod({
  message,
  refreshing,
  onRefresh,
}: {
  message: string;
  refreshing: boolean;
  onRefresh?: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
      <p>{message}</p>
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn-secondary mt-3 text-sm"
        >
          {refreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
      ) : null}
    </div>
  );
}

function PendingSpinner() {
  return (
    <p className="mt-4 flex items-center justify-center gap-2 text-sm text-cdl-blue">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cdl-blue border-t-transparent" />
      Aguardando confirmação do pagamento…
    </p>
  );
}
