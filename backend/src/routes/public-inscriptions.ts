import { Router } from 'express';
import {
  CPF_ALREADY_REGISTERED_ERROR,
  createPublicEventInscription,
  INSCRIPTION_LIMIT_REACHED_ERROR,
  REGISTRATION_CLOSED_ERROR,
} from '../lib/create-event-inscription.js';

const router = Router();

/**
 * Inscrição pública em evento (Admin SDK — não depende das regras Firestore do navegador).
 * Body: { campaignId, fields, voucherCode?, allowUnpublished? }
 */
router.post('/event-inscription', async (req, res) => {
  const campaignId = String(req.body?.campaignId ?? '').trim();
  const fields = req.body?.fields;
  if (!campaignId) {
    res.status(400).json({ error: 'campaignId é obrigatório.' });
    return;
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    res.status(400).json({ error: 'fields deve ser um objeto.' });
    return;
  }

  const normalizedFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      normalizedFields[key] = value.trim();
    }
  }
  if (Object.keys(normalizedFields).length === 0) {
    res.status(400).json({ error: 'Preencha ao menos um campo.' });
    return;
  }

  const voucherCode =
    typeof req.body?.voucherCode === 'string' ? req.body.voucherCode : undefined;
  const allowUnpublished = Boolean(req.body?.allowUnpublished);

  try {
    const inscriptionId = await createPublicEventInscription(campaignId, normalizedFields, {
      voucherCode,
      allowUnpublished,
    });
    res.json({ inscriptionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar inscrição';
    const status =
      message === 'CAMPAIGN_NOT_FOUND' || message === 'CAMPAIGN_REGISTRATION_NOT_FORM'
        ? 404
        : message === REGISTRATION_CLOSED_ERROR ||
            message === CPF_ALREADY_REGISTERED_ERROR ||
            message === INSCRIPTION_LIMIT_REACHED_ERROR
          ? 409
          : message === 'CAMPAIGN_NOT_PUBLISHED'
            ? 403
            : message === 'FIREBASE_ADMIN_NOT_CONFIGURED'
              ? 503
              : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
