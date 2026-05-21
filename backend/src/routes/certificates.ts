import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  certificateEmailClientChunkSize,
  certificateEmailMaxPerRequest,
  isCertificateEmailEnabled,
  isCertificateSmtpConfigured,
} from '../lib/certificate-email/config.js';
import { processCertificateEmailBatch } from '../lib/certificate-email/batch.js';

const router = Router();

/** Status da configuração de envio (admin). */
router.get('/:campaignId/certificates/email-config', authMiddleware, (_req, res) => {
  res.json({
    enabled: isCertificateEmailEnabled(),
    smtpConfigured: isCertificateSmtpConfigured(),
    maxPerRequest: certificateEmailMaxPerRequest(),
    clientChunkSize: certificateEmailClientChunkSize(),
  });
});

/** Envia certificado por e-mail para uma inscrição. */
router.post('/:campaignId/certificates/:inscriptionId/send-email', authMiddleware, async (req, res) => {
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
router.post('/:campaignId/certificates/send-email-batch', authMiddleware, async (req, res) => {
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
