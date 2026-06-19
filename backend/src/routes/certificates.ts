import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdminAuth } from '../lib/admin-auth.js';
import { getAdminFirestore } from '../lib/firebase-admin.js';
import {
  certificateEmailClientChunkSize,
  certificateEmailMaxPerRequest,
} from '../lib/certificate-email/config.js';
import { getCertificateEmailEffectiveConfig } from '../lib/certificate-email/effective-config.js';
import {
  DEFAULT_CERTIFICATE_EMAIL_MESSAGE,
  effectiveCertificateEmailMessage,
  normalizeCertificateEmailConfigPatch,
  type CampaignCertificateEmailConfig,
} from '../lib/certificate-email/email-template.js';
import { processCertificateEmailBatch } from '../lib/certificate-email/batch.js';
import { getCampaignDoc } from '../lib/inscription-firestore.js';

const router = Router();

function buildEmailTemplateResponse(
  stored: CampaignCertificateEmailConfig | null | undefined,
) {
  const message = effectiveCertificateEmailMessage(stored);
  return {
    message,
    messageStored: stored?.message?.trim() || null,
    linkUrl: stored?.linkUrl?.trim() || '',
    linkLabel: stored?.linkLabel?.trim() || '',
    defaultMessage: DEFAULT_CERTIFICATE_EMAIL_MESSAGE,
    isCustomMessage: Boolean(stored?.message?.trim()),
  };
}

/** Status da configuração de envio (admin). */
router.get('/:campaignId/certificates/email-config', requireAdminAuth, async (req, res) => {
  const campaignId = String(req.params.campaignId ?? '').trim();
  const cfg = await getCertificateEmailEffectiveConfig();
  const campaign = campaignId ? await getCampaignDoc(campaignId).catch(() => null) : null;

  res.json({
    enabled: cfg.enabled,
    resendConfigured: cfg.providerReady,
    providerReady: cfg.providerReady,
    environment: cfg.environment,
    fromAddress: cfg.fromAddress,
    source: cfg.source,
    maxPerRequest: certificateEmailMaxPerRequest(),
    clientChunkSize: certificateEmailClientChunkSize(),
    emailTemplate: buildEmailTemplateResponse(campaign?.certificateEmailConfig),
  });
});

/** Salva mensagem e link opcional do e-mail de certificado (por evento). */
router.put('/:campaignId/certificates/email-template', requireAdminAuth, async (req, res) => {
  const campaignId = String(req.params.campaignId ?? '').trim();
  if (!campaignId) {
    res.status(400).json({ error: 'campaignId é obrigatório.' });
    return;
  }

  const patch = normalizeCertificateEmailConfigPatch(req.body);
  if (!patch) {
    res.status(400).json({ error: 'Corpo da requisição inválido.' });
    return;
  }

  const db = getAdminFirestore();
  if (!db) {
    res.status(503).json({ error: 'Firebase Admin não configurado no servidor.' });
    return;
  }

  try {
    const ref = db.collection('campaigns').doc(campaignId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Evento não encontrado.' });
      return;
    }

    const current = (snap.data()?.certificateEmailConfig ?? {}) as CampaignCertificateEmailConfig;
    const next: CampaignCertificateEmailConfig = { ...current };

    if (typeof patch.message === 'string') {
      const trimmed = patch.message.trim();
      next.message = trimmed || undefined;
    }
    if (patch.linkUrl !== undefined) {
      next.linkUrl = patch.linkUrl.trim() || undefined;
    }
    if (patch.linkLabel !== undefined) {
      next.linkLabel = patch.linkLabel.trim() || undefined;
    }

    const hasContent =
      Boolean(next.message?.trim()) ||
      Boolean(next.linkUrl?.trim()) ||
      Boolean(next.linkLabel?.trim());

    await ref.update({
      certificateEmailConfig: hasContent ? next : FieldValue.delete(),
    });

    res.json({ ok: true, emailTemplate: buildEmailTemplateResponse(hasContent ? next : null) });
  } catch (err) {
    console.error('[certificates/email-template]', err);
    res.status(500).json({ error: 'Erro ao salvar mensagem do e-mail.' });
  }
});

/** Envia certificado por e-mail para uma inscrição. */
router.post('/:campaignId/certificates/:inscriptionId/send-email', requireAdminAuth, async (req, res) => {
  const campaignId = String(req.params.campaignId ?? '').trim();
  const inscriptionId = String(req.params.inscriptionId ?? '').trim();
  if (!campaignId || !inscriptionId) {
    res.status(400).json({ error: 'campaignId e inscriptionId são obrigatórios.' });
    return;
  }

  try {
    const batch = await processCertificateEmailBatch(campaignId, [inscriptionId]);
    const item = batch.results[0];
    if (!item) {
      res.status(500).json({ error: 'Não foi possível processar o envio.' });
      return;
    }
    if (item.ok) {
      res.json({ ok: true, sentAt: item.sentAt });
      return;
    }
    if (item.skipped) {
      res.status(409).json({ ok: false, skipped: true, reason: item.reason, sentAt: item.sentAt });
      return;
    }
    res.status(422).json({ ok: false, error: item.error ?? 'Falha no envio.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'EVENT_NOT_FOUND') {
      res.status(404).json({ error: 'Evento não encontrado.' });
      return;
    }
    if (message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
      res.status(503).json({ error: 'Firebase Admin não configurado no servidor.' });
      return;
    }
    res.status(500).json({ error: 'Erro ao processar envio de certificado.' });
  }
});

/**
 * Lote controlado no servidor (pausa entre cada e-mail).
 * O frontend deve fatiar pedidos grandes em várias chamadas (clientChunkSize).
 */
router.post('/:campaignId/certificates/send-email-batch', requireAdminAuth, async (req, res) => {
  const campaignId = String(req.params.campaignId ?? '').trim();
  const rawIds = req.body?.inscriptionIds;
  if (!campaignId) {
    res.status(400).json({ error: 'campaignId é obrigatório.' });
    return;
  }
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    res.status(400).json({ error: 'inscriptionIds deve ser um array não vazio.' });
    return;
  }

  const max = certificateEmailMaxPerRequest();
  const inscriptionIds = rawIds.map((id: unknown) => String(id ?? '').trim()).filter(Boolean);
  if (inscriptionIds.length > max) {
    res.status(400).json({
      error: `Máximo de ${max} inscrições por requisição. Envie em várias etapas; o painel divide automaticamente.`,
      maxPerRequest: max,
      clientChunkSize: certificateEmailClientChunkSize(),
    });
    return;
  }

  try {
    const batch = await processCertificateEmailBatch(campaignId, inscriptionIds);
    res.json(batch);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'EVENT_NOT_FOUND') {
      res.status(404).json({ error: 'Evento não encontrado.' });
      return;
    }
    if (message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
      res.status(503).json({ error: 'Firebase Admin não configurado no servidor.' });
      return;
    }
    res.status(500).json({ error: 'Erro ao processar lote de e-mails.' });
  }
});

export default router;
