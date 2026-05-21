import { asaasRequest } from './client.js';
import { getAsaasConfigEffective } from './config.js';
import type { AsaasCustomer, AsaasPayment, AsaasPaymentPixQrCode, AsaasWebhookEvent } from './types.js';
import { buildInscriptionExternalReference, parseInscriptionExternalReference } from './types.js';
import {
  getCampaignDoc,
  getInscriptionDoc,
  incrementCampaignVoucherUsedCount,
  isWebhookEventProcessed,
  resolveInscriptionPaymentAmount,
  updateInscriptionPayment,
} from '../inscription-firestore.js';

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function pickCustomerFromFields(fields: Record<string, string>): {
  name: string;
  cpfCnpj: string;
  email?: string;
} {
  const name =
    fields.nome_responsavel?.trim() ||
    fields.nome?.trim() ||
    fields.empresa?.trim() ||
    'Participante';
  const cpfCnpj = onlyDigits(fields.cpf ?? fields.cnpj ?? '');
  const email = fields.email_pessoal?.trim() || fields.email?.trim() || undefined;
  return { name, cpfCnpj, email };
}

function dueDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function findOrCreateCustomer(
  input: {
    name: string;
    cpfCnpj: string;
    email?: string;
  },
  config: Awaited<ReturnType<typeof getAsaasConfigEffective>>
): Promise<AsaasCustomer> {
  if (input.cpfCnpj.length >= 11) {
    const listed = await asaasRequest<{ data: AsaasCustomer[] }>(
      'GET',
      `/customers?cpfCnpj=${encodeURIComponent(input.cpfCnpj)}&limit=1`,
      undefined,
      config
    );
    const existing = listed.data?.[0];
    if (existing?.id) return existing;
  }

  return asaasRequest<AsaasCustomer>(
    'POST',
    '/customers',
    {
      name: input.name,
      cpfCnpj: input.cpfCnpj || undefined,
      email: input.email,
      notificationDisabled: true,
    },
    config
  );
}

export type InscriptionPaymentPixCheckout = {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
};

export type CreateInscriptionPaymentResult = {
  paymentId: string;
  invoiceUrl: string;
  customerId: string;
  amount: number;
  paymentStatus: string;
  /** Ausente quando o Asaas ainda não disponibilizou o QR (cliente usa invoiceUrl). */
  pix?: InscriptionPaymentPixCheckout | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** QR PIX pode demorar alguns instantes após criar a cobrança — tenta com pequenos intervalos. */
async function fetchPaymentPixQrCode(
  paymentId: string,
  config: Awaited<ReturnType<typeof getAsaasConfigEffective>>,
): Promise<InscriptionPaymentPixCheckout | null> {
  const delaysMs = [0, 500, 1200, 2500];
  for (const delay of delaysMs) {
    if (delay > 0) await sleep(delay);
    try {
      const qr = await asaasRequest<AsaasPaymentPixQrCode>(
        'GET',
        `/payments/${encodeURIComponent(paymentId)}/pixQrCode`,
        undefined,
        config,
      );
      const payload = qr.payload?.trim();
      const encodedImage = qr.encodedImage?.trim();
      if (payload && encodedImage) {
        return {
          encodedImage,
          payload,
          ...(qr.expirationDate ? { expirationDate: qr.expirationDate } : {}),
        };
      }
    } catch (err) {
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 0;
      if (status === 404) continue;
    }
  }
  return null;
}

export async function createAsaasInscriptionPayment(
  campaignId: string,
  inscriptionId: string
): Promise<CreateInscriptionPaymentResult> {
  const config = await getAsaasConfigEffective();
  if (!config.enabled) {
    throw new Error('ASAAS_NOT_CONFIGURED');
  }

  const campaign = await getCampaignDoc(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

  const paymentCfg = campaign.paymentConfig;
  if (paymentCfg?.provider !== 'asaas') {
    throw new Error('CAMPAIGN_PAYMENT_NOT_ASAAS');
  }

  const inscription = await getInscriptionDoc(campaignId, inscriptionId);
  if (!inscription) throw new Error('INSCRIPTION_NOT_FOUND');

  const fields = (inscription.fields ?? {}) as Record<string, string>;
  const voucherCode = String(inscription.voucherCode ?? '').trim() || undefined;
  const { amount, tier, voucherId, voucherCode: appliedCode } = await resolveInscriptionPaymentAmount(
    paymentCfg,
    fields,
    { vouchers: campaign.vouchers, voucherCode },
  );
  const existingPaymentId = inscription.asaasPaymentId as string | undefined;
  const existingUrl = inscription.asaasInvoiceUrl as string | undefined;
  const existingStatus = String(inscription.paymentStatus ?? 'pending');
  if (existingPaymentId && existingUrl) {
    const applied = Number(inscription.paymentAmountApplied);
    const pix = await fetchPaymentPixQrCode(existingPaymentId, config);
    return {
      paymentId: existingPaymentId,
      invoiceUrl: existingUrl,
      customerId: String(inscription.asaasCustomerId ?? ''),
      amount: Number.isFinite(applied) && applied > 0 ? applied : amount,
      paymentStatus: existingStatus,
      ...(pix ? { pix } : { pix: null }),
    };
  }

  const customerInput = pickCustomerFromFields(fields);
  if (customerInput.cpfCnpj.length < 11) {
    throw new Error('CUSTOMER_DOCUMENT_REQUIRED');
  }

  const customer = await findOrCreateCustomer(customerInput, config);
  const description =
    paymentCfg.description?.trim() ||
    `Inscrição — ${campaign.title?.trim() || 'Evento CDL'}`;

  const payment = await asaasRequest<AsaasPayment>(
    'POST',
    '/payments',
    {
      customer: customer.id,
      billingType: 'UNDEFINED',
      value: amount,
      dueDate: dueDatePlusDays(7),
      description,
      externalReference: buildInscriptionExternalReference(campaignId, inscriptionId),
    },
    config
  );

  const invoiceUrl = payment.invoiceUrl ?? payment.bankSlipUrl;
  if (!payment.id || !invoiceUrl) {
    throw new Error('ASAAS_PAYMENT_INCOMPLETE');
  }

  await updateInscriptionPayment(campaignId, inscriptionId, {
    paymentStatus: 'pending',
    paymentProvider: 'asaas',
    paymentAmountApplied: amount,
    paymentAmountTier: tier,
    ...(voucherId ? { voucherId } : {}),
    ...(appliedCode ? { voucherCode: appliedCode } : {}),
    asaasPaymentId: payment.id,
    asaasInvoiceUrl: invoiceUrl,
    asaasCustomerId: customer.id,
  });

  const pix = await fetchPaymentPixQrCode(payment.id, config);

  return {
    paymentId: payment.id,
    invoiceUrl,
    customerId: customer.id,
    amount,
    paymentStatus: payment.status ?? 'PENDING',
    ...(pix ? { pix } : { pix: null }),
  };
}

const PAID_EVENTS = new Set([
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_RECEIVED_IN_CASH',
]);

const CANCELLED_EVENTS = new Set([
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_OVERDUE',
]);

export async function handleAsaasWebhookPayload(payload: AsaasWebhookEvent): Promise<void> {
  const eventName = payload.event ?? '';
  const payment = payload.payment;
  const ref = payment?.externalReference;
  const parsed = parseInscriptionExternalReference(ref);
  if (!parsed) return;

  const { campaignId, inscriptionId } = parsed;
  const eventId = payload.id ?? `${eventName}:${payment?.id ?? ''}`;
  if (eventId && (await isWebhookEventProcessed(campaignId, inscriptionId, eventId))) {
    return;
  }

  if (PAID_EVENTS.has(eventName) || payment?.status === 'RECEIVED' || payment?.status === 'CONFIRMED') {
    const insc = await getInscriptionDoc(campaignId, inscriptionId);
    const voucherId = typeof insc?.voucherId === 'string' ? insc.voucherId : undefined;
    const alreadyPaid = insc?.paymentStatus === 'paid';
    await updateInscriptionPayment(campaignId, inscriptionId, {
      paymentStatus: 'paid',
      asaasPaymentId: payment?.id,
      asaasLastWebhookEventId: eventId,
    });
    if (voucherId && !alreadyPaid) {
      try {
        await incrementCampaignVoucherUsedCount(campaignId, voucherId);
      } catch {
        /* contador de voucher não bloqueia confirmação de pagamento */
      }
    }
    return;
  }

  if (CANCELLED_EVENTS.has(eventName)) {
    await updateInscriptionPayment(campaignId, inscriptionId, {
      paymentStatus: payment?.status === 'OVERDUE' ? 'expired' : 'cancelled',
      asaasLastWebhookEventId: eventId,
    });
  }
}
