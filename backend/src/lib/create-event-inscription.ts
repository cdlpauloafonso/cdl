import { getCampaignDoc, type CampaignDoc } from './inscription-firestore.js';
import { getAdminFirestore } from './firebase-admin.js';

export const REGISTRATION_CLOSED_ERROR = 'REGISTRATION_CLOSED';
export const INSCRIPTION_LIMIT_REACHED_ERROR = 'INSCRIPTION_LIMIT_REACHED';
export const CPF_ALREADY_REGISTERED_ERROR = 'CPF_ALREADY_REGISTERED';

function requireDb() {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  return db;
}

function parseInscriptionLimit(cfg: CampaignDoc['registrationConfig']): number | null {
  if (!cfg || cfg.type !== 'form') return null;
  const raw = (cfg as { inscriptionLimit?: unknown }).inscriptionLimit;
  if (typeof raw === 'number' && raw > 0) return Math.floor(raw);
  if (typeof raw === 'string' && /^[1-9]\d*$/.test(raw)) return parseInt(raw, 10);
  return null;
}

function normalizeCpfDigits(fields: Record<string, string>): string | null {
  const digits = String(fields.cpf ?? '').replace(/\D/g, '').slice(0, 11);
  return digits.length === 11 ? digits : null;
}

function eventRequiresUniqueCpf(camp: CampaignDoc): boolean {
  const cfg = camp.registrationConfig;
  if (!cfg || cfg.type !== 'form') return false;
  const mode = (cfg as { documentMode?: string }).documentMode;
  const keys = (cfg as { fieldKeys?: string[] }).fieldKeys ?? [];
  if (mode === 'cpf_allowed') return keys.includes('cpf');
  if (mode === 'cnpj_only') return false;
  return keys.includes('cpf') && !keys.includes('cnpj');
}

async function countInscriptions(campaignId: string): Promise<number> {
  const db = requireDb();
  const snap = await db
    .collection('campaigns')
    .doc(campaignId)
    .collection('inscricoes')
    .get();
  return snap.size;
}

/** Alinha contador legado (regras Firestore antigas no Firebase). */
async function syncLegacyWebCount(campaignId: string): Promise<void> {
  const db = requireDb();
  const count = await countInscriptions(campaignId);
  await db.collection('campaigns').doc(campaignId).set({ inscriptionWebCount: count }, { merge: true });
}

/**
 * Cria inscrição pública via Admin SDK (ignora regras do cliente).
 * Usado pelo site quando NEXT_PUBLIC_API_URL está configurada.
 */
export async function createPublicEventInscription(
  campaignId: string,
  fields: Record<string, string>,
  options?: { voucherCode?: string; allowUnpublished?: boolean },
): Promise<string> {
  const camp = await getCampaignDoc(campaignId);
  if (!camp) throw new Error('CAMPAIGN_NOT_FOUND');
  if (camp.published === false && !options?.allowUnpublished) {
    throw new Error('CAMPAIGN_NOT_PUBLISHED');
  }
  if (camp.registrationClosed === true) {
    throw new Error(REGISTRATION_CLOSED_ERROR);
  }
  const cfg = camp.registrationConfig;
  if (!cfg || cfg.type !== 'form') {
    throw new Error('CAMPAIGN_REGISTRATION_NOT_FORM');
  }

  const limit = parseInscriptionLimit(cfg);
  const actual = limit != null ? await countInscriptions(campaignId) : 0;
  if (!options?.allowUnpublished && limit != null && actual >= limit) {
    throw new Error(INSCRIPTION_LIMIT_REACHED_ERROR);
  }

  const db = requireDb();
  const inscricoesCol = db.collection('campaigns').doc(campaignId).collection('inscricoes');
  const inscRef = inscricoesCol.doc();
  const createdAt = new Date().toISOString();

  const record: Record<string, unknown> = {
    createdAt,
    fields,
  };
  const voucher = options?.voucherCode?.trim().toUpperCase().replace(/\s+/g, '');
  if (voucher) record.voucherCode = voucher;

  const cpfDigits = eventRequiresUniqueCpf(camp) ? normalizeCpfDigits(fields) : null;

  if (cpfDigits) {
    const cpfRef = db
      .collection('campaigns')
      .doc(campaignId)
      .collection('inscricoesByCpf')
      .doc(cpfDigits);

    await db.runTransaction(async (tx) => {
      const cpfSnap = await tx.get(cpfRef);
      if (cpfSnap.exists) {
        const linkedId = String(cpfSnap.data()?.inscriptionId ?? '').trim();
        if (linkedId) {
          const linkedSnap = await tx.get(inscricoesCol.doc(linkedId));
          if (linkedSnap.exists) {
            throw new Error(CPF_ALREADY_REGISTERED_ERROR);
          }
          tx.delete(cpfRef);
        } else {
          tx.delete(cpfRef);
        }
      }
      tx.set(cpfRef, { inscriptionId: inscRef.id, createdAt });
      tx.set(inscRef, record);
    });
  } else {
    await inscRef.set(record);
  }

  await syncLegacyWebCount(campaignId);
  return inscRef.id;
}
