import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { getDb } from './firestore';

// ---- Planos (Firestore: collection) ----
export type Plano = {
  id: string;
  nome: string;
  descricao: string;
  preco: string;
  periodicidade: string;
  beneficios: string[];
  ativo: boolean;
  created_at: any;
  updated_at: any;
};

export async function getPlanos(): Promise<Plano[]> {
  const db = getDb();
  const col = collection(db, 'planos');
  const q = query(col, orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Plano));
}

export async function createPlano(data: Omit<Plano, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const db = getDb();
  const col = collection(db, 'planos');
  const docRef = await addDoc(col, {
    ...data,
    created_at: new Date(),
    updated_at: new Date()
  });
  return docRef.id;
}

export async function updatePlano(id: string, data: Partial<Omit<Plano, 'id' | 'created_at'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'planos', id);
  await updateDoc(docRef, {
    ...data,
    updated_at: new Date()
  });
}

export async function deletePlano(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'planos', id);
  await deleteDoc(docRef);
}

export async function getPlanoById(id: string): Promise<Plano | null> {
  const db = getDb();
  const docRef = doc(db, 'planos', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data()
  } as Plano;
}

export async function togglePlanoStatus(id: string, ativo: boolean): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'planos', id);
  await updateDoc(docRef, {
    ativo,
    updated_at: new Date()
  });
}
