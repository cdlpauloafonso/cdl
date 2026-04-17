import { getDb } from './firestore';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  where,
  getDoc
} from 'firebase/firestore';

// ---- Informativos (Firestore: collection) ----
export type Informativo = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'sistema' | 'aviso' | 'manutencao' | 'evento';
  status: 'ativo' | 'inativo' | 'agendado';
  data_publicacao: any;
  data_expiracao?: any;
  autor: string;
  created_at: any;
  updated_at: any;
};

// ---- Funções para Informativos ----
export async function getInformativos(): Promise<Informativo[]> {
  const db = getDb();
  const col = collection(db, 'informativos');
  const q = query(col, orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Informativo));
}

export async function getInformativosAtivos(): Promise<Informativo[]> {
  const db = getDb();
  const col = collection(db, 'informativos');
  const q = query(
    col, 
    where('status', '==', 'ativo'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Informativo));
}

export async function createInformativo(data: Omit<Informativo, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const db = getDb();
  const col = collection(db, 'informativos');
  const docRef = await addDoc(col, {
    ...data,
    created_at: new Date(),
    updated_at: new Date()
  });
  return docRef.id;
}

export async function updateInformativo(id: string, data: Partial<Omit<Informativo, 'id' | 'created_at'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'informativos', id);
  await updateDoc(docRef, {
    ...data,
    updated_at: new Date()
  });
}

export async function deleteInformativo(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'informativos', id);
  await deleteDoc(docRef);
}

export async function getInformativoById(id: string): Promise<Informativo | null> {
  const db = getDb();
  const docRef = doc(db, 'informativos', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data()
  } as Informativo;
}

export async function ativarInformativo(id: string): Promise<void> {
  await updateInformativo(id, { status: 'ativo' });
}

export async function desativarInformativo(id: string): Promise<void> {
  await updateInformativo(id, { status: 'inativo' });
}

export async function agendarInformativo(id: string, dataExpiracao: Date): Promise<void> {
  await updateInformativo(id, { 
    status: 'agendado',
    data_expiracao: dataExpiracao 
  });
}
