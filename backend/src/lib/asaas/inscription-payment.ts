import { AsaasApiError, asaasRequest } from './client.js';
import { getAsaasConfigEffective } from './config.js';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
  AsaasCustomer,
  AsaasPayment,
  AsaasPaymentIdentificationField,
  AsaasPaymentPixQrCode,
  AsaasWebhookEvent,
} from './types.js';
import { normalizeVoucherCode } from '../event-voucher.js';
import { buildInscriptionExternalReference, parseInscriptionExternalReference } from './types.js';
import {
  getCampaignDoc,
  getInscriptionDoc,
  incrementCampaignVoucherUsedCount,
  isGratisPaymentAmount,
  isInscriptionPaymentConfirmedStatus,
  isWebhookEventProcessed,
  markInscriptionGratis,
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

export type InscriptionPaymentBoletoCheckout = {
  identificationField: string;
  barCode?: string;
  nossoNumero?: string;
  dueDate?: string;
};

export type CreateInscriptionPaymentResult = {
  paymentId: string;
  invoiceUrl: string;
  customerId: string;
  amount: number;
  paymentStatus: string;
  pix: InscriptionPaymentPixCheckout | null;
  boleto: InscriptionPaymentBoletoCheckout | null;
  /** Voucher 100% — inscrição confirmada sem cobrança Asaas. */
  gratis?: boolean;
};

function buildGratisPaymentResult(): CreateInscriptionPaymentResult {
  return {
    paymentId: '',
    invoiceUrl: '',
    customerId: '',
    amount: 0,
    paymentStatus: 'gratis',
    pix: null,
    boleto: null,
    gratis: true,
  };
}

/** Método exibido no checkout interno (cada um exige billingType próprio no Asaas). */
export type InscriptionCheckoutMethod = 'pix' | 'boleto' | 'card';

const ASAAS_BILLING_BY_METHOD: Record<InscriptionCheckoutMethod, string> = {
  pix: 'PIX',
  boleto: 'BOLETO',
  card: 'UNDEFINED',
};

const PAYMENT_EDITABLE_STATUSES = new Set(['PENDING', 'OVERDUE', 'WAITING']);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAsaasPayment(
  paymentId: string,
  config: Awaited<ReturnType<typeof getAsaasConfigEffective>>,
): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>(
    'GET',
    `/payments/${encodeURIComponent(paymentId)}`,
    undefined,
    config,
  );
}

/** O Asaas só expõe QR PIX / linha digitável quando billingType corresponde ao método. */
async function ensurePaymentBillingType(
  paymentId: string,
  billingType: string,
  config: Awaited<ReturnType<typeof getAsaasConfigEffective>>,
): Promise<AsaasPayment> {
  const current = await getAsaasPayment(paymentId, config);
  const status = String(current.status ?? 'PENDING');
  if (!PAYMENT_EDITABLE_STATUSES.has(status)) {
    throw new Error('PAYMENT_NOT_EDITABLE');
  }
  if (current.billingType === billingType) return current;
  return asaasRequest<AsaasPayment>(
    'PUT',
    `/payments/${encodeURIComponent(paymentId)}`,
    { billingType },
    config,
  );
}

/** QR PIX pode demorar após criar ou alterar a cobrança — retenta com intervalos maiores. */
async function fetchPaymentPixQrCode(
  paymentId: string,
  config: Awaited<ReturnType<typeof getAsaasConfigEffective>>,
): Promise<InscriptionPaymentPixCheckout | null> {
  const delaysMs = [0, 600, 1500, 3000, 5000, 8000];
  let lastErr: unknown;
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
      lastErr = err;
    }
  }
  if (lastErr instanceof AsaasApiError) {
    console.warn('[asaas] pixQrCode indisponível:', paymentId, lastErr.message);
  }
  return null;
}

async function fetchPaymentBoletoFields(
  paymentId: string,
  config: Awaited<ReturnType<typeof getAsaasConfigEffective>>,
): Promise<InscriptionPaymentBoletoCheckout | null> {
  const delaysMs = [0, 600, 1500, 3000, 5000, 8000];
  let lastErr: unknown;
  for (const delay of delaysMs) {
    if (delay > 0) await sleep(delay);
    try {
      const idField = await asaasRequest<AsaasPaymentIdentificationField>(
        'GET',
        `/payments/${encodeURIComponent(paymentId)}/identificationField`,
        undefined,
        config,
      );
      const identificationField = idField.identificationField?.trim();
      if (!identificationField) continue;

      let dueDate: string | undefined;
      try {
        const payment = await getAsaasPayment(paymentId, config);
        dueDate = payment.dueDate;
      } catch {
        /* dueDate opcional */
      }

      return {
        identificationField,
        ...(idField.barCode?.trim() ? { barCode: idField.barCode.trim() } : {}),
        ...(idField.nossoNumero?.trim() ? { nossoNumero: idField.nossoNumero.trim() } : {}),
        ...(dueDate ? { dueDate } : {}),
      };
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr instanceof AsaasApiError) {
    console.warn('[asaas] identificationField indisponível:', paymentId, lastErr.message);
  }
  return null;
}

type InscriptionPaymentContext = {
  paymentId: string;
  invoiceUrl: string;
  customerId: string;
  amount: number;
  paymentStatus: string;
};

async function resolveInscriptionPaymentContext(
  campaignId: string,
  inscriptionId: string,
  config: Awaited<ReturnType<typeof getAsaasConfigEffective>>,
): Promise<{
  campaign: NonNullable<Awaited<ReturnType<typeof getCampaignDoc>>>;
  inscription: NonNullable<Awaited<ReturnType<typeof getInscriptionDoc>>>;
  fields: Record<string, string>;
  amount: number;
  tier: 'normal' | 'associado';
  voucherId?: string;
  appliedCode?: string;
  ctx: InscriptionPaymentContext | null;
}> {
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
  if (existingPaymentId && existingUrl) {
    const applied = Number(inscription.paymentAmountApplied);
    return {
      campaign,
      inscription,
      fields,
      amount,
      tier,
      voucherId,
      appliedCode,
      ctx: {
        paymentId: existingPaymentId,
        invoiceUrl: existingUrl,
        customerId: String(inscription.asaasCustomerId ?? ''),
        amount: Number.isFinite(applied) && applied > 0 ? applied : amount,
        paymentStatus: String(inscription.paymentStatus ?? 'pending'),
      },
    };
  }

  return { campaign, inscription, fields, amount, tier, voucherId, appliedCode, ctx: null };
}

async function createInscriptionAsaasPayment(
  campaignId: string,
  inscriptionId: string,
  config: Awaited<ReturnType<typeof getAsaasConfigEffective>>,
  input: {
    campaign: NonNullable<Awaited<ReturnType<typeof getCampaignDoc>>>;
    fields: Record<string, string>;
    amount: number;
    tier: 'normal' | 'associado';
    voucherId?: string;
    appliedCode?: string;
    billingType: string;
  },
): Promise<InscriptionPaymentContext> {
  const customerInput = pickCustomerFromFields(input.fields);
  if (customerInput.cpfCnpj.length < 11) {
    throw new Error('CUSTOMER_DOCUMENT_REQUIRED');
  }

  const customer = await findOrCreateCustomer(customerInput, config);
  const description =
    input.campaign.paymentConfig?.description?.trim() ||
    `Inscrição — ${input.campaign.title?.trim() || 'Evento CDL'}`;

  const payment = await asaasRequest<AsaasPayment>(
    'POST',
    '/payments',
    {
      customer: customer.id,
      billingType: input.billingType,
      value: input.amount,
      dueDate: dueDatePlusDays(7),
      description,
      externalReference: buildInscriptionExternalReference(campaignId, inscriptionId),
    },
    config,
  );

  const invoiceUrl = payment.invoiceUrl ?? payment.bankSlipUrl;
  if (!payment.id || !invoiceUrl) {
    throw new Error('ASAAS_PAYMENT_INCOMPLETE');
  }

  await updateInscriptionPayment(campaignId, inscriptionId, {
    paymentStatus: 'pending',
    paymentProvider: 'asaas',
    paymentAmountApplied: input.amount,
    paymentAmountTier: input.tier,
    ...(input.voucherId ? { voucherId: input.voucherId } : {}),
    ...(input.appliedCode ? { voucherCode: input.appliedCode } : {}),
    asaasPaymentId: payment.id,
    asaasInvoiceUrl: invoiceUrl,
    asaasCustomerId: customer.id,
  });

  return {
    paymentId: payment.id,
    invoiceUrl,
    customerId: customer.id,
    amount: input.amount,
    paymentStatus: payment.status ?? 'PENDING',
  };
}

/** Carrega dados do checkout para um método (ajusta billingType na cobrança Asaas). */
export async function loadInscriptionCheckoutForMethod(
  campaignId: string,
  inscriptionId: string,
  method: InscriptionCheckoutMethod,
): Promise<CreateInscriptionPaymentResult> {
  const config = await getAsaasConfigEffective();
  if (!config.enabled) throw new Error('ASAAS_NOT_CONFIGURED');

  const resolved = await resolveInscriptionPaymentContext(campaignId, inscriptionId, config);

  if (isInscriptionPaymentConfirmedStatus(resolved.inscription.paymentStatus)) {
    if (resolved.inscription.paymentStatus === 'gratis' || isGratisPaymentAmount(resolved.amount)) {
      return buildGratisPaymentResult();
    }
  } else if (isGratisPaymentAmount(resolved.amount)) {
    await markInscriptionGratis(campaignId, inscriptionId, {
      tier: resolved.tier,
      voucherId: resolved.voucherId,
      voucherCode: resolved.appliedCode,
      paymentAmountApplied: 0,
    });
    return buildGratisPaymentResult();
  }

  let ctx =
    resolved.ctx ??
    (await createInscriptionAsaasPayment(campaignId, inscriptionId, config, {
      campaign: resolved.campaign,
      fields: resolved.fields,
      amount: resolved.amount,
      tier: resolved.tier,
      voucherId: resolved.voucherId,
      appliedCode: resolved.appliedCode,
      billingType: ASAAS_BILLING_BY_METHOD[method],
    }));

  const billingType = ASAAS_BILLING_BY_METHOD[method];
  const synced = await ensurePaymentBillingType(ctx.paymentId, billingType, config);
  ctx = { ...ctx, paymentStatus: synced.status ?? ctx.paymentStatus };

  let pix: InscriptionPaymentPixCheckout | null = null;
  let boleto: InscriptionPaymentBoletoCheckout | null = null;
  if (method === 'pix') {
    pix = await fetchPaymentPixQrCode(ctx.paymentId, config);
  } else if (method === 'boleto') {
    boleto = await fetchPaymentBoletoFields(ctx.paymentId, config);
  }

  return {
    paymentId: ctx.paymentId,
    invoiceUrl: ctx.invoiceUrl,
    customerId: ctx.customerId,
    amount: ctx.amount,
    paymentStatus: ctx.paymentStatus,
    pix,
    boleto,
  };
}

export async function createAsaasInscriptionPayment(
  campaignId: string,
  inscriptionId: string
): Promise<CreateInscriptionPaymentResult> {
  return loadInscriptionCheckoutForMethod(campaignId, inscriptionId, 'pix');
}

export type ApplyInscriptionVoucherResult = {
  amount: number;
  amountBefore: number;
  tier: 'normal' | 'associado';
  voucherCode: string | null;
  voucherApplied: boolean;
};

/** Aplica ou remove voucher na inscrição pendente e atualiza o valor da cobrança Asaas. */
export async function applyInscriptionVoucher(
  campaignId: string,
  inscriptionId: string,
  voucherCodeRaw: string,
): Promise<ApplyInscriptionVoucherResult> {
  const config = await getAsaasConfigEffective();
  if (!config.enabled) throw new Error('ASAAS_NOT_CONFIGURED');

  const campaign = await getCampaignDoc(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
  const paymentCfg = campaign.paymentConfig;
  if (paymentCfg?.provider !== 'asaas') throw new Error('CAMPAIGN_PAYMENT_NOT_ASAAS');

  const inscription = await getInscriptionDoc(campaignId, inscriptionId);
  if (!inscription) throw new Error('INSCRIPTION_NOT_FOUND');
  if (isInscriptionPaymentConfirmedStatus(inscription.paymentStatus)) {
    throw new Error('INSCRIPTION_ALREADY_PAID');
  }

  const fields = (inscription.fields ?? {}) as Record<string, string>;
  const wasGratis = inscription.paymentStatus === 'gratis';
  const baseResolved = await resolveInscriptionPaymentAmount(paymentCfg, fields, {
    vouchers: campaign.vouchers,
  });
  const amountBefore = baseResolved.amount;

  const code = normalizeVoucherCode(voucherCodeRaw);
  let amount = amountBefore;
  let tier = baseResolved.tier;
  let voucherId: string | undefined;
  let voucherCode: string | undefined;
  let voucherApplied = false;

  if (code) {
    const withVoucher = await resolveInscriptionPaymentAmount(paymentCfg, fields, {
      vouchers: campaign.vouchers,
      voucherCode: code,
    });
    amount = withVoucher.amount;
    tier = withVoucher.tier;
    voucherId = withVoucher.voucherId;
    voucherCode = withVoucher.voucherCode;
    voucherApplied = true;
  }

  if (isGratisPaymentAmount(amount)) {
    await markInscriptionGratis(campaignId, inscriptionId, {
      tier,
      voucherId: voucherApplied ? voucherId : undefined,
      voucherCode: voucherApplied ? voucherCode : undefined,
      paymentAmountApplied: 0,
    });
    return {
      amount: 0,
      amountBefore,
      tier,
      voucherCode: voucherApplied ? (voucherCode ?? code) : null,
      voucherApplied,
    };
  }

  const paymentId = inscription.asaasPaymentId as string | undefined;
  if (paymentId) {
    const current = await getAsaasPayment(paymentId, config);
    const status = String(current.status ?? 'PENDING');
    if (!PAYMENT_EDITABLE_STATUSES.has(status)) {
      throw new Error('PAYMENT_NOT_EDITABLE');
    }
    await asaasRequest<AsaasPayment>(
      'PUT',
      `/payments/${encodeURIComponent(paymentId)}`,
      { value: amount },
      config,
    );
  }

  await updateInscriptionPayment(campaignId, inscriptionId, {
    paymentAmountApplied: amount,
    paymentAmountTier: tier,
    ...(wasGratis ? { paymentStatus: 'pending' } : {}),
    ...(voucherApplied && voucherId && voucherCode
      ? { voucherId, voucherCode }
      : { clearVoucher: true }),
  });

  return {
    amount,
    amountBefore,
    tier,
    voucherCode: voucherApplied ? (voucherCode ?? code) : null,
    voucherApplied,
  };
}

export function mapVoucherErrorToMessage(code: string): string {
  switch (code) {
    case 'VOUCHER_INVALID':
      return 'Código de voucher inválido.';
    case 'VOUCHER_INACTIVE':
      return 'Este voucher está inativo.';
    case 'VOUCHER_EXPIRED':
      return 'Este voucher expirou.';
    case 'VOUCHER_EXHAUSTED':
      return 'Este voucher atingiu o limite de utilizações.';
    default:
      return code;
  }
}

const CARD_PAID_STATUSES = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']);

export async function payAsaasInscriptionWithCreditCard(
  campaignId: string,
  inscriptionId: string,
  creditCard: AsaasCreditCardInput,
  creditCardHolderInfo: AsaasCreditCardHolderInput,
): Promise<{ paymentStatus: string; paid: boolean }> {
  const config = await getAsaasConfigEffective();
  if (!config.enabled) throw new Error('ASAAS_NOT_CONFIGURED');

  const inscription = await getInscriptionDoc(campaignId, inscriptionId);
  if (!inscription) throw new Error('INSCRIPTION_NOT_FOUND');

  const paymentId = inscription.asaasPaymentId as string | undefined;
  if (!paymentId) throw new Error('INSCRIPTION_PAYMENT_NOT_CREATED');

  await ensurePaymentBillingType(paymentId, ASAAS_BILLING_BY_METHOD.card, config);

  const payment = await asaasRequest<AsaasPayment>(
    'POST',
    `/payments/${encodeURIComponent(paymentId)}/payWithCreditCard`,
    {
      creditCard: {
        holderName: creditCard.holderName.trim(),
        number: onlyDigits(creditCard.number),
        expiryMonth: creditCard.expiryMonth.trim(),
        expiryYear: creditCard.expiryYear.trim(),
        ccv: creditCard.ccv.trim(),
      },
      creditCardHolderInfo: {
        name: creditCardHolderInfo.name.trim(),
        email: creditCardHolderInfo.email.trim(),
        cpfCnpj: onlyDigits(creditCardHolderInfo.cpfCnpj),
        postalCode: onlyDigits(creditCardHolderInfo.postalCode),
        addressNumber: creditCardHolderInfo.addressNumber.trim() || 'S/N',
        phone: onlyDigits(creditCardHolderInfo.phone),
        ...(creditCardHolderInfo.addressComplement?.trim()
          ? { addressComplement: creditCardHolderInfo.addressComplement.trim() }
          : {}),
        ...(creditCardHolderInfo.mobilePhone?.trim()
          ? { mobilePhone: onlyDigits(creditCardHolderInfo.mobilePhone) }
          : {}),
      },
    },
    config,
  );

  const status = String(payment.status ?? 'PENDING');
  const paid = CARD_PAID_STATUSES.has(status);
  if (paid) {
    const insc = await getInscriptionDoc(campaignId, inscriptionId);
    const voucherId = typeof insc?.voucherId === 'string' ? insc.voucherId : undefined;
    const alreadyPaid = isInscriptionPaymentConfirmedStatus(insc?.paymentStatus);
    await updateInscriptionPayment(campaignId, inscriptionId, {
      paymentStatus: 'paid',
      asaasPaymentId: payment.id ?? paymentId,
    });
    if (voucherId && !alreadyPaid) {
      try {
        await incrementCampaignVoucherUsedCount(campaignId, voucherId);
      } catch {
        /* contador de voucher não bloqueia confirmação */
      }
    }
  }

  return { paymentStatus: status, paid };
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
    const alreadyPaid = isInscriptionPaymentConfirmedStatus(insc?.paymentStatus);
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
