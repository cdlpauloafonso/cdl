import {
  associadoFormPatchFromBrasilApi,
  fetchCnpjBrasilApi,
  formatCnpjDisplay,
  onlyDigitsCnpj,
} from '@/lib/brasil-api-cnpj';
import type { Aniversariante } from '@/lib/firestore';

export type AssociadoFormCsvShape = {
  nome: string;
  empresa: string;
  razao_social: string;
  cnpj: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  cidade: string;
  estado: string;
  plano: string;
  codigo_spc: string;
  aniversariantes: Aniversariante[];
  observacoes: string;
};

const EMPTY_FORM: AssociadoFormCsvShape = {
  nome: '',
  empresa: '',
  razao_social: '',
  cnpj: '',
  telefone: '',
  email: '',
  cep: '',
  endereco: '',
  cidade: '',
  estado: '',
  plano: '',
  codigo_spc: '',
  aniversariantes: [],
  observacoes: '',
};

/** Normaliza cabeçalho para chave interna (sem acentos, minúsculas, underscores). */
function normalizeHeaderKey(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** Mapeia cabeçalho normalizado → campo do formulário. */
const HEADER_TO_FIELD: Record<string, keyof AssociadoFormCsvShape | null> = {
  cnpj: 'cnpj',
  nome: 'nome',
  nome_responsavel: 'nome',
  responsavel: 'nome',
  responsavel_legal: 'nome',
  empresa: 'empresa',
  nome_fantasia: 'empresa',
  fantasia: 'empresa',
  razao_social: 'razao_social',
  razao: 'razao_social',
  email: 'email',
  e_mail: 'email',
  telefone: 'telefone',
  tel: 'telefone',
  fone: 'telefone',
  celular: 'telefone',
  cep: 'cep',
  endereco: 'endereco',
  logradouro: 'endereco',
  endereco_completo: 'endereco',
  cidade: 'cidade',
  municipio: 'cidade',
  estado: 'estado',
  uf: 'estado',
  plano: 'plano',
  codigo_spc: 'codigo_spc',
  spc: 'codigo_spc',
  codigo_operador_spc: 'codigo_spc',
  observacoes: 'observacoes',
  observacao: 'observacoes',
  obs: 'observacoes',
};

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && c === delimiter) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

function detectDelimiter(firstLine: string): string {
  const comma = (firstLine.match(/,/g) || []).length;
  const semi = (firstLine.match(/;/g) || []).length;
  return semi >= comma ? ';' : ',';
}

export type ParsedAssociadosCsv = {
  headersRaw: string[];
  headersNormalized: string[];
  fieldKeys: (keyof AssociadoFormCsvShape | null)[];
  rows: Record<string, string>[];
};

export function parseAssociadosCsv(text: string): ParsedAssociadosCsv {
  const raw = text.replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { headersRaw: [], headersNormalized: [], fieldKeys: [], rows: [] };
  }
  const delimiter = detectDelimiter(lines[0]);
  const headerCells = parseCsvLine(lines[0], delimiter);
  const headersNormalized = headerCells.map((h) => normalizeHeaderKey(h));
  const fieldKeys = headersNormalized.map((h) => HEADER_TO_FIELD[h] ?? null);

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r], delimiter);
    const row: Record<string, string> = {};
    for (let c = 0; c < headerCells.length; c++) {
      const key = fieldKeys[c];
      if (!key) continue;
      const val = (cells[c] ?? '').trim();
      if (val) row[key] = val;
    }
    const hasAny = Object.keys(row).length > 0;
    if (hasAny) rows.push(row);
  }

  return {
    headersRaw: headerCells,
    headersNormalized,
    fieldKeys,
    rows,
  };
}

export function formatTelefoneFormMask(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCepForm(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function isBlank(s: string | undefined): boolean {
  return !s || !String(s).trim();
}

/** Aplica valores do CSV ao objeto (formata telefone, CEP, CNPJ, UF). */
export function rowRecordToFormFields(row: Record<string, string>): Partial<AssociadoFormCsvShape> {
  const out: Partial<AssociadoFormCsvShape> = {};
  if (row.cnpj) out.cnpj = formatCnpjDisplay(row.cnpj);
  if (row.nome) out.nome = row.nome.trim();
  if (row.empresa) out.empresa = row.empresa.trim();
  if (row.razao_social) out.razao_social = row.razao_social.trim();
  if (row.email) out.email = row.email.trim();
  if (row.telefone) out.telefone = formatTelefoneFormMask(row.telefone);
  if (row.cep) out.cep = formatCepForm(row.cep);
  if (row.endereco) out.endereco = row.endereco.trim();
  if (row.cidade) out.cidade = row.cidade.trim();
  if (row.estado) out.estado = row.estado.trim().toUpperCase().slice(0, 2);
  if (row.plano) out.plano = row.plano.trim();
  if (row.codigo_spc) out.codigo_spc = row.codigo_spc.trim();
  if (row.observacoes) out.observacoes = row.observacoes.trim();
  return out;
}

const STRING_FORM_KEYS: (keyof AssociadoFormCsvShape)[] = [
  'nome',
  'empresa',
  'razao_social',
  'cnpj',
  'telefone',
  'email',
  'cep',
  'endereco',
  'cidade',
  'estado',
  'plano',
  'codigo_spc',
  'observacoes',
];

function applyNonEmptyStrings(
  target: AssociadoFormCsvShape,
  patch: Record<string, string | undefined>
): void {
  for (const k of STRING_FORM_KEYS) {
    const v = patch[k as string];
    if (typeof v === 'string' && !isBlank(v)) {
      (target as unknown as Record<string, string>)[k as string] = v;
    }
  }
}

const GAP_FILL_KEYS: (keyof AssociadoFormCsvShape)[] = [
  'nome',
  'empresa',
  'razao_social',
  'cnpj',
  'telefone',
  'email',
  'cep',
  'endereco',
  'cidade',
  'estado',
  'observacoes',
];

function fillGapsFromCsv(
  merged: AssociadoFormCsvShape,
  csvFormatted: Partial<AssociadoFormCsvShape>
): void {
  for (const k of GAP_FILL_KEYS) {
    const cv = csvFormatted[k];
    if (typeof cv !== 'string' || isBlank(cv)) continue;
    if (isBlank(merged[k] as string)) {
      (merged as unknown as Record<string, string>)[k as string] = cv;
    }
  }
  const plano = csvFormatted.plano;
  if (typeof plano === 'string' && !isBlank(plano)) merged.plano = plano.trim();
  const spc = csvFormatted.codigo_spc;
  if (typeof spc === 'string' && !isBlank(spc)) merged.codigo_spc = spc.trim();
}

/**
 * Preenche o registro: primeiro consulta a Brasil API pelo CNPJ (quando válido),
 * depois completa apenas campos ainda vazios com os dados da linha do CSV
 * (plano e código SPC vêm do CSV quando informados).
 */
export async function mergeAssociadoRowWithCnpjApi(
  row: Record<string, string>
): Promise<AssociadoFormCsvShape> {
  const csvFormatted = rowRecordToFormFields(row);
  const merged: AssociadoFormCsvShape = { ...EMPTY_FORM };

  const digits = onlyDigitsCnpj(csvFormatted.cnpj || row.cnpj || '');

  if (digits.length === 14) {
    try {
      const data = await fetchCnpjBrasilApi(digits);
      const apiPatch = associadoFormPatchFromBrasilApi(data);
      applyNonEmptyStrings(merged, {
        nome: apiPatch.nome,
        empresa: apiPatch.empresa,
        razao_social: apiPatch.razao_social,
        email: apiPatch.email,
        telefone: apiPatch.telefone,
        cep: apiPatch.cep,
        endereco: apiPatch.endereco,
        cidade: apiPatch.cidade,
        estado: apiPatch.estado,
        observacoes: apiPatch.observacoes,
        cnpj: apiPatch.cnpj || formatCnpjDisplay(digits),
      });
    } catch {
      // mantém merged; CNPJ será preenchido abaixo a partir do CSV
    }
    if (isBlank(merged.cnpj)) merged.cnpj = formatCnpjDisplay(digits);
  } else if (digits.length > 0) {
    merged.cnpj = formatCnpjDisplay(digits);
  }

  fillGapsFromCsv(merged, csvFormatted);

  return merged;
}

export const CSV_TEMPLATE_HEADER =
  'cnpj;nome;empresa;razao_social;email;telefone;cep;endereco;cidade;estado;plano;codigo_spc;observacoes';

export function associadoFormCsvTemplateExampleRow(): string {
  return '00000000000191;João Silva;Empresa Exemplo LTDA;Empresa Exemplo LTDA;contato@empresa.com.br;11999998888;01310100;Avenida Paulista, 1000;São Paulo;SP;Plano Ouro;;';
}

/** Valida campos mínimos para gravar no Firestore (espelha o formulário obrigatório). */
export function validateAssociadoFormForSave(f: AssociadoFormCsvShape): string | null {
  const missing: string[] = [];
  if (isBlank(f.cnpj)) missing.push('CNPJ');
  if (isBlank(f.nome)) missing.push('Nome do responsável');
  if (isBlank(f.empresa)) missing.push('Nome da empresa');
  if (isBlank(f.telefone)) missing.push('Telefone');
  if (isBlank(f.endereco)) missing.push('Endereço');
  if (isBlank(f.cidade)) missing.push('Cidade');
  if (isBlank(f.estado)) missing.push('Estado');
  return missing.length ? missing.join(', ') : null;
}

export const IMPORT_API_DELAY_MS = 450;
