import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import admin from 'firebase-admin';
import { getAdminFirestore } from './firebase-admin.js';

const SECRET_DOC_ID = 'credentialing';

function generateCredentialingAccessToken(): string {
  return `${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
}

export type CredentialingSecretDoc = {
  accessToken?: string;
  createdAt?: string;
};

export async function getCredentialingAccessToken(campaignId: string): Promise<string | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const snap = await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('adminSecrets')
    .doc(SECRET_DOC_ID)
    .get();
  if (!snap.exists) return null;
  const token = (snap.data() as CredentialingSecretDoc).accessToken;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function tokensMatch(stored: string, provided: string): boolean {
  const a = createHash('sha256').update(stored).digest();
  const b = createHash('sha256').update(provided).digest();
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function assertCredentialingToken(campaignId: string, token: string): Promise<void> {
  const stored = await getCredentialingAccessToken(campaignId);
  if (!stored || !token.trim() || !tokensMatch(stored, token.trim())) {
    throw new Error('INVALID_CREDENTIALING_TOKEN');
  }
}

export async function setInscriptionCredentialed(
  campaignId: string,
  inscriptionId: string,
  credentialed: boolean,
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const ref = db.collection('campaigns').doc(campaignId).collection('inscricoes').doc(inscriptionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('INSCRIPTION_NOT_FOUND');
  await ref.update({
    credentialedAt: credentialed
      ? new Date().toISOString()
      : admin.firestore.FieldValue.delete(),
  });
}

export async function ensureCredentialingAccessToken(campaignId: string): Promise<string> {
  const existing = await getCredentialingAccessToken(campaignId);
  if (existing) return existing;
  const db = getAdminFirestore();
  if (!db) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const token = generateCredentialingAccessToken();
  await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('adminSecrets')
    .doc(SECRET_DOC_ID)
    .set({ accessToken: token, createdAt: new Date().toISOString() });
  return token;
}

/** Sessão efêmera de credenciamento (mesma estrutura do link público). */
export async function createCredentialingGateSession(
  campaignId: string,
  accessToken: string,
): Promise<string> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const sessionId = randomUUID();
  await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('credentialingGate')
    .doc(sessionId)
    .set({
      token: accessToken.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  return sessionId;
}

export function campaignHasFormRegistration(camp: {
  registrationConfig?: { type?: string };
}): boolean {
  return camp.registrationConfig?.type === 'form';
}
