import { getApps } from 'firebase/app';
import { onlyDigitsCnpj } from './brasil-api-cnpj';
import { parseInscriptionWebCountField, parsePositiveInscriptionLimit } from './inscription-limit';
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
  serverTimestamp,
  runTransaction,
  writeBatch,
  deleteField,
  query,
  orderBy,
  where,
  limit,
  getCountFromServer,
  increment,
} from 'firebase/firestore';

export function getDb() {
  if (typeof window === 'undefined') throw new Error('Firestore is client-side only');
  initFirebase();
  return getFirestore();
}

/** ISO string a partir de string, Timestamp do Firestore ou { seconds }. */
function isoFromFirestoreDate(v: unknown): string {
  if (v == null || v === '') return new Date().toISOString();
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof v === 'object' && v !== null && typeof (v as { seconds?: number }).seconds === 'number') {
    return new Date((v as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

function millisFromFirestore(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'string') return new Date(v).getTime() || 0;
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof v === 'object' && v !== null && typeof (v as { seconds?: number }).seconds === 'number') {
    return (v as { seconds: number }).seconds * 1000;
  }
  return 0;
}

/** Inscrição em evento: link externo ou formulário com campos do cadastro de associados. */
export type CampaignRegistrationConfig =
  | { type: 'external'; url: string }
  | {
      type: 'form';
      fieldKeys: string[];
      observationText?: string;
      associadosOnly?: boolean;
      /** Máximo de inscrições aceitas pelo site; ausente ou inválido = sem limite. */
      inscriptionLimit?: number;
    };

/** PIX manual: imagem (ex.: QR no ImgBB) + código copia e cola. */
export type CampaignPaymentConfig = {
  pixImageUrl?: string;
  pixCopyPaste?: string;
  pixObservationText?: string;
};

export type Campaign = {
  id?: string;
  createdAt?: string;
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
  /** Preferencial. Legado: só `registrationUrl`. */
  registrationConfig?: CampaignRegistrationConfig;
  /** @deprecated usar registrationConfig.type === 'external' */
  registrationUrl?: string;
  /** Pagamento PIX opcional (eventos). */
  paymentConfig?: CampaignPaymentConfig;
  /**
   * Contador público de inscrições pelo site (só incrementa quando há limite configurado).
   * Usado para exibir «ingressos esgotados» sem listar a subcoleção.
   */
  inscriptionWebCount?: number;
  /** Controle manual no admin para ocultar inscrição pública do evento. */
  registrationClosed?: boolean;
};

/** Informativos: comunicados e avisos importantes */
export type Informativo = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  titulo: string;
  descricao: string;
  tipo: 'sistema' | 'aviso' | 'manutencao' | 'evento';
  status: 'ativo' | 'inativo' | 'agendado';
  data_publicacao?: string;
  data_expiracao?: string;
  autor?: string;
};

export async function getInformativos(maxResults = 10): Promise<Informativo[]> {
  const db = getDb();
  const col = collection(db, 'informativos');
  // Só `where` evita índice composto (status + createdAt). Ordenação e limite no cliente.
  const q = query(col, where('status', '==', 'ativo'));
  const snap = await getDocs(q);
  const items = snap.docs.map(
    (docSnap) =>
      ({
        id: docSnap.id,
        ...docSnap.data(),
      }) as Informativo
  );
  items.sort((a, b) => millisFromFirestore(b.createdAt) - millisFromFirestore(a.createdAt));
  return items.slice(0, maxResults);
}

export async function listCampaigns(): Promise<Campaign[]> {
  const db = getDb();
  const col = collection(db, 'campaigns');
  const q = query(col, orderBy('title'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id }));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const db = getDb();
  const ref = doc(db, 'campaigns', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...(snap.data() as any), id: snap.id };
}

export async function createCampaign(data: Campaign) {
  const db = getDb();
  const col = collection(db, 'campaigns');
  // remove undefined fields to avoid Firestore errors
  const payload: Record<string, any> = { createdAt: data.createdAt ?? new Date().toISOString() };
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) payload[k] = v;
  });
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function listCampaignsByCreatedAtDesc(): Promise<Campaign[]> {
  const db = getDb();
  const col = collection(db, 'campaigns');
  const snap = await getDocs(col);
  return snap.docs
    .map((d) => ({ ...(d.data() as any), id: d.id }))
    .sort((a, b) => {
      // Mais recentes primeiro (mesma ideia da lista de notícias por publishedAt).
      const ma = millisFromFirestore(a.createdAt);
      const mb = millisFromFirestore(b.createdAt);
      if (ma !== mb) return mb - ma;
      return (a.title || '').localeCompare(b.title || '', 'pt-BR');
    });
}

export async function updateCampaign(
  id: string,
  data: Partial<Omit<Campaign, 'registrationUrl' | 'registrationConfig' | 'paymentConfig'>> & {
    registrationUrl?: string | null;
    registrationConfig?: CampaignRegistrationConfig | null;
    paymentConfig?: CampaignPaymentConfig | null;
  }
) {
  const db = getDb();
  const ref = doc(db, 'campaigns', id);
  const payload: Record<string, any> = {};
  Object.entries(data as Record<string, any>).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v === null && (k === 'registrationConfig' || k === 'registrationUrl' || k === 'paymentConfig')) {
      payload[k] = deleteField();
      return;
    }
    if (k === 'registrationUrl' && v === '') {
      payload[k] = deleteField();
    } else {
      payload[k] = v;
    }
  });
  await updateDoc(ref, payload as any);
}

/** Inscrição em `campaigns/{campaignId}/inscricoes/{docId}` (o id do evento é o caminho). */
export type EventInscriptionPaymentStatus = 'pending' | 'paid';

export type EventInscriptionRecord = {
  createdAt: string;
  /** Valores preenchidos (chaves = ids dos campos configurados). */
  fields: Record<string, string>;
  paymentStatus?: EventInscriptionPaymentStatus;
};

/** Limite atingido (UI e transação). */
export const INSCRIPTION_LIMIT_REACHED_ERROR = 'INSCRIPTION_LIMIT_REACHED';

/** Inscrição encerrada pelo admin (`registrationClosed`). */
export const REGISTRATION_CLOSED_ERROR = 'REGISTRATION_CLOSED';

/** Erro de transação / permissão ao incrementar contador (mensagem pode vir encapsulada pelo SDK). */
export function isInscriptionLimitReachedError(err: unknown): boolean {
  if (err instanceof Error && err.message === INSCRIPTION_LIMIT_REACHED_ERROR) return true;
  const s = err instanceof Error ? err.message : String(err);
  if (s.includes(INSCRIPTION_LIMIT_REACHED_ERROR)) return true;
  return false;
}

export function isRegistrationClosedError(err: unknown): boolean {
  if (err instanceof Error && err.message === REGISTRATION_CLOSED_ERROR) return true;
  const s = err instanceof Error ? err.message : String(err);
  if (s.includes(REGISTRATION_CLOSED_ERROR)) return true;
  return false;
}

export async function createEventInscription(campaignId: string, fields: Record<string, string>): Promise<string> {
  const db = getDb();
  const campaignRef = doc(db, 'campaigns', campaignId);
  const inscricoesCol = collection(db, 'campaigns', campaignId, 'inscricoes');

  return runTransaction(db, async (transaction) => {
    const campSnap = await transaction.get(campaignRef);
    if (!campSnap.exists()) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }
    const camp = campSnap.data() as Campaign;
    if (camp.registrationClosed === true) {
      throw new Error(REGISTRATION_CLOSED_ERROR);
    }
    const cfg = camp.registrationConfig;
    const limit =
      cfg?.type === 'form' ? parsePositiveInscriptionLimit(cfg.inscriptionLimit) : null;

    const current = parseInscriptionWebCountField(camp.inscriptionWebCount);

    if (limit != null && current >= limit) {
      throw new Error(INSCRIPTION_LIMIT_REACHED_ERROR);
    }

    const newInscRef = doc(inscricoesCol);
    transaction.set(newInscRef, {
      createdAt: new Date().toISOString(),
      fields,
    } satisfies EventInscriptionRecord);

    // increment(1) é atômico no servidor (evita erro de “current + 1” no cliente).
    if (limit != null) {
      transaction.update(campaignRef, { inscriptionWebCount: increment(1) });
    }

    return newInscRef.id;
  });
}

/** Lista inscrições de um evento (painel admin / relatórios). */
export async function listEventInscriptions(campaignId: string): Promise<(EventInscriptionRecord & { id: string })[]> {
  const db = getDb();
  const col = collection(db, 'campaigns', campaignId, 'inscricoes');
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as EventInscriptionRecord) }));
}

export async function updateEventInscriptionPaymentStatus(
  campaignId: string,
  inscriptionId: string,
  status: EventInscriptionPaymentStatus
): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'campaigns', campaignId, 'inscricoes', inscriptionId);
  await updateDoc(ref, { paymentStatus: status });
}

export async function updateEventInscriptionFields(
  campaignId: string,
  inscriptionId: string,
  fields: Record<string, string>
): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'campaigns', campaignId, 'inscricoes', inscriptionId);
  await updateDoc(ref, { fields });
}

export async function deleteEventInscription(campaignId: string, inscriptionId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'campaigns', campaignId, 'inscricoes', inscriptionId);
  await deleteDoc(ref);
}

export async function countEventInscriptions(campaignId: string): Promise<number> {
  const db = getDb();
  const col = collection(db, 'campaigns', campaignId, 'inscricoes');
  const snap = await getCountFromServer(col);
  return snap.data().count;
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
  // Com `published`: só `where` evita índice composto (published + publishedAt). Ordenação no cliente.
  const q = onlyPublished
    ? query(col, where('published', '==', true))
    : query(col, orderBy('publishedAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => {
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
      publishedAt: isoFromFirestoreDate(data.publishedAt),
      createdAt: isoFromFirestoreDate(data.createdAt ?? data.publishedAt),
    };
  });
  if (onlyPublished) {
    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return items.slice(0, limitCount);
  }
  return items;
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
  photoLink?: string | null;
  buttons: CarouselButton[];
  order: number;
  /** true = visível no site; false = oculto/desabilitado */
  enabled?: boolean;
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
      photoLink: data.photoLink ?? null,
      buttons: Array.isArray(data.buttons) ? data.buttons : [],
      order: data.order ?? 0,
      enabled: data.enabled !== false,
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
    photoLink: data?.photoLink ?? null,
    buttons: Array.isArray(data?.buttons) ? data.buttons : [],
    order: data?.order ?? 0,
    enabled: data?.enabled !== false,
  };
}

export async function createCarouselSlide(data: Omit<CarouselSlide, 'id'>): Promise<string> {
  const db = getDb();
  const col = collection(db, 'carousel');
  const payload = {
    title: data.title,
    description: data.description,
    photo: data.photo ?? null,
    photoLink: data.photoLink ?? null,
    buttons: data.buttons ?? [],
    order: data.order ?? 0,
    enabled: data.enabled !== false,
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
  if (data.photoLink !== undefined) payload.photoLink = data.photoLink;
  if (data.buttons !== undefined) payload.buttons = data.buttons;
  if (data.order !== undefined) payload.order = data.order;
  if (data.enabled !== undefined) payload.enabled = data.enabled;
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

/** Índice público: id = 14 dígitos do CNPJ; permite checar inscrição sem expor `associados`. */
const ASSOCIADOS_CNPJ_INDEX = 'associadosCnpjIndex';

async function setAssociadoCnpjIndex(digits: string): Promise<void> {
  if (digits.length !== 14) return;
  const db = getDb();
  await setDoc(doc(db, ASSOCIADOS_CNPJ_INDEX, digits), { updatedAt: serverTimestamp() });
}

async function removeAssociadoCnpjIndex(digits: string): Promise<void> {
  if (digits.length !== 14) return;
  const db = getDb();
  try {
    await deleteDoc(doc(db, ASSOCIADOS_CNPJ_INDEX, digits));
  } catch {
    /* doc pode não existir */
  }
}

async function syncAssociadosCnpjIndexBatch(cnpjs: string[]): Promise<void> {
  if (cnpjs.length === 0) return;
  const db = getDb();
  const uniqueDigits = Array.from(new Set(cnpjs.map((c) => onlyDigitsCnpj(c)).filter((d) => d.length === 14)));
  if (uniqueDigits.length === 0) return;

  const chunkSize = 450; // abaixo do limite de 500 writes por batch
  for (let i = 0; i < uniqueDigits.length; i += chunkSize) {
    const chunk = uniqueDigits.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((digits) => {
      batch.set(doc(db, ASSOCIADOS_CNPJ_INDEX, digits), { updatedAt: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  }
}

/** Leitura pública (regras Firestore): retorna true se o CNPJ está na base de associados. */
export async function isCnpjCadastradoComoAssociado(cnpjRaw: string): Promise<boolean> {
  const d = onlyDigitsCnpj(cnpjRaw);
  if (d.length !== 14) return false;
  const db = getDb();
  const snap = await getDoc(doc(db, ASSOCIADOS_CNPJ_INDEX, d));
  return snap.exists();
}

// ---- Associados (Firestore: collection) ----
export type Aniversariante = {
  nome: string;
  data: string;
};

export type Associado = {
  id: string;
  status?: 'ativo' | 'desativado' | 'em_negociacao';
  origem?: 'site' | 'admin';
  nome: string;
  empresa: string;
  /** Razão social (cadastro Receita); opcional em documentos antigos. */
  razao_social?: string;
  /** Nome fantasia (compatibilidade com registros antigos). */
  nome_fantasia?: string;
  cnpj: string;
  telefone: string;
  /** Opcional: telefone direto do responsável. */
  telefone_responsavel?: string;
  /** Opcional: data de nascimento do responsável. */
  data_nascimento_responsavel?: string;
  email: string;
  /** Opcional: quantidade de funcionários informada no cadastro. */
  quantidade_funcionarios?: string;
  cep: string;
  endereco: string;
  cidade: string;
  estado: string;
  plano: string;
  codigo_spc: string;
  aniversariantes: Aniversariante[];
  observacoes: string;
  created_at: any;
  updated_at: any;
};

export type SolicitacaoAssociacao = {
  status?: 'em_negociacao' | 'ativo' | 'desativado';
  nome: string;
  empresa: string;
  razao_social?: string;
  cnpj: string;
  telefone: string;
  telefone_responsavel?: string;
  data_nascimento_responsavel?: string;
  email: string;
  quantidade_funcionarios?: string;
  cep: string;
  endereco: string;
  cidade: string;
  estado: string;
  plano: string;
  codigo_spc: string;
  aniversariantes: Aniversariante[];
  observacoes: string;
};

export async function getProximosAniversariantes(limit = 10): Promise<{ nome: string; empresa: string; data: string }[]> {
  const db = getDb();
  const col = collection(db, 'associados');
  const snap = await getDocs(col);
  
  const hoje = new Date();
  const proximosAniversariantes: { nome: string; empresa: string; data: string; diasAte: number }[] = [];
  
  snap.docs.forEach(doc => {
    const associado = doc.data() as Associado;
    if (associado.aniversariantes && associado.aniversariantes.length > 0) {
      associado.aniversariantes.forEach(aniversariante => {
        if (!aniversariante.data?.trim()) return;
        
        let dataAniversario: Date;
        const dataStr = aniversariante.data.trim();
        
        // Tentar diferentes formatos de data
        if (dataStr.includes('/')) {
          // Formato DD/MM ou DD/MM/YYYY
          const partes = dataStr.split('/');
          const dia = parseInt(partes[0]);
          const mes = parseInt(partes[1]) - 1; // Mês em JavaScript é 0-11
          const ano = partes[2] ? parseInt(partes[2]) : hoje.getFullYear();
          dataAniversario = new Date(ano, mes, dia);
        } else if (dataStr.includes('-')) {
          // Formato ISO YYYY-MM-DD
          dataAniversario = new Date(dataStr);
        } else {
          // Tentar parse direto
          dataAniversario = new Date(dataStr);
        }
        
        // Verificar se a data é válida
        if (isNaN(dataAniversario.getTime())) return;
        
        // Ajustar para o ano atual se não especificado
        if (dataStr.split('/').length === 2) {
          dataAniversario.setFullYear(hoje.getFullYear());
        }
        
        // Se o aniversário já passou este ano, considerar para o próximo ano
        if (dataAniversario < hoje) {
          dataAniversario.setFullYear(hoje.getFullYear() + 1);
        }
        
        // Calcular dias até o aniversário
        const diasAte = Math.ceil((dataAniversario.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        
        // Incluir apenas aniversários dos próximos 90 dias
        if (diasAte >= 0 && diasAte <= 90) {
          proximosAniversariantes.push({
            nome: aniversariante.nome,
            empresa: associado.razao_social || associado.nome_fantasia || 'Empresa',
            data: dataAniversario.toLocaleDateString('pt-BR'),
            diasAte
          });
        }
      });
    }
  });
  
  // Ordenar por proximidade do aniversário
  proximosAniversariantes.sort((a, b) => a.diasAte - b.diasAte);
  
  return proximosAniversariantes.slice(0, limit).map(({ diasAte, ...rest }) => rest);
}

// Funções para categorias do Livro Caixa
export type CategoriaLivroCaixa = {
  id: string;
  nome: string;
  descricao?: string;
  created_at: any;
  updated_at: any;
};

export async function getCategoriasLivroCaixa(): Promise<CategoriaLivroCaixa[]> {
  const db = getDb();
  const col = collection(db, 'categorias_livro_caixa');
  const q = query(col, orderBy('nome', 'asc'));
  const snap = await getDocs(q);
  const list = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CategoriaLivroCaixa));
  return list;
}

export async function createCategoriaLivroCaixa(data: Omit<CategoriaLivroCaixa, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const db = getDb();
  const col = collection(db, 'categorias_livro_caixa');
  const newRef = doc(col);
  const now = new Date();
  
  await setDoc(newRef, {
    ...data,
    created_at: now,
    updated_at: now
  });
  
  return newRef.id;
}

export async function updateCategoriaLivroCaixa(id: string, data: Partial<Omit<CategoriaLivroCaixa, 'id' | 'created_at'>>): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'categorias_livro_caixa', id);
  
  await updateDoc(ref, {
    ...data,
    updated_at: new Date()
  });
}

export async function deleteCategoriaLivroCaixa(id: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'categorias_livro_caixa', id);
  
  await deleteDoc(ref);
}

// Funções para transações do Livro Caixa
export type TransacaoLivroCaixa = {
  id: string;
  data: string; // formato DD/MM/YYYY
  descricao: string;
  categoria: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  metodo_pagamento: 'pix' | 'cartao' | 'dinheiro';
  status: 'confirmado' | 'pendente';
  created_at: any;
  updated_at: any;
};

export async function getTransacoesLivroCaixa(): Promise<TransacaoLivroCaixa[]> {
  const db = getDb();
  const col = collection(db, 'transacoes_livro_caixa');
  const q = query(col, orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  const list = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TransacaoLivroCaixa));
  return list;
}

export async function createTransacaoLivroCaixa(data: Omit<TransacaoLivroCaixa, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const db = getDb();
  const col = collection(db, 'transacoes_livro_caixa');
  const newRef = doc(col);
  const now = new Date();
  
  // Validações de segurança
  if (!data.descricao?.trim()) {
    throw new Error('Descrição é obrigatória');
  }
  if (!data.categoria?.trim()) {
    throw new Error('Categoria é obrigatória');
  }
  if (typeof data.valor !== 'number' || data.valor <= 0) {
    throw new Error('Valor deve ser um número positivo');
  }
  if (!['entrada', 'saida'].includes(data.tipo)) {
    throw new Error('Tipo deve ser "entrada" ou "saida"');
  }
  if (!['pix', 'cartao', 'dinheiro'].includes(data.metodo_pagamento)) {
    throw new Error('Método de pagamento inválido');
  }
  if (!['confirmado', 'pendente'].includes(data.status)) {
    throw new Error('Status inválido');
  }
  if (!data.data?.trim() || !/^\d{2}\/\d{2}\/\d{4}$/.test(data.data)) {
    throw new Error('Data deve estar no formato DD/MM/YYYY');
  }
  
  await setDoc(newRef, {
    ...data,
    created_at: now,
    updated_at: now
  });
  
  return newRef.id;
}

export async function updateTransacaoLivroCaixa(id: string, data: Partial<Omit<TransacaoLivroCaixa, 'id' | 'created_at'>>): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'transacoes_livro_caixa', id);
  
  // Validações de segurança para atualização
  if (data.valor !== undefined && (typeof data.valor !== 'number' || data.valor <= 0)) {
    throw new Error('Valor deve ser um número positivo');
  }
  if (data.tipo !== undefined && !['entrada', 'saida'].includes(data.tipo)) {
    throw new Error('Tipo deve ser "entrada" ou "saida"');
  }
  if (data.metodo_pagamento !== undefined && !['pix', 'cartao', 'dinheiro'].includes(data.metodo_pagamento)) {
    throw new Error('Método de pagamento inválido');
  }
  if (data.status !== undefined && !['confirmado', 'pendente'].includes(data.status)) {
    throw new Error('Status inválido');
  }
  if (data.data !== undefined && (!data.data?.trim() || !/^\d{2}\/\d{2}\/\d{4}$/.test(data.data))) {
    throw new Error('Data deve estar no formato DD/MM/YYYY');
  }
  
  await updateDoc(ref, {
    ...data,
    updated_at: new Date()
  });
}

export async function deleteTransacaoLivroCaixa(id: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'transacoes_livro_caixa', id);
  
  await deleteDoc(ref);
}

// Função auxiliar para converter valor monetário formatado para número
export function converterValorMonetario(valorFormatado: string): number {
  if (!valorFormatado || typeof valorFormatado !== 'string') {
    throw new Error('Valor monetário inválido');
  }
  
  // Remover R$, espaços e pontos, substituir vírgula por ponto
  const numeros = valorFormatado
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const valor = parseFloat(numeros);
  
  if (isNaN(valor) || valor <= 0) {
    throw new Error('Valor deve ser um número positivo');
  }
  
  return valor;
}

export async function getAssociados(): Promise<Associado[]> {
  const db = getDb();
  const col = collection(db, 'associados');
  const q = query(col, orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  const list = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Associado));
  return list;
}

export async function createAssociado(data: Omit<Associado, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const db = getDb();
  const digits = onlyDigitsCnpj(data.cnpj);
  if (digits.length !== 14) {
    throw new Error('CNPJ inválido. Informe os 14 dígitos.');
  }
  const col = collection(db, 'associados');
  const newRef = doc(col);
  const indexRef = doc(db, ASSOCIADOS_CNPJ_INDEX, digits);

  await runTransaction(db, async (tx) => {
    const idx = await tx.get(indexRef);
    if (idx.exists()) {
      throw new Error('Já existe um associado cadastrado com este CNPJ.');
    }
    tx.set(newRef, {
      ...data,
      status: data.status ?? 'ativo',
      created_at: new Date(),
      updated_at: new Date(),
    });
    tx.set(indexRef, { updatedAt: serverTimestamp() });
  });

  return newRef.id;
}

/**
 * Fluxo de importação CSV: permite salvar mesmo com CNPJ vazio/inválido.
 * Quando o CNPJ tiver 14 dígitos, mantém as mesmas validações da criação padrão.
 */
export async function createAssociadoFromImport(
  data: Omit<Associado, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const digits = onlyDigitsCnpj(data.cnpj);
  if (digits.length === 14) {
    return createAssociado(data);
  }

  const db = getDb();
  const col = collection(db, 'associados');
  const docRef = await addDoc(col, {
    ...data,
    status: data.status ?? 'ativo',
    created_at: new Date(),
    updated_at: new Date(),
  });
  return docRef.id;
}

export async function updateAssociado(id: string, data: Partial<Omit<Associado, 'id' | 'created_at'>>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, 'associados', id);
  let prevCnpjDigits = '';
  if (data.cnpj !== undefined) {
    const prevSnap = await getDoc(docRef);
    if (prevSnap.exists() && prevSnap.data()?.cnpj) {
      prevCnpjDigits = onlyDigitsCnpj(String(prevSnap.data().cnpj));
    }
  }
  await updateDoc(docRef, {
    ...data,
    updated_at: new Date()
  });
  if (data.cnpj !== undefined) {
    const newDigits = onlyDigitsCnpj(data.cnpj);
    if (prevCnpjDigits.length === 14 && prevCnpjDigits !== newDigits) {
      await removeAssociadoCnpjIndex(prevCnpjDigits);
    }
    if (newDigits.length === 14) {
      await setAssociadoCnpjIndex(newDigits);
    }
  }
}

export async function deleteAssociado(id: string): Promise<void> {
  const prev = await getAssociadoById(id);
  const db = getDb();
  if (prev?.cnpj) {
    const d = onlyDigitsCnpj(prev.cnpj);
    if (d.length === 14) {
      await removeAssociadoCnpjIndex(d);
    }
  }
  await deleteDoc(doc(db, 'associados', id));
}

export async function createSolicitacaoAssociacao(data: SolicitacaoAssociacao): Promise<string> {
  const db = getDb();
  const col = collection(db, 'solicitacoesAssociacao');
  const payload = {
    ...data,
    status: data.status ?? 'em_negociacao',
    created_at: new Date(),
    updated_at: new Date(),
    origem: 'site',
  };
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function createAssociadoFromSite(
  data: Omit<Associado, 'id' | 'created_at' | 'updated_at' | 'status' | 'origem'>
): Promise<string> {
  const db = getDb();
  const col = collection(db, 'associados');
  const ref = await addDoc(col, {
    ...data,
    status: 'em_negociacao',
    origem: 'site',
    created_at: new Date(),
    updated_at: new Date(),
  });
  return ref.id;
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
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;
let settingsCache: { value: Record<string, string>; expiresAt: number } | null = null;
let settingsInFlight: Promise<Record<string, string>> | null = null;

export async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (settingsCache && settingsCache.expiresAt > now) {
    return settingsCache.value;
  }
  if (settingsInFlight) {
    return settingsInFlight;
  }

  settingsInFlight = (async () => {
  const db = getDb();
  const ref = doc(db, 'settings', SETTINGS_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    settingsCache = { value: {}, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
    return {};
  }
  const data = snap.data();
  const out: Record<string, string> = {};
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      if (typeof v === 'string') out[k] = v;
    });
  }
    settingsCache = { value: out, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
  return out;
  })();
  try {
    return await settingsInFlight;
  } finally {
    settingsInFlight = null;
  }
}

export async function setSettings(settings: Record<string, string>): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'settings', SETTINGS_DOC_ID);
  await setDoc(ref, settings);
  settingsCache = { value: settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
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
  rodape?: string;
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

