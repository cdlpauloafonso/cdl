import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import admin from 'firebase-admin';
import { initFirebaseAdmin } from '../lib/firebase-admin.js';

const JWT_SECRET = process.env.JWT_SECRET ?? '';

export interface AuthPayload {
  userId: string;
  email: string;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não informado' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    // Try firebase-admin verification first (if configured)
    initFirebaseAdmin();
    try {
      if ((admin as any).apps && (admin as any).apps.length) {
        const decoded = await admin.auth().verifyIdToken(token);
        if (decoded && decoded.email) {
          const user = await prisma.user.findUnique({
            where: { email: decoded.email },
            select: { id: true, email: true },
          });
          if (!user) {
            res.status(401).json({ error: 'Usuário não encontrado ou não autorizado' });
            return;
          }
          (req as Request & { user?: AuthPayload }).user = { userId: user.id, email: user.email };
          next();
          return;
        }
      }
    } catch {
      // ignore and try JWT fallback
    }

    // Fallback: verify local JWT
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

    // Verificar se o usuário existe na tabela User
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado ou não autorizado' });
      return;
    }

    // Garantir que o email do token corresponde ao email do usuário
    if (user.email !== payload.email) {
      res.status(401).json({ error: 'Token inválido - credenciais não correspondem' });
      return;
    }

    (req as Request & { user?: AuthPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
