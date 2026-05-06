import type { NewsItemFirestore } from '@/lib/firestore';

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

function isoFromAdminField(v: unknown): string {
  if (v == null || v === '') return new Date().toISOString();
  if (typeof v === 'string') return v;
  if (
    typeof v === 'object' &&
    v !== null &&
    'toDate' in v &&
    typeof (v as { toDate: () => Date }).toDate === 'function'
  ) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof v === 'object' && v !== null && typeof (v as { seconds?: number }).seconds === 'number') {
    return new Date((v as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

/** Notícia publicada por slug (Firebase Admin). Usado em `generateMetadata` / Open Graph. */
export async function getNewsBySlugAtBuild(slug: string): Promise<NewsItemFirestore | null> {
  if (typeof window !== 'undefined') return null;
  const s = slug.trim();
  if (!s) return null;
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
        return null;
      }
    }
    const db = admin.firestore();
    const snap = await db.collection('news').where('slug', '==', s).where('published', '==', true).limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data();
    return {
      id: d.id,
      title: (data.title as string) ?? '',
      slug: (data.slug as string) ?? '',
      excerpt: (data.excerpt as string) ?? '',
      content: (data.content as string) ?? '',
      image: data.image != null && data.image !== '' ? String(data.image) : null,
      links: (data.links as NewsItemFirestore['links']) ?? null,
      published: Boolean(data.published),
      publishedAt: isoFromAdminField(data.publishedAt),
      createdAt: isoFromAdminField(data.createdAt ?? data.publishedAt),
    };
  } catch {
    return null;
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
