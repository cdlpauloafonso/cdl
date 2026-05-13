import admin from 'firebase-admin';

export function initFirebaseAdmin(): void {
  try {
    if (admin.apps.length > 0) return;
    const creds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (creds) {
      const parsed = JSON.parse(creds) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
      return;
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
    }
  } catch {
    /* init opcional; verifyIdToken/getFirestore falham depois se necessário */
  }
}

export function getAdminFirestore(): admin.firestore.Firestore | null {
  initFirebaseAdmin();
  if (!admin.apps.length) return null;
  return admin.firestore();
}
