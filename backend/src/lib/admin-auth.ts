/**
 * Middleware leve para áreas administrativas que NÃO dependem de Postgres.
 *
 * Aceita Bearer = Firebase ID Token e considera admin se:
 *   - custom claim `admin == true`, OU
 *   - existe doc /admins/{uid} no Firestore.
 *
 * Retorna 401 se não autenticado, 403 se autenticado mas não admin
 * e 503 se o Firebase Admin SDK não estiver configurado no servidor.
 */
import type { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';
import { getAdminFirestore, initFirebaseAdmin } from './firebase-admin.js';

export type AdminAuthInfo = {
  uid: string;
  email?: string;
};

export async function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não informado.' });
    return;
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    res.status(401).json({ error: 'Token de autenticação vazio.' });
    return;
  }

  initFirebaseAdmin();
  if (!admin.apps.length) {
    res.status(503).json({ error: 'Firebase Admin não configurado no servidor.' });
    return;
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
    return;
  }

  const isClaimAdmin =
    decoded.admin === true ||
    decoded.admin === 'true' ||
    (decoded.roles && Array.isArray(decoded.roles) && decoded.roles.includes('admin'));

  let isAdmin = Boolean(isClaimAdmin);
  if (!isAdmin) {
    const db = getAdminFirestore();
    if (db) {
      try {
        const snap = await db.collection('admins').doc(decoded.uid).get();
        isAdmin = snap.exists;
      } catch {
        isAdmin = false;
      }
    }
  }

  if (!isAdmin) {
    res.status(403).json({ error: 'Acesso restrito a administradores.' });
    return;
  }

  (req as Request & { admin?: AdminAuthInfo }).admin = {
    uid: decoded.uid,
    email: decoded.email,
  };

  next();
}
