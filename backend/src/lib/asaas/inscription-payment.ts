import { asaasRequest } from './client.js';
import type { AsaasCustomer, AsaasPayment, AsaasWebhookEvent } from './types.js';
import { buildInscriptionExternalReference, parseInscriptionExternalReference } from './types.js';
import {
  getCampaignDoc,
  getInscriptionDoc,
  isWebhookEventProcessed,
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

async function findOrCreateCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string;
}): Promise<AsaasCustomer> {
  if (input.cpfCnpj.length >= 11) {
    const listed = await asaasRequest<{ data: AsaasCustomer[] }>(
      'GET',
      `/customers?cpfCnpj=${encodeURIComponent(input.cpfCnpj)}&limit=1`
    );
    const existing = listed.data?.[0];
    if (existing?.id) return existing;
  }

  return asaasRequest<AsaasCustomer>('POST', '/customers', {
    name: input.name,
    cpfCnpj: input.cpfCnpj || undefined,
    email: input.email,
    notificationDisabled: true,
  });
}

export type CreateInscriptionPaymentResult = {
  paymentId: string;
  invoiceUrl: string;
  customerId: string;
};

export async function createAsaasInscriptionPayment(
  campaignId: string,
  inscriptionId: string
): Promise<CreateInscriptionPaymentResult> {
  const campaign = await getCampaignDoc(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

  const paymentCfg = campaign.paymentConfig;
  if (paymentCfg?.provider !== 'asaas') {
    throw new Error('CAMPAIGN_PAYMENT_NOT_ASAAS');
  }

  const amount = Number(paymentCfg.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('INVALID_PAYMENT_AMOUNT');
  }

  const inscription = await getInscriptionDoc(campaignId, inscriptionId);
  if (!inscription) throw new Error('INSCRIPTION_NOT_FOUND');

  const fields = (inscription.fields ?? {}) as Record<string, string>;
  const existingPaymentId = inscription.asaasPaymentId as string | undefined;
  const existingUrl = inscription.asaasInvoiceUrl as string | undefined;
  if (existingPaymentId && existingUrl) {
    return {
      paymentId: existingPaymentId,
      invoiceUrl: existingUrl,
      customerId: String(inscription.asaasCustomerId ?? ''),
    };
  }

  const customerInput = pickCustomerFromFields(fields);
  if (customerInput.cpfCnpj.length < 11) {
    throw new Error('CUSTOMER_DOCUMENT_REQUIRED');
  }

  const customer = await findOrCreateCustomer(customerInput);
  const description =
    paymentCfg.description?.trim() ||
    `Inscrição — ${campaign.title?.trim() || 'Evento CDL'}`;

  const payment = await asaasRequest<AsaasPayment>('POST', '/payments', {
    customer: customer.id,
    billingType: 'UNDEFINED',
    value: amount,
    dueDate: dueDatePlusDays(7),
    description,
    externalReference: buildInscriptionExternalReference(campaignId, inscriptionId),
  });

  const invoiceUrl = payment.invoiceUrl ?? payment.bankSlipUrl;
  if (!payment.id || !invoiceUrl) {
    throw new Error('ASAAS_PAYMENT_INCOMPLETE');
  }

  await updateInscriptionPayment(campaignId, inscriptionId, {
    paymentStatus: 'pending',
    paymentProvider: 'asaas',
    asaasPaymentId: payment.id,
    asaasInvoiceUrl: invoiceUrl,
    asaasCustomerId: customer.id,
  });

  return {
    paymentId: payment.id,
    invoiceUrl,
    customerId: customer.id,
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
    await updateInscriptionPayment(campaignId, inscriptionId, {
      paymentStatus: 'paid',
      asaasPaymentId: payment?.id,
      asaasLastWebhookEventId: eventId,
    });
    return;
  }

  if (CANCELLED_EVENTS.has(eventName)) {
    await updateInscriptionPayment(campaignId, inscriptionId, {
      paymentStatus: payment?.status === 'OVERDUE' ? 'expired' : 'cancelled',
      asaasLastWebhookEventId: eventId,
    });
  }
}
