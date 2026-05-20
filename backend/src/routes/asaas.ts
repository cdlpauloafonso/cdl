import { Router } from 'express';
import { getAsaasConfig, isAsaasConfigured } from '../lib/asaas/config.js';
import { createAsaasInscriptionPayment, handleAsaasWebhookPayload } from '../lib/asaas/inscription-payment.js';
import type { AsaasWebhookEvent } from '../lib/asaas/types.js';

const router = Router();

/** Status da integração (sem expor segredos). */
router.get('/status', (_req, res) => {
  const cfg = getAsaasConfig();
  res.json({
    configured: isAsaasConfigured(),
    environment: cfg.env,
  });
});

/**
 * Cria cobrança Asaas para inscrição já gravada no Firestore.
 * Body: { campaignId, inscriptionId }
 */
router.post('/inscription-payment', async (req, res) => {
  if (!isAsaasConfigured()) {
    res.status(503).json({
      error: 'Asaas não configurado. Defina ASAAS_API_KEY no servidor (sandbox ou produção).',
    });
    return;
  }

  const campaignId = String(req.body?.campaignId ?? '').trim();
  const inscriptionId = String(req.body?.inscriptionId ?? '').trim();
  if (!campaignId || !inscriptionId) {
    res.status(400).json({ error: 'campaignId e inscriptionId são obrigatórios.' });
    return;
  }

  try {
    const result = await createAsaasInscriptionPayment(campaignId, inscriptionId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar pagamento';
    const status =
      message === 'CAMPAIGN_NOT_FOUND' || message === 'INSCRIPTION_NOT_FOUND'
        ? 404
        : message === 'CAMPAIGN_PAYMENT_NOT_ASAAS' || message === 'INVALID_PAYMENT_AMOUNT'
          ? 400
          : message === 'CUSTOMER_DOCUMENT_REQUIRED'
            ? 400
            : message === 'ASAAS_NOT_CONFIGURED' ||
                message === 'FIREBASE_ADMIN_NOT_CONFIGURED' ||
                message === 'ASAAS_PAYMENT_INCOMPLETE'
              ? 503
              : 502;
    res.status(status).json({ error: message });
  }
});

/** Webhook Asaas (pagamentos confirmados). */
router.post('/webhook', async (req, res) => {
  const { webhookToken } = getAsaasConfig();
  if (webhookToken) {
    const headerToken =
      (req.headers['asaas-access-token'] as string | undefined) ??
      (req.headers['x-asaas-access-token'] as string | undefined);
    if (headerToken !== webhookToken) {
      res.status(401).json({ error: 'Token de webhook inválido' });
      return;
    }
  }

  try {
    await handleAsaasWebhookPayload(req.body as AsaasWebhookEvent);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[asaas/webhook]', err);
    res.status(200).json({ received: true });
  }
});

export default router;
