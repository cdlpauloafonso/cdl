import { Router } from 'express';
import { Resend } from 'resend';
import { requireAdminAuth, type AdminAuthInfo } from '../lib/admin-auth.js';
import { getCertificateEmailEffectiveConfig } from '../lib/certificate-email/effective-config.js';
import {
  buildResendIntegrationPublic,
  clearResendIntegrationSecret,
  readResendIntegrationDoc,
  writeResendIntegrationDoc,
  type ResendIntegrationPatch,
} from '../lib/certificate-email/resend-integration-store.js';

const router = Router();

function envFallbackForPublic() {
  const environment =
    (process.env.RESEND_ENV ?? process.env.CERTIFICATE_EMAIL_ENV ?? 'sandbox').trim().toLowerCase() ===
    'production'
      ? ('production' as const)
      : ('sandbox' as const);
  const legacy = process.env.RESEND_API_KEY?.trim() ?? '';
  const sandboxEnv = process.env.RESEND_API_KEY_SANDBOX?.trim() ?? '';
  const productionEnv = process.env.RESEND_API_KEY_PRODUCTION?.trim() ?? '';
  return {
    environment,
    enabled: process.env.CERTIFICATE_EMAIL_ENABLED === 'true',
    sandboxKey: sandboxEnv || (environment === 'sandbox' ? legacy : ''),
    productionKey: productionEnv || (environment === 'production' ? legacy : ''),
    fromAddressSandbox:
      process.env.RESEND_FROM_SANDBOX?.trim() ||
      process.env.RESEND_FROM?.trim() ||
      'onboarding@resend.dev',
    fromAddressProduction:
      process.env.RESEND_FROM_PRODUCTION?.trim() ||
      'CDL Paulo Afonso <certificados@cdlpauloafonso.com>',
  };
}

router.get('/integration/status', requireAdminAuth, async (_req, res) => {
  const cfg = await getCertificateEmailEffectiveConfig();
  res.json({
    enabled: cfg.enabled,
    providerReady: cfg.providerReady,
    environment: cfg.environment,
    fromAddress: cfg.fromAddress,
    source: cfg.source,
  });
});

router.get('/integration', requireAdminAuth, async (_req, res) => {
  const cfg = await getCertificateEmailEffectiveConfig();
  const doc = await readResendIntegrationDoc().catch(() => null);
  res.json(
    buildResendIntegrationPublic(doc, {
      ...envFallbackForPublic(),
      enabled: cfg.enabled,
    }),
  );
});

router.put('/integration', requireAdminAuth, async (req, res) => {
  const body = (req.body ?? {}) as Partial<ResendIntegrationPatch> & {
    clearSandboxKey?: boolean;
    clearProductionKey?: boolean;
  };
  const updatedBy =
    (req as typeof req & { admin?: AdminAuthInfo }).admin?.email ??
    (req as typeof req & { admin?: AdminAuthInfo }).admin?.uid ??
    null;

  try {
    const patch: ResendIntegrationPatch = {
      ...(body.environment === 'sandbox' || body.environment === 'production'
        ? { environment: body.environment }
        : {}),
      ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
      ...(typeof body.apiKeySandbox === 'string' ? { apiKeySandbox: body.apiKeySandbox } : {}),
      ...(typeof body.apiKeyProduction === 'string'
        ? { apiKeyProduction: body.apiKeyProduction }
        : {}),
      ...(typeof body.fromAddressSandbox === 'string'
        ? { fromAddressSandbox: body.fromAddressSandbox }
        : {}),
      ...(typeof body.fromAddressProduction === 'string'
        ? { fromAddressProduction: body.fromAddressProduction }
        : {}),
      ...(updatedBy ? { updatedBy } : {}),
    };

    await writeResendIntegrationDoc(patch);
    if (body.clearSandboxKey) {
      await clearResendIntegrationSecret('apiKeySandbox', updatedBy ?? undefined);
      await clearResendIntegrationSecret('apiKey', updatedBy ?? undefined);
    }
    if (body.clearProductionKey) {
      await clearResendIntegrationSecret('apiKeyProduction', updatedBy ?? undefined);
    }

    const cfg = await getCertificateEmailEffectiveConfig();
    const doc = await readResendIntegrationDoc();
    res.json(
      buildResendIntegrationPublic(doc, {
        ...envFallbackForPublic(),
        enabled: cfg.enabled,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar integração Resend';
    const status = message === 'FIREBASE_ADMIN_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

/** Valida a chave do ambiente ativo listando domínios no Resend. */
router.post('/integration/test', requireAdminAuth, async (_req, res) => {
  const cfg = await getCertificateEmailEffectiveConfig();
  if (!cfg.providerReady) {
    res.status(503).json({
      ok: false,
      error: `Resend não configurado (sem API key para ${cfg.environment === 'production' ? 'produção' : 'sandbox'}).`,
    });
    return;
  }

  try {
    const resend = new Resend(cfg.apiKey);
    const { data, error } = await resend.domains.list();
    if (error) {
      res.status(502).json({ ok: false, error: error.message || 'Falha ao contactar Resend.' });
      return;
    }
    res.json({
      ok: true,
      environment: cfg.environment,
      fromAddress: cfg.fromAddress,
      domainsCount: data?.data?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao contactar Resend';
    res.status(502).json({ ok: false, error: message });
  }
});

export default router;
