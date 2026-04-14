import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { getDb } from './firestore';

export type VagaStatus = 'pendente' | 'aprovada' | 'reprovada';
export type TipoVaga = 'presencial' | 'hibrida' | 'remota';
export type TipoContrato = 'clt' | 'estagio' | 'temporario' | 'pj' | 'jovem-aprendiz' | 'outro';

export type Vaga = {
  id: string;
  tituloVaga: string;
  empresa: string;
  cidade: string;
  tipoVaga: TipoVaga;
  tipoContrato: TipoContrato;
  quantidadeVagas: number;
  salario: string;
  salarioACombinar: boolean;
  descricaoVaga: string;
  requisitos: string;
  diferenciais: string;
  cargaHoraria: string;
  prazoCandidatura: string;
  recrutadorNome: string;
  recrutadorEmail: string;
  recrutadorTelefone: string;
  status: VagaStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateVagaInput = Omit<Vaga, 'id' | 'status' | 'createdAt' | 'updatedAt'>;

export async function createVagaPublic(data: CreateVagaInput): Promise<string> {
  const db = getDb();
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, 'vagas'), {
    ...data,
    diferenciais: data.diferenciais || '',
    salario: data.salario || '',
    status: 'pendente',
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

function sortByCreatedAtDesc(items: Vaga[]): Vaga[] {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listVagasAdmin(): Promise<Vaga[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'vagas'));
  const items = snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Vaga, 'id'>) }));
  return sortByCreatedAtDesc(items);
}

export async function listVagasPublic(): Promise<Vaga[]> {
  const db = getDb();
  const q = query(collection(db, 'vagas'), where('status', '==', 'aprovada'));
  const snap = await getDocs(q);
  const items = snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Vaga, 'id'>) }));
  return sortByCreatedAtDesc(items);
}

export async function updateVagaStatus(id: string, status: VagaStatus): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'vagas', id), { status, updatedAt: new Date().toISOString() });
}

export async function updateVaga(
  id: string,
  data: Partial<Omit<Vaga, 'id' | 'status' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'vagas', id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteVaga(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'vagas', id));
}
