import type { Campaign, InscriptionDocumentMode } from './firestore';
import { parseInscriptionWebCountField, parsePositiveInscriptionLimit } from './inscription-limit';

export type { InscriptionDocumentMode };

export function labelInscriptionDocumentMode(mode: InscriptionDocumentMode): string {
  return mode === 'cnpj_only' ? 'Apenas CNPJ' : 'Permitir inscrição com CPF';
}

/** Compatível com eventos antigos sem `documentMode` no Firestore. */
export function resolveInscriptionDocumentMode(cfg: {
  fieldKeys?: string[];
  documentMode?: InscriptionDocumentMode;
}): InscriptionDocumentMode {
  if (cfg.documentMode === 'cnpj_only' || cfg.documentMode === 'cpf_allowed') {
    return cfg.documentMode;
  }
  return cfg.fieldKeys?.includes('cnpj') ? 'cnpj_only' : 'cpf_allowed';
}

/** Etapa inicial de validação de CNPJ (quando o campo CNPJ está no formulário). */
export function needsCnpjInscriptionStep(_documentMode: InscriptionDocumentMode, fieldKeys: string[]): boolean {
  return fieldKeys.includes('cnpj');
}

/** Atalho «Inscrever com CPF» na etapa de validação (config «Permitir inscrição com CPF»). */
export function canOfferInscricaoComCpf(documentMode: InscriptionDocumentMode, fieldKeys: string[]): boolean {
  return documentMode === 'cpf_allowed' && fieldKeys.includes('cpf');
}

/** Monta o mapa `fields` enviado ao Firestore (somente chaves preenchidas; CNPJ/CPF só dígitos). */
export function buildEventInscriptionFieldsPayload(
  keys: string[],
  values: Record<string, string>,
  options: { viaCpf?: boolean; documentMode?: InscriptionDocumentMode }
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const key of keys) {
    if (options.viaCpf && key === 'cnpj' && !values.cnpj?.trim()) continue;
    if (options.documentMode === 'cpf_allowed' && key === 'cnpj' && !values.cnpj?.trim()) continue;
    const raw = values[key]?.trim() ?? '';
    if (!raw) continue;
    if (key === 'cpf' || key === 'cnpj') {
      const digits = raw.replace(/\D/g, '');
      const normalized = key === 'cpf' ? digits.slice(0, 11) : digits.slice(0, 14);
      if (!normalized) continue;
      fields[key] = normalized;
    } else {
      fields[key] = raw;
    }
  }
  return fields;
}

/** Campos alinhados ao cadastro de associados (admin) — subconjunto para inscrição em eventos. */
export const ASSOCIADO_INSCRIPTION_FIELDS = [
  { id: 'cnpj', label: 'CNPJ' },
  { id: 'nome', label: 'Nome do responsável' },
  { id: 'empresa', label: 'Empresa (nome fantasia)' },
  { id: 'razao_social', label: 'Razão social' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'email', label: 'E-mail' },
  { id: 'cep', label: 'CEP' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'estado', label: 'Estado (UF)' },
] as const;

/** Campos de cadastro padrão (pessoa física / dados pessoais). */
export const PADRAO_INSCRIPTION_FIELDS = [
  { id: 'cpf', label: 'CPF' },
  { id: 'nome_responsavel', label: 'Nome do Representante' },
  { id: 'data_nascimento', label: 'Data de nascimento' },
  { id: 'telefone_celular', label: 'Celular / WhatsApp' },
  { id: 'email_pessoal', label: 'E-mail pessoal' },
] as const;

/** Campos opcionais / complementares (habilitar no admin por evento). */
export const EXTRA_INSCRIPTION_FIELDS = [{ id: 'observacoes', label: 'Observações' }] as const;

export type AssociadoInscriptionFieldId = (typeof ASSOCIADO_INSCRIPTION_FIELDS)[number]['id'];
export type PadraoInscriptionFieldId = (typeof PADRAO_INSCRIPTION_FIELDS)[number]['id'];
export type ExtraInscriptionFieldId = (typeof EXTRA_INSCRIPTION_FIELDS)[number]['id'];

/** Campos removidos da configuração — mantidos só para exibir inscrições antigas. */
const LEGACY_INSCRIPTION_LABELS: Record<string, string> = {
  plano: 'Plano de interesse',
  codigo_spc: 'Código SPC',
  rg: 'RG',
};

export function labelForInscriptionField(id: string): string {
  const e = EXTRA_INSCRIPTION_FIELDS.find((x) => x.id === id);
  if (e) return e.label;
  const a = ASSOCIADO_INSCRIPTION_FIELDS.find((x) => x.id === id);
  if (a) return a.label;
  const p = PADRAO_INSCRIPTION_FIELDS.find((x) => x.id === id);
  if (p) return p.label;
  return LEGACY_INSCRIPTION_LABELS[id] ?? id;
}

const ASSOCIADO_FIELD_IDS = new Set<string>(ASSOCIADO_INSCRIPTION_FIELDS.map((f) => f.id));

/** Campo de empresa / associado (não é cadastro padrão nem complementar). */
export function isEmpresaInscriptionFieldKey(id: string): boolean {
  if (id === 'observacoes') return false;
  if (ASSOCIADO_FIELD_IDS.has(id)) return true;
  const inPadrao = PADRAO_INSCRIPTION_FIELDS.some((f) => f.id === id);
  const inExtra = EXTRA_INSCRIPTION_FIELDS.some((f) => f.id === id);
  return !inPadrao && !inExtra;
}

/** Campos exibidos no formulário vêm só de `fieldKeys`; obrigatórios ao enviar, exceto empresa no fluxo CPF. */
export function isInscriptionFieldOptional(
  id: string,
  options?: { inscricaoViaCpf?: boolean }
): boolean {
  return Boolean(options?.inscricaoViaCpf && isEmpresaInscriptionFieldKey(id));
}

/** Tipo de controle na página pública de inscrição. */
export function inscriptionFieldInputKind(id: string): 'email' | 'date' | 'textarea' | 'text' {
  if (id === 'observacoes') return 'textarea';
  if (id === 'data_nascimento') return 'date';
  if (id === 'email' || id === 'email_pessoal') return 'email';
  return 'text';
}

const INSCRIPTION_FIELD_ORDER: string[] = [
  ...PADRAO_INSCRIPTION_FIELDS.map((f) => f.id),
  ...ASSOCIADO_INSCRIPTION_FIELDS.map((f) => f.id),
  ...EXTRA_INSCRIPTION_FIELDS.map((f) => f.id),
];

/** Ordem estável na página pública: primeiro cadastro padrão, depois associado; demais ao final. */
export function sortInscriptionFieldKeys(keys: string[]): string[] {
  const rank = (id: string) => {
    const i = INSCRIPTION_FIELD_ORDER.indexOf(id);
    return i === -1 ? 1000 + id.charCodeAt(0) : i;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b));
}

export type EffectiveRegistration =
  | { kind: 'none' }
  | { kind: 'external'; url: string }
  | { kind: 'form'; keys: string[]; documentMode: InscriptionDocumentMode; observationText?: string };

/** Une `registrationConfig` e legado `registrationUrl`. */
/** Limite positivo configurado no admin, ou `null` se não houver teto. */
export function getInscriptionLimit(c: Pick<Campaign, 'registrationConfig'>): number | null {
  const cfg = c.registrationConfig;
  if (cfg?.type !== 'form') return null;
  return parsePositiveInscriptionLimit(cfg.inscriptionLimit);
}

/** Limite de inscrições atingido (usa `inscriptionWebCount` no documento da campanha). */
export function isInscriptionSoldOut(
  c: Pick<Campaign, 'registrationConfig' | 'inscriptionWebCount'>
): boolean {
  const limit = getInscriptionLimit(c);
  if (limit == null) return false;
  const count = parseInscriptionWebCountField(c.inscriptionWebCount);
  return count >= limit;
}

/** Evento publicado, com inscrição configurada, não encerrada pelo admin e sem esgotar vagas. */
export function isEventInscriptionOpen(
  c: Pick<
    Campaign,
    'registrationConfig' | 'registrationUrl' | 'registrationClosed' | 'inscriptionWebCount' | 'published'
  >
): boolean {
  if (c.published === false) return false;
  if (c.registrationClosed === true) return false;
  const reg = getEffectiveRegistration(c);
  if (reg.kind === 'none') return false;
  if (reg.kind === 'form' && isInscriptionSoldOut(c)) return false;
  return true;
}

export function getEffectiveRegistration(
  c: Pick<Campaign, 'registrationConfig' | 'registrationUrl' | 'registrationClosed'>,
  options?: { ignoreRegistrationClosed?: boolean }
): EffectiveRegistration {
  if (c.registrationClosed && !options?.ignoreRegistrationClosed) return { kind: 'none' };
  const cfg = c.registrationConfig;
  if (cfg?.type === 'external' && cfg.url?.trim()) return { kind: 'external', url: cfg.url.trim() };
  if (cfg?.type === 'form' && cfg.fieldKeys?.length) {
    const observationText = cfg.observationText?.trim();
    return {
      kind: 'form',
      keys: [...cfg.fieldKeys],
      documentMode: resolveInscriptionDocumentMode(cfg),
      ...(observationText ? { observationText } : {}),
    };
  }
  if (c.registrationUrl?.trim()) return { kind: 'external', url: c.registrationUrl.trim() };
  return { kind: 'none' };
}

export function hrefForExternalRegistration(url: string) {
  const t = url.trim();
  if (!t) return '#';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}
