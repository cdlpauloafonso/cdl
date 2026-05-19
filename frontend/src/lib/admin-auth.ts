import { initFirebase } from '@/lib/firebase';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';

const ADMIN_TOKEN_KEY = 'cdl_admin_token';

/** Aguarda o Firebase restaurar a sessão (evita falso negativo em nova aba). */
export async function waitForFirebaseAuthUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null;

  initFirebase();
  const auth = getAuth();

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
    if (auth.currentUser) return auth.currentUser;
  }

  return new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

/** Destino após login admin (`?redirect=` na URL de login). */
export function resolveAdminPostLoginPath(redirectTo: string | null | undefined): string {
  const r = (redirectTo ?? '').trim();
  if (!r) return '/admin';
  if (r === 'agendamentos' || r === '/agendamentos') return '/agendamentos';
  if (r.startsWith('/') && !r.startsWith('//')) return r;
  return '/admin';
}

/** Indício de sessão admin (JWT no localStorage, definido no login). */
export function hasAdminSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY)?.trim());
}

/** Verifica se o usuário logado é administrador (claim ou coleção `admins`). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  if (!hasAdminSessionHint()) return false;

  const user = await waitForFirebaseAuthUser();
  if (!user) return false;

  try {
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims?.admin) return true;
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const db = getFirestore();
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}
