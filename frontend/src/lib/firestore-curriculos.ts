import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { getDb } from './firestore';

export type CurriculoStatus = 'pendente' | 'aprovado' | 'reprovado';

export type Curriculo = {
  id: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  telefoneWhatsapp: string;
  email: string;
  cidade: string;
  bairro: string;
  areaInteresse: string;
  cargoDesejado: string;
  resumoProfissional: string;
  escolaridade: string;
  experienciaProfissional: string;
  habilidades: string;
  linkedIn: string;
  status: CurriculoStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateCurriculoInput = Omit<Curriculo, 'id' | 'status' | 'createdAt' | 'updatedAt'>;

export async function createCurriculoPublic(data: CreateCurriculoInput): Promise<string> {
  const db = getDb();
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, 'curriculos'), {
    ...data,
    cpf: data.cpf || '',
    dataNascimento: data.dataNascimento || '',
    bairro: data.bairro || '',
    linkedIn: data.linkedIn || '',
    status: 'pendente',
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function listCurriculosAdmin(): Promise<Curriculo[]> {
  const db = getDb();
  const q = query(collection(db, 'curriculos'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((item) => {
    const data = item.data() as Omit<Curriculo, 'id'>;
    return {
      id: item.id,
      ...data,
    };
  });
}

export async function updateCurriculoStatus(id: string, status: CurriculoStatus): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'curriculos', id), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateCurriculo(
  id: string,
  data: Partial<Omit<Curriculo, 'id' | 'status' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'curriculos', id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCurriculo(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'curriculos', id));
}
