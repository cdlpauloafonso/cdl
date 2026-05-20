import { Router } from 'express';
import { getCampaignDoc } from '../lib/inscription-firestore.js';
import {
  assertCredentialingToken,
  getCredentialingAccessToken,
  setInscriptionCredentialed,
} from '../lib/credentialing-access.js';

const router = Router();

/** Valida token do link público de credenciamento (sem expor o segredo). */
router.get('/events/:campaignId/credentialing/session', async (req, res) => {
  const campaignId = String(req.params.campaignId ?? '').trim();
  const token = String(req.query.token ?? '').trim();
  if (!campaignId || !token) {
    res.status(400).json({ ok: false, error: 'eventId e token são obrigatórios.' });
    return;
  }

  try {
    const camp = await getCampaignDoc(campaignId);
    if (!camp) {
      res.status(404).json({ ok: false, error: 'Evento não encontrado.' });
      return;
    }
    await assertCredentialingToken(campaignId, token);
    res.json({ ok: true, eventTitle: camp.title ?? '' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'INVALID_CREDENTIALING_TOKEN') {
      res.status(403).json({ ok: false, error: 'Link inválido ou expirado.' });
      return;
    }
    if (message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
      res.status(503).json({ ok: false, error: 'Servidor indisponível para credenciamento.' });
      return;
    }
    res.status(500).json({ ok: false, error: 'Não foi possível validar o link.' });
  }
});

/** Credencia ou remove credenciamento via link público. */
router.patch('/events/:campaignId/inscriptions/:inscriptionId/credential', async (req, res) => {
  const campaignId = String(req.params.campaignId ?? '').trim();
  const inscriptionId = String(req.params.inscriptionId ?? '').trim();
  const token = String(req.body?.token ?? '').trim();
  const credentialed = Boolean(req.body?.credentialed);

  if (!campaignId || !inscriptionId || !token) {
    res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
    return;
  }

  try {
    const camp = await getCampaignDoc(campaignId);
    if (!camp) {
      res.status(404).json({ error: 'Evento não encontrado.' });
      return;
    }
    const configured = await getCredentialingAccessToken(campaignId);
    if (!configured) {
      res.status(403).json({ error: 'Credenciamento público não configurado para este evento.' });
      return;
    }
    await assertCredentialingToken(campaignId, token);
    await setInscriptionCredentialed(campaignId, inscriptionId, credentialed);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'INVALID_CREDENTIALING_TOKEN') {
      res.status(403).json({ error: 'Link inválido ou expirado.' });
      return;
    }
    if (message === 'INSCRIPTION_NOT_FOUND') {
      res.status(404).json({ error: 'Inscrição não encontrada.' });
      return;
    }
    if (message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
      res.status(503).json({ error: 'Servidor indisponível para credenciamento.' });
      return;
    }
    res.status(500).json({ error: 'Não foi possível atualizar o credenciamento.' });
  }
});

export default router;
