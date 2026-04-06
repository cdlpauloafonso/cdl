import { getApps } from 'firebase/app';
import { initFirebase } from './firebase';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';

function getDb() {
  if (typeof window === 'undefined') throw new Error('Firestore is client-side only');
  initFirebase();
  return getFirestore();
}

export type Campaign = {
  id?: string;
  title: string;
  description: string;
  fullDescription?: string;
  image?: string;
  date?: string;
  category?: string;
  highlights?: string[];
  benefits?: string[];
  howToParticipate?: string;
  contact?: string;
};

export async function listCampaigns(): Promise<Campaign[]> {
  const db = getDb();
  const col = collection(db, 'campaigns');
  const q = query(col, orderBy('title'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const db = getDb();
  const ref = doc(db, 'campaigns', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

export async function createCampaign(data: Campaign) {
  const db = getDb();
  const col = collection(db, 'campaigns');
  // remove undefined fields to avoid Firestore errors
  const payload: Record<string, any> = {};
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) payload[k] = v;
  });
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function updateCampaign(id: string, data: Partial<Campaign>) {
  const db = getDb();
  const ref = doc(db, 'campaigns', id);
  // remove undefined fields
  const payload: Record<string, any> = {};
  Object.entries(data as Record<string, any>).forEach(([k, v]) => {
    if (v !== undefined) payload[k] = v;
  });
  await updateDoc(ref, payload as any);
}

export async function setCampaign(id: string, data: Campaign) {
  const db = getDb();
  const ref = doc(db, 'campaigns', id);
  const payload: Record<string, any> = {};
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) payload[k] = v;
  });
  await setDoc(ref, payload as any);
}

export async function deleteCampaignById(id: string) {
  const db = getDb();
  const ref = doc(db, 'campaigns', id);
  await deleteDoc(ref);
}

// ---- News (Firestore) ----
export type NewsLink = { label: string; url: string; type: 'download' | 'external' };

export type NewsItemFirestore = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string | null;
  links: NewsLink[] | null;
  published: boolean;
  publishedAt: string;
  createdAt?: string;
};

function newsToPayload(data: Partial<NewsItemFirestore>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const keys: (keyof NewsItemFirestore)[] = ['title', 'slug', 'excerpt', 'content', 'image', 'links', 'published', 'publishedAt', 'createdAt'];
  keys.forEach((k) => {
    const v = data[k];
    if (v !== undefined) payload[k] = v;
  });
  return payload;
}

export async function listNews(onlyPublished: boolean, limitCount: number = 100): Promise<NewsItemFirestore[]> {
  const db = getDb();
  const col = collection(db, 'news');
  const q = onlyPublished
    ? query(
        col,
        where('published', '==', true),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      )
    : query(col, orderBy('publishedAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? '',
      slug: data.slug ?? '',
      excerpt: data.excerpt ?? '',
      content: data.content ?? '',
      image: data.image ?? null,
      links: data.links ?? null,
      published: data.published ?? false,
      publishedAt: data.publishedAt ?? new Date().toISOString(),
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  });
}

export async function getNewsById(id: string): Promise<NewsItemFirestore | null> {
  const db = getDb();
  const ref = doc(db, 'news', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title ?? '',
    slug: data.slug ?? '',
    excerpt: data.excerpt ?? '',
    content: data.content ?? '',
    image: data.image ?? null,
    links: data.links ?? null,
    published: data.published ?? false,
    publishedAt: data.publishedAt ?? new Date().toISOString(),
    createdAt: data.createdAt ?? new Date().toISOString(),
  };
}

export async function getNewsBySlug(slug: string): Promise<NewsItemFirestore | null> {
  const db = getDb();
  const col = collection(db, 'news');
  const q = query(col, where('slug', '==', slug), where('published', '==', true), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    title: data.title ?? '',
    slug: data.slug ?? '',
    excerpt: data.excerpt ?? '',
    content: data.content ?? '',
    image: data.image ?? null,
    links: data.links ?? null,
    published: data.published ?? false,
    publishedAt: data.publishedAt ?? new Date().toISOString(),
    createdAt: data.createdAt ?? new Date().toISOString(),
  };
}

export async function createNews(data: NewsItemFirestore): Promise<string> {
  const db = getDb();
  const col = collection(db, 'news');
  const createdAt = new Date().toISOString();
  const payload = { ...newsToPayload(data), createdAt };
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function updateNews(id: string, data: Partial<NewsItemFirestore>): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'news', id);
  await updateDoc(ref, newsToPayload(data) as Record<string, unknown>);
}

export async function deleteNews(id: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'news', id);
  await deleteDoc(ref);
}

// ---- Carousel / Hero slides (Firestore) ----
export type CarouselButton = { text: string; href: string };

export type CarouselSlide = {
  id?: string;
  title: string;
  description: string;
  photo: string | null;
  buttons: CarouselButton[];
  order: number;
};

export async function listCarouselSlides(): Promise<CarouselSlide[]> {
  const db = getDb();
  const col = collection(db, 'carousel');
  const q = query(col, orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? '',
      description: data.description ?? '',
      photo: data.photo ?? null,
      buttons: Array.isArray(data.buttons) ? data.buttons : [],
      order: data.order ?? 0,
    };
  });
}

export async function getCarouselSlide(id: string): Promise<CarouselSlide | null> {
  const db = getDb();
  const ref = doc(db, 'carousel', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    title: data?.title ?? '',
    description: data?.description ?? '',
    photo: data?.photo ?? null,
    buttons: Array.isArray(data?.buttons) ? data.buttons : [],
    order: data?.order ?? 0,
  };
}

export async function createCarouselSlide(data: Omit<CarouselSlide, 'id'>): Promise<string> {
  const db = getDb();
  const col = collection(db, 'carousel');
  const payload = {
    title: data.title,
    description: data.description,
    photo: data.photo ?? null,
    buttons: data.buttons ?? [],
    order: data.order ?? 0,
  };
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function updateCarouselSlide(id: string, data: Partial<CarouselSlide>): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'carousel', id);
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.photo !== undefined) payload.photo = data.photo;
  if (data.buttons !== undefined) payload.buttons = data.buttons;
  if (data.order !== undefined) payload.order = data.order;
  await updateDoc(ref, payload);
}

export async function deleteCarouselSlide(id: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'carousel', id);
  await deleteDoc(ref);
}

// ---- Certificado Digital (Firestore: single doc) ----
const CERTIFICADO_DOC_ID = 'page';

export type CertificadoDigitalItem = {
  title: string;
  description: string;
  photo: string | null;
  section1Title: string;
  section1Content: string;
  section2Title: string;
  section2Content: string;
  section3Title: string;
  section3Content: string;
};

export async function getCertificadoDigital(): Promise<CertificadoDigitalItem> {
  const db = getDb();
  const ref = doc(db, 'certificadoDigital', CERTIFICADO_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {
      title: '',
      description: '',
      photo: null,
      section1Title: '',
      section1Content: '',
      section2Title: '',
      section2Content: '',
      section3Title: '',
      section3Content: '',
    };
  }
  const data = snap.data();
  return {
    title: data?.title ?? '',
    description: data?.description ?? '',
    photo: data?.photo ?? null,
    section1Title: data?.section1Title ?? '',
    section1Content: data?.section1Content ?? '',
    section2Title: data?.section2Title ?? '',
    section2Content: data?.section2Content ?? '',
    section3Title: data?.section3Title ?? '',
    section3Content: data?.section3Content ?? '',
  };
}

export async function setCertificadoDigital(data: CertificadoDigitalItem): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'certificadoDigital', CERTIFICADO_DOC_ID);
  await setDoc(ref, {
    title: data.title,
    description: data.description,
    photo: data.photo ?? null,
    section1Title: data.section1Title,
    section1Content: data.section1Content,
    section2Title: data.section2Title,
    section2Content: data.section2Content,
    section3Title: data.section3Title,
    section3Content: data.section3Content,
  });
}

// ---- Benefícios Associados (Firestore: single doc) ----
const BENEFICIOS_DOC_ID = 'page';

export type BeneficiosAssociadosItem = {
  title: string;
  description: string;
  photo: string | null;
};

export async function getBeneficiosAssociados(): Promise<BeneficiosAssociadosItem> {
  const db = getDb();
  const ref = doc(db, 'beneficiosAssociados', BENEFICIOS_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {
      title: '',
      description: '',
      photo: null,
    };
  }
  return snap.data() as BeneficiosAssociadosItem;
}

export async function setBeneficiosAssociados(data: BeneficiosAssociadosItem): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'beneficiosAssociados', BENEFICIOS_DOC_ID);
  await setDoc(ref, {
    title: data.title,
    description: data.description,
    photo: data.photo ?? null,
  });
}

// ---- Auditorium (Firestore: single doc) ----
const AUDITORIUM_DOC_ID = 'page';

export type AuditoriumItem = {
  title: string;
  description: string;
  photo: string | null;
  infrastructureTitle: string;
  infrastructureItems: string[];
};

export async function getAuditorium(): Promise<AuditoriumItem> {
  const db = getDb();
  const ref = doc(db, 'auditorium', AUDITORIUM_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {
      title: '',
      description: '',
      photo: null,
      infrastructureTitle: '',
      infrastructureItems: [],
    };
  }
  const data = snap.data();
  return {
    title: data?.title ?? '',
    description: data?.description ?? '',
    photo: data?.photo ?? null,
    infrastructureTitle: data?.infrastructureTitle ?? 'Infraestrutura',
    infrastructureItems: Array.isArray(data?.infrastructureItems) ? data.infrastructureItems : [],
  };
}

export async function setAuditorium(data: AuditoriumItem): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'auditorium', AUDITORIUM_DOC_ID);
  await setDoc(ref, {
    title: data.title,
    description: data.description,
    photo: data.photo ?? null,
    infrastructureTitle: data.infrastructureTitle,
    infrastructureItems: data.infrastructureItems ?? [],
  });
}

// ---- About / CDL Paulo Afonso (Firestore: single doc) ----
const ABOUT_DOC_ID = 'cdl';

export type AboutItem = {
  title: string;
  description: string;
  photo: string | null;
};

export async function getAbout(): Promise<AboutItem> {
  const db = getDb();
  const ref = doc(db, 'about', ABOUT_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { title: '', description: '', photo: null };
  }
  const data = snap.data();
  return {
    title: data?.title ?? '',
    description: data?.description ?? '',
    photo: data?.photo ?? null,
  };
}

export async function setAbout(data: AboutItem): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'about', ABOUT_DOC_ID);
  await setDoc(ref, {
    title: data.title,
    description: data.description,
    photo: data.photo ?? null,
  });
}

// ---- Associados (Firestore: collection) ----
export type Associado = {
  id: string;
  nome: string;
  empresa: string;
  cnpj: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  cidade: string;
  estado: string;
  plano: string;
  codigo_spc: string;
  data_aniversario: string;
  observacoes: string;
  created_at: any;
  updated_at: any;
};

export async function getAssociados(): Promise<Associado[]> {
  const db = getDb();
  const col = collection(db, 'associados');
  const q = query(col, orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Associado));
}

export async function createAssociado(data: Omit<Associado, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const db = getDb();
  const col = collection(db, 'associados');
  const docRef = await addDoc(col, {
    ...data,
    created_at: new Date(),
    updated_at: new Date()
  });
  return docRef.id;
}

export async function updateAssociado(id: string, data: Partial<Omit<Associado, 'id' | 'created_at'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'associados', id);
  await updateDoc(docRef, {
    ...data,
    updated_at: new Date()
  });
}

export async function deleteAssociado(id: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'associados', id);
  await deleteDoc(docRef);
}

export async function getAssociadoById(id: string): Promise<Associado | null> {
  const db = getDb();
  const docRef = doc(db, 'associados', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data()
  } as Associado;
}

// ---- Settings (Firestore: single doc settings/site) ----
const SETTINGS_DOC_ID = 'site';

export async function getSettings(): Promise<Record<string, string>> {
  const db = getDb();
  const ref = doc(db, 'settings', SETTINGS_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  const data = snap.data();
  const out: Record<string, string> = {};
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      if (typeof v === 'string') out[k] = v;
    });
  }
  return out;
}

export async function setSettings(settings: Record<string, string>): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'settings', SETTINGS_DOC_ID);
  await setDoc(ref, settings);
}

// ---- Agendamentos Auditorio (Firestore: collection) ----

export type Agendamento = {
  id?: string;
  title: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  extendedProps: {
    solicitante: string;
    contato: string;
    email: string;
    status: 'pendente' | 'confirmado' | 'cancelado';
    observacoes?: string;
    camposContrato?: Record<string, string>; // Campos personalizados do contrato
  };
  backgroundColor: string;
};

export async function listAgendamentos(): Promise<Agendamento[]> {
  const db = getDb();
  const col = collection(db, 'agendamentos');
  const q = query(col, orderBy('start', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title,
      start: data.start,
      end: data.end,
      extendedProps: data.extendedProps || {},
      backgroundColor: data.backgroundColor || '#3788d8',
    };
  });
}

export async function getAgendamento(id: string): Promise<Agendamento | null> {
  const db = getDb();
  const ref = doc(db, 'agendamentos', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    start: data.start,
    end: data.end,
    extendedProps: data.extendedProps || {},
    backgroundColor: data.backgroundColor || '#3788d8',
  };
}

export async function createAgendamento(data: Omit<Agendamento, 'id'>): Promise<Agendamento> {
  const db = getDb();
  const col = collection(db, 'agendamentos');
  const ref = await addDoc(col, {
    title: data.title,
    start: data.start,
    end: data.end,
    extendedProps: data.extendedProps,
    backgroundColor: data.backgroundColor,
  });
  
  // Retornar o agendamento completo com o ID gerado
  return {
    id: ref.id,
    title: data.title,
    start: data.start,
    end: data.end,
    extendedProps: data.extendedProps,
    backgroundColor: data.backgroundColor,
  };
}

export async function updateAgendamento(id: string, data: Partial<Agendamento>): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'agendamentos', id);
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.start !== undefined) payload.start = data.start;
  if (data.end !== undefined) payload.end = data.end;
  if (data.extendedProps !== undefined) payload.extendedProps = data.extendedProps;
  if (data.backgroundColor !== undefined) payload.backgroundColor = data.backgroundColor;
  await updateDoc(ref, payload);
}

export async function deleteAgendamento(id: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'agendamentos', id);
  await deleteDoc(ref);
}

// Função utilitária para definir cor baseada no status
export function getCorPorStatus(status: Agendamento['extendedProps']['status']): string {
  switch (status) {
    case 'confirmado': return '#22c55e'; // verde
    case 'cancelado': return '#ef4444'; // vermelho
    case 'pendente': return '#f59e0b'; // amarelo
    default: return '#3788d8'; // azul padrão
  }
}

// Tipos para Contratos
export interface Contrato {
  id?: string;
  nome: string;
  conteudo: string;
  campos?: string[];
  imagens?: string[];
  criado_em: string;
}

// Funções para Contratos
export async function createContrato(contrato: Omit<Contrato, 'id'>) {
  const db = getFirestore();
  const docRef = await addDoc(collection(db, 'contratos'), contrato);
  return docRef.id;
}

export async function updateContrato(id: string, contrato: Partial<Contrato>) {
  const db = getFirestore();
  const docRef = doc(db, 'contratos', id);
  await updateDoc(docRef, contrato);
}

export async function deleteContrato(id: string) {
  const db = getFirestore();
  const docRef = doc(db, 'contratos', id);
  await deleteDoc(docRef);
}

export async function getContrato(id: string): Promise<Contrato | null> {
  const db = getFirestore();
  const docRef = doc(db, 'contratos', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Contrato;
  }
  return null;
}

export async function listContratos(): Promise<Contrato[]> {
  const db = getFirestore();
  const q = query(collection(db, 'contratos'), orderBy('criado_em', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Contrato[];
}

