export type AsaasCustomer = {
  id: string;
  name?: string;
  cpfCnpj?: string;
  email?: string;
};

export type AsaasPayment = {
  id: string;
  customer: string;
  value: number;
  billingType?: string;
  status?: string;
  dueDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  externalReference?: string;
};

export type AsaasWebhookEvent = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    externalReference?: string;
    value?: number;
  };
};

export const ASAAS_INSCRIPTION_REF_PREFIX = 'cdl:inscription:';

export function buildInscriptionExternalReference(campaignId: string, inscriptionId: string): string {
  return `${ASAAS_INSCRIPTION_REF_PREFIX}${campaignId}:${inscriptionId}`;
}

export function parseInscriptionExternalReference(
  ref: string | undefined | null
): { campaignId: string; inscriptionId: string } | null {
  if (!ref || !ref.startsWith(ASAAS_INSCRIPTION_REF_PREFIX)) return null;
  const rest = ref.slice(ASAAS_INSCRIPTION_REF_PREFIX.length);
  const colon = rest.indexOf(':');
  if (colon <= 0 || colon >= rest.length - 1) return null;
  return {
    campaignId: rest.slice(0, colon),
    inscriptionId: rest.slice(colon + 1),
  };
}
