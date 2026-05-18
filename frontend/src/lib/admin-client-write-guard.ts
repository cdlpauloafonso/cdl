import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

/** Retorna `null` se o utilizador autenticado pode escrever no painel; caso contrário mensagem de erro. */
export async function ensureAdminForClientWrite(): Promise<string | null> {
  initFirebase();
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return 'Faça login como administrador.';
  const idTokenResult = await user.getIdTokenResult();
  const isClaimAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin);
  if (isClaimAdmin) return null;
  const db = getFirestore();
  const adminDoc = await getDoc(doc(db, 'admins', user.uid));
  if (adminDoc.exists()) return null;
  return 'Acesso não autorizado.';
}
