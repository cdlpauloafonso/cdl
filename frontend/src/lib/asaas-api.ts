const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export type AsaasIntegrationStatus = {
  configured: boolean;
  environment: string;
};

export type CreateInscriptionPaymentResponse = {
  paymentId: string;
  invoiceUrl: string;
  customerId: string;
};

export async function fetchAsaasIntegrationStatus(): Promise<AsaasIntegrationStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/asaas/status`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as AsaasIntegrationStatus;
  } catch {
    return null;
  }
}

export async function createAsaasInscriptionPayment(
  campaignId: string,
  inscriptionId: string
): Promise<CreateInscriptionPaymentResponse> {
  const res = await fetch(`${API_BASE}/api/asaas/inscription-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId, inscriptionId }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<
    CreateInscriptionPaymentResponse
  >;
  if (!res.ok) {
    throw new Error(data.error ?? 'Não foi possível gerar o link de pagamento.');
  }
  if (!data.invoiceUrl || !data.paymentId) {
    throw new Error('Resposta inválida do servidor de pagamento.');
  }
  return data as CreateInscriptionPaymentResponse;
}
