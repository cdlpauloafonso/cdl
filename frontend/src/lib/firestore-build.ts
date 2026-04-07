/**
 * Server-side Firestore access for build time (generateStaticParams).
 * Requires GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON env var.
 */
export async function listCampaignIdsAtBuild(): Promise<string[]> {
  if (typeof window !== 'undefined') return [];
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      const creds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (creds) {
        const parsed = JSON.parse(creds) as Record<string, unknown>;
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
      } else {
        return [];
      }
    }
    const db = admin.firestore();
    const snap = await db.collection('campaigns').get();
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

/** IDs de slides do carrossel (admin) para generateStaticParams (output: export). */
export async function listCarouselSlideIdsAtBuild(): Promise<string[]> {
  if (typeof window !== 'undefined') return [];
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      const creds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (creds) {
        const parsed = JSON.parse(creds) as Record<string, unknown>;
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
      } else {
        return [];
      }
    }
    const db = admin.firestore();
    const snap = await db.collection('carousel').get();
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

/** IDs de notícias (admin) para generateStaticParams (output: export). */
export async function listNewsIdsAtBuild(): Promise<string[]> {
  if (typeof window !== 'undefined') return [];
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      const creds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (creds) {
        const parsed = JSON.parse(creds) as Record<string, unknown>;
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
      } else {
        return [];
      }
    }
    const db = admin.firestore();
    const snap = await db.collection('news').get();
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

/** Slugs de notícias publicadas para generateStaticParams (output: export). */
export async function listNewsSlugsAtBuild(): Promise<string[]> {
  if (typeof window !== 'undefined') return [];
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      const creds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (creds) {
        const parsed = JSON.parse(creds) as Record<string, unknown>;
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
      } else {
        return [];
      }
    }
    const db = admin.firestore();
    const snap = await db.collection('news').where('published', '==', true).get();
    return snap.docs.map((d) => (d.data().slug as string) || '').filter(Boolean);
  } catch {
    return [];
  }
}

/** IDs de associados (admin editar) para generateStaticParams (output: export). */
export async function listAssociadoIdsAtBuild(): Promise<string[]> {
  if (typeof window !== 'undefined') return [];
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      const creds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (creds) {
        const parsed = JSON.parse(creds) as Record<string, unknown>;
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
      } else {
        return [];
      }
    }
    const db = admin.firestore();
    const snap = await db.collection('associados').get();
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

/** IDs de planos (admin editar) para generateStaticParams (output: export). */
export async function listPlanoIdsAtBuild(): Promise<string[]> {
  if (typeof window !== 'undefined') return [];
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      const creds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (creds) {
        const parsed = JSON.parse(creds) as Record<string, unknown>;
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
      } else {
        return [];
      }
    }
    const db = admin.firestore();
    const snap = await db.collection('planos').get();
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}
