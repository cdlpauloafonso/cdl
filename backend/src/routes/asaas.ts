import { Router } from 'express';
import { requireAdminAuth, type AdminAuthInfo } from '../lib/admin-auth.js';
import { getAsaasConfigEffective } from '../lib/asaas/config.js';
import { AsaasApiError, asaasRequest } from '../lib/asaas/client.js';
import {
  applyInscriptionVoucher,
  createAsaasInscriptionPayment,
  handleAsaasWebhookPayload,
  loadInscriptionCheckoutForMethod,
  mapVoucherErrorToMessage,
  payAsaasInscriptionWithCreditCard,
  type InscriptionCheckoutMethod,
} from '../lib/asaas/inscription-payment.js';
import type { AsaasWebhookEvent } from '../lib/asaas/types.js';
import {
  buildIntegrationPublic,
  clearAsaasIntegrationSecret,
  readAsaasIntegrationDoc,
  writeAsaasIntegrationDoc,
  type AsaasIntegrationPatch,
} from '../lib/asaas/integration-store.js';

const router = Router();

/** Status da integração (público). Sem segredos. */
router.get('/status', async (_req, res) => {
  const cfg = await getAsaasConfigEffective();
  res.json({
    configured: cfg.enabled,
    environment: cfg.env,
  });
});

/**
 * Cria cobrança Asaas para inscrição já gravada no Firestore.
 * Body: { campaignId, inscriptionId }
 */
router.post('/inscription-payment', async (req, res) => {
  const cfg = await getAsaasConfigEffective();
  if (!cfg.enabled) {
    res.status(503).json({
      error: 'Asaas não configurado. Defina a chave em Configurações → APIs (Asaas) ou no backend.',
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
              : err instanceof AsaasApiError
                ? 502
                : 502;
    res.status(status).json({ error: message });
  }
});

/**
 * Aplica voucher na inscrição pendente (atualiza valor no Firestore e na cobrança Asaas).
 * Body: { campaignId, inscriptionId, voucherCode } — voucherCode vazio remove o desconto.
 */
router.post('/inscription-payment/voucher', async (req, res) => {
  const cfg = await getAsaasConfigEffective();
  if (!cfg.enabled) {
    res.status(503).json({
      error: 'Asaas não configurado. Defina a chave em Configurações → APIs (Asaas) ou no backend.',
    });
    return;
  }

  const campaignId = String(req.body?.campaignId ?? '').trim();
  const inscriptionId = String(req.body?.inscriptionId ?? '').trim();
  const voucherCode = String(req.body?.voucherCode ?? '');

  if (!campaignId || !inscriptionId) {
    res.status(400).json({ error: 'campaignId e inscriptionId são obrigatórios.' });
    return;
  }

  try {
    const result = await applyInscriptionVoucher(campaignId, inscriptionId, voucherCode);
    res.json(result);
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Erro ao aplicar voucher';
    const message =
      raw === 'VOUCHER_INVALID' ||
      raw === 'VOUCHER_INACTIVE' ||
      raw === 'VOUCHER_EXPIRED' ||
      raw === 'VOUCHER_EXHAUSTED'
        ? mapVoucherErrorToMessage(raw)
        : raw;
    const status =
      message === 'CAMPAIGN_NOT_FOUND' || message === 'INSCRIPTION_NOT_FOUND'
        ? 404
        : message === 'INSCRIPTION_ALREADY_PAID'
          ? 409
          : message === 'CAMPAIGN_PAYMENT_NOT_ASAAS' || message === 'INVALID_PAYMENT_AMOUNT'
            ? 400
            : message === 'PAYMENT_NOT_EDITABLE'
              ? 409
              : message === 'ASAAS_NOT_CONFIGURED' || message === 'FIREBASE_ADMIN_NOT_CONFIGURED'
                ? 503
                : err instanceof AsaasApiError
                  ? 502
                  : 502;
    res.status(status).json({ error: message });
  }
});

/**
 * Dados do checkout para um método (PIX, boleto ou cartão).
 * Body: { campaignId, inscriptionId, method: 'pix' | 'boleto' | 'card' }
 */
router.post('/inscription-payment/method', async (req, res) => {
  const cfg = await getAsaasConfigEffective();
  if (!cfg.enabled) {
    res.status(503).json({
      error: 'Asaas não configurado. Defina a chave em Configurações → APIs (Asaas) ou no backend.',
    });
    return;
  }

  const campaignId = String(req.body?.campaignId ?? '').trim();
  const inscriptionId = String(req.body?.inscriptionId ?? '').trim();
  const methodRaw = String(req.body?.method ?? 'pix').trim().toLowerCase();
  const method: InscriptionCheckoutMethod =
    methodRaw === 'boleto' || methodRaw === 'card' ? methodRaw : 'pix';

  if (!campaignId || !inscriptionId) {
    res.status(400).json({ error: 'campaignId e inscriptionId são obrigatórios.' });
    return;
  }

  try {
    const result = await loadInscriptionCheckoutForMethod(campaignId, inscriptionId, method);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar pagamento';
    const status =
      message === 'CAMPAIGN_NOT_FOUND' || message === 'INSCRIPTION_NOT_FOUND'
        ? 404
        : message === 'CAMPAIGN_PAYMENT_NOT_ASAAS' || message === 'INVALID_PAYMENT_AMOUNT'
          ? 400
          : message === 'CUSTOMER_DOCUMENT_REQUIRED'
            ? 400
            : message === 'PAYMENT_NOT_EDITABLE'
              ? 409
              : message === 'ASAAS_NOT_CONFIGURED' ||
                  message === 'FIREBASE_ADMIN_NOT_CONFIGURED' ||
                  message === 'ASAAS_PAYMENT_INCOMPLETE'
                ? 503
                : 502;
    res.status(status).json({ error: message });
  }
});

/**
 * Paga cobrança da inscrição com cartão (checkout interno).
 * Body: { campaignId, inscriptionId, creditCard, creditCardHolderInfo }
 */
router.post('/inscription-payment/card', async (req, res) => {
  const cfg = await getAsaasConfigEffective();
  if (!cfg.enabled) {
    res.status(503).json({
      error: 'Asaas não configurado. Defina a chave em Configurações → APIs (Asaas) ou no backend.',
    });
    return;
  }

  const campaignId = String(req.body?.campaignId ?? '').trim();
  const inscriptionId = String(req.body?.inscriptionId ?? '').trim();
  const creditCard = req.body?.creditCard;
  const creditCardHolderInfo = req.body?.creditCardHolderInfo;

  if (!campaignId || !inscriptionId) {
    res.status(400).json({ error: 'campaignId e inscriptionId são obrigatórios.' });
    return;
  }
  if (!creditCard || !creditCardHolderInfo) {
    res.status(400).json({ error: 'Dados do cartão e do titular são obrigatórios.' });
    return;
  }

  try {
    const result = await payAsaasInscriptionWithCreditCard(
      campaignId,
      inscriptionId,
      creditCard,
      creditCardHolderInfo,
    );
    res.json(result);
  } catch (err) {
    const message =
      err instanceof AsaasApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Erro ao processar cartão';
    const status =
      message === 'INSCRIPTION_NOT_FOUND'
        ? 404
        : message === 'INSCRIPTION_PAYMENT_NOT_CREATED'
          ? 400
          : message === 'ASAAS_NOT_CONFIGURED' || message === 'FIREBASE_ADMIN_NOT_CONFIGURED'
            ? 503
            : err instanceof AsaasApiError && err.status === 400
              ? 400
              : 502;
    res.status(status).json({ error: message });
  }
});

/** Webhook Asaas (pagamentos confirmados). */
router.post('/webhook', async (req, res) => {
  const cfg = await getAsaasConfigEffective();
  if (cfg.webhookToken) {
    const headerToken =
      (req.headers['asaas-access-token'] as string | undefined) ??
      (req.headers['x-asaas-access-token'] as string | undefined);
    if (headerToken !== cfg.webhookToken) {
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

// ---------------------------------------------------------------------------
// Admin: leitura/escrita das credenciais (sempre mascaradas na resposta)
// ---------------------------------------------------------------------------

router.get('/integration', requireAdminAuth, async (_req, res) => {
  const cfg = await getAsaasConfigEffective();
  const doc = await readAsaasIntegrationDoc().catch(() => null);

  res.json(
    buildIntegrationPublic(doc, {
      environment: cfg.env,
      enabled: cfg.enabled,
      sandboxKey:
        doc?.apiKeySandbox || (cfg.env === 'sandbox' ? cfg.apiKey : '') || '',
      productionKey:
        doc?.apiKeyProduction || (cfg.env === 'production' ? cfg.apiKey : '') || '',
      webhookToken: cfg.webhookToken || '',
    })
  );
});

router.put('/integration', requireAdminAuth, async (req, res) => {
  const body = (req.body ?? {}) as Partial<AsaasIntegrationPatch> & {
    clearSandboxKey?: boolean;
    clearProductionKey?: boolean;
    clearWebhookToken?: boolean;
  };

  const updatedBy =
    (req as typeof req & { admin?: AdminAuthInfo }).admin?.email ??
    (req as typeof req & { admin?: AdminAuthInfo }).admin?.uid ??
    null;

  try {
    const patch: AsaasIntegrationPatch = {
      ...(body.environment === 'sandbox' || body.environment === 'production'
        ? { environment: body.environment }
        : {}),
      ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
      ...(typeof body.apiKeySandbox === 'string' ? { apiKeySandbox: body.apiKeySandbox } : {}),
      ...(typeof body.apiKeyProduction === 'string'
        ? { apiKeyProduction: body.apiKeyProduction }
        : {}),
      ...(typeof body.webhookToken === 'string' ? { webhookToken: body.webhookToken } : {}),
      ...(updatedBy ? { updatedBy } : {}),
    };

    await writeAsaasIntegrationDoc(patch);

    if (body.clearSandboxKey) await clearAsaasIntegrationSecret('apiKeySandbox', updatedBy ?? undefined);
    if (body.clearProductionKey)
      await clearAsaasIntegrationSecret('apiKeyProduction', updatedBy ?? undefined);
    if (body.clearWebhookToken)
      await clearAsaasIntegrationSecret('webhookToken', updatedBy ?? undefined);

    const cfg = await getAsaasConfigEffective();
    const doc = await readAsaasIntegrationDoc();
    res.json(
      buildIntegrationPublic(doc, {
        environment: cfg.env,
        enabled: cfg.enabled,
        sandboxKey: doc?.apiKeySandbox || (cfg.env === 'sandbox' ? cfg.apiKey : '') || '',
        productionKey:
          doc?.apiKeyProduction || (cfg.env === 'production' ? cfg.apiKey : '') || '',
        webhookToken: cfg.webhookToken || '',
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar integração';
    const status = message === 'FIREBASE_ADMIN_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

/** Testa a chave atual fazendo uma chamada inofensiva no Asaas (lista 1 cliente). */
router.post('/integration/test', requireAdminAuth, async (_req, res) => {
  const cfg = await getAsaasConfigEffective();
  if (!cfg.enabled) {
    res.status(503).json({
      ok: false,
      error: 'Integração desativada ou sem chave para o ambiente selecionado.',
    });
    return;
  }
  try {
    await asaasRequest<{ data: unknown[] }>('GET', '/customers?limit=1', undefined, cfg);
    res.json({ ok: true, environment: cfg.env });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao contactar Asaas';
    res.status(502).json({ ok: false, error: message, environment: cfg.env });
  }
});

export default router;
