import { Router } from 'express';
import { getAdminFirestore } from '../lib/firebase-admin.js';

const router = Router();

const COLLECTION = 'nossaCidade';
const DOC_ID = 'main';

/** Conteúdo gerenciável da página institucional (Firestore). Leitura pública para SSR. */
router.get('/', async (_req, res) => {
  try {
    const db = getAdminFirestore();
    if (!db) {
      res.json({ excerpt: null, content: null, pontosTuristicos: null });
      return;
    }
    const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) {
      res.json({ excerpt: null, content: null, pontosTuristicos: null });
      return;
    }
    const d = snap.data();
    const excerpt = d?.excerpt != null ? String(d.excerpt) : null;
    const content = d?.content != null ? String(d.content) : null;
    const pontosTuristicos = Array.isArray(d?.pontosTuristicos) ? d.pontosTuristicos : null;
    res.json({ excerpt, content, pontosTuristicos });
  } catch (e) {
    console.error('[api/nossa-cidade]', e);
    res.json({ excerpt: null, content: null, pontosTuristicos: null });
  }
});

export default router;
