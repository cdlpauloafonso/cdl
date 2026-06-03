import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdminAuth } from '../lib/admin-auth.js';
import { getAdminFirestore } from '../lib/firebase-admin.js';

const router = Router();

const MERGE_KEYS = new Set([
  'title',
  'description',
  'fullDescription',
  'image',
  'date',
  'category',
  'highlights',
  'benefits',
  'howToParticipate',
  'contact',
  'registrationConfig',
  'registrationUrl',
  'paymentConfig',
  'vouchers',
  'inscriptionWebCount',
  'registrationClosed',
  'published',
  'checkInOnApp',
  'credentialingOnApp',
]);

function buildAdminCampaignPatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!MERGE_KEYS.has(key)) continue;
    if (value === undefined) continue;
    if (value === null) {
      patch[key] = FieldValue.delete();
    } else {
      patch[key] = value;
    }
  }
  return patch;
}

/** Atualiza campanha/evento via Admin SDK (admin autenticado; ignora regras do cliente). */
router.patch('/:campaignId', requireAdminAuth, async (req, res) => {
  const campaignId = String(req.params.campaignId ?? '').trim();
  if (!campaignId) {
    res.status(400).json({ error: 'ID do evento inválido.' });
    return;
  }

  const db = getAdminFirestore();
  if (!db) {
    res.status(503).json({ error: 'Firebase Admin não configurado no servidor.' });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Corpo da requisição inválido.' });
    return;
  }

  const patch = buildAdminCampaignPatch(body as Record<string, unknown>);
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    return;
  }

  try {
    const ref = db.collection('campaigns').doc(campaignId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Evento não encontrado.' });
      return;
    }
    await ref.update(patch);
    res.json({ ok: true, id: campaignId });
  } catch (err) {
    console.error('[admin-campaigns] update failed', campaignId, err);
    res.status(500).json({ error: 'Não foi possível salvar o evento.' });
  }
});

export default router;
