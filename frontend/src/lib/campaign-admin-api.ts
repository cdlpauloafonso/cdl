import { waitForFirebaseAuthUser } from '@/lib/admin-auth';
import {
  API_NOT_CONFIGURED_MESSAGE,
  getApiBaseUrl,
  isApiConfiguredForClient,
} from '@/lib/api-base';
import type { Campaign, CampaignPaymentConfig, CampaignRegistrationConfig, EventVoucher } from '@/lib/firestore';

const API_BASE = getApiBaseUrl();

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!isApiConfiguredForClient()) {
    throw new Error(API_NOT_CONFIGURED_MESSAGE);
  }
  const user = await waitForFirebaseAuthUser();
  if (!user) throw new Error('Sessão administrativa expirada. Faça login novamente.');
  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${idToken}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new Error(
      `Não foi possível contactar o servidor (${API_BASE}). Verifique se a API está no ar e se NEXT_PUBLIC_API_URL está correta.`,
    );
  }
}

export type AdminCampaignUpdatePayload = Partial<
  Omit<Campaign, 'registrationUrl' | 'registrationConfig' | 'paymentConfig' | 'vouchers' | 'id'>
> & {
  registrationUrl?: string | null;
  registrationConfig?: CampaignRegistrationConfig | null;
  paymentConfig?: CampaignPaymentConfig | null;
  vouchers?: EventVoucher[] | null;
};

/**
 * Salva campanha/evento pelo backend (Admin SDK), evitando permission-denied das regras Firestore no browser.
 */
export async function updateCampaignViaAdminApi(
  id: string,
  data: AdminCampaignUpdatePayload,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) payload[k] = v;
  });

  const res = await adminFetch(`/api/admin/campaigns/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Erro ao salvar evento (${res.status}).`);
  }
}
