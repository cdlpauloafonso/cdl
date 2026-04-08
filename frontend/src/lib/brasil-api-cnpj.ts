/**
 * Cliente para GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}
 * Documentação: https://brasilapi.com.br/docs#tag/CNPJ
 */

const BASE_URL = 'https://brasilapi.com.br/api/cnpj/v1';

export type BrasilApiCnpjQsa = {
  nome_socio?: string;
  qualificacao_socio?: string;
};

export type BrasilApiCnpjCnaeSec = {
  codigo?: number;
  descricao?: string;
};

export type BrasilApiCnpjResponse = {
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string | null;
  email?: string | null;
  cep?: string | null;
  uf?: string | null;
  municipio?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  descricao_tipo_de_logradouro?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  ddd_fax?: string | null;
  descricao_situacao_cadastral?: string | null;
  natureza_juridica?: string | null;
  porte?: string | null;
  descricao_porte?: string | null;
  cnae_fiscal_descricao?: string | null;
  cnaes_secundarios?: BrasilApiCnpjCnaeSec[];
  qsa?: BrasilApiCnpjQsa[];
};

type ApiErrorBody = { message?: string; name?: string };

export function onlyDigitsCnpj(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14);
}

export async function fetchCnpjBrasilApi(rawCnpj: string): Promise<BrasilApiCnpjResponse> {
  const digits = onlyDigitsCnpj(rawCnpj);
  if (digits.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos.');
  }
  const res = await fetch(`${BASE_URL}/${digits}`);
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as ApiErrorBody).message || `Erro ao consultar CNPJ (${res.status}).`;
    throw new Error(msg);
  }
  return json as BrasilApiCnpjResponse;
}

/** Prioriza sócio com cargo de direção; senão o primeiro nome útil. */
export function pickNomeResponsavel(data: BrasilApiCnpjResponse): string {
  const qsa = data.qsa;
  if (!qsa?.length) return '';
  const prefer = qsa.find((s) =>
    /presidente|diretor|representante|administrador/i.test(s.qualificacao_socio || '')
  );
  const row = prefer || qsa[0];
  const nome = (row.nome_socio || '').trim();
  if (!nome || /^\*+$/.test(nome.replace(/[\s.]/g, ''))) return '';
  return nome.replace(/\s+/g, ' ');
}

export function tituloMunicipio(ufRaw: string | null | undefined): string {
  if (!ufRaw) return '';
  return ufRaw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function buildEnderecoLinha(data: BrasilApiCnpjResponse): string {
  const tipo = (data.descricao_tipo_de_logradouro || '').trim();
  const logr = (data.logradouro || '').trim();
  const num = (data.numero || '').trim();
  const compl = (data.complemento || '').trim();
  const bairro = (data.bairro || '').trim();

  const head = [tipo, logr].filter(Boolean).join(' ');
  let line = head;
  if (num) {
    line = line ? `${line}, nº ${num}` : `nº ${num}`;
  }
  if (compl) line = line ? `${line} — ${compl}` : compl;
  if (bairro) line = line ? `${line} — ${bairro}` : bairro;
  return line.trim();
}

export function formatCepFromApi(cep: string | null | undefined): string {
  const d = (cep || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Formata DDD + número para o máscara usada no formulário (celular 11 dígitos ou fixo 10). */
export function formatTelefoneBrasil(dddTelefone: string | null | undefined): string {
  const raw = (dddTelefone || '').replace(/\D/g, '');
  if (raw.length < 10) return '';
  const ddd = raw.slice(0, 2);
  const rest = raw.slice(2);
  if (rest.length <= 8) {
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

/** Nome fantasia para o campo "Nome da Empresa" (sem cair na razão social). */
export function nomeFantasiaFromCnpjResponse(data: BrasilApiCnpjResponse): string {
  return (data.nome_fantasia || '').trim();
}

/** Bloco de observações enriquecido com dados cadastrais da Receita. */
export function buildObservacoesFromCnpjApi(data: BrasilApiCnpjResponse): string {
  const lines: string[] = [];

  const sit = (data.descricao_situacao_cadastral || '').trim();
  if (sit) lines.push(`Situação Cadastral: ${sit}`);

  const nat = (data.natureza_juridica || '').trim();
  if (nat) lines.push(`Natureza Jurídica: ${nat}`);

  const porteParts = [data.descricao_porte, data.porte]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);
  const porteLine = [...new Set(porteParts)].join(' — ');
  if (porteLine) lines.push(`Porte: ${porteLine}`);

  const socios =
    data.qsa?.filter((s) => (s.nome_socio || '').replace(/\*/g, '').trim()) ?? [];
  if (socios.length) {
    lines.push('');
    lines.push('Sócios:');
    for (const s of socios) {
      const n = (s.nome_socio || '').trim();
      const q = (s.qualificacao_socio || '').trim();
      lines.push(q ? `• ${n} — ${q}` : `• ${n}`);
    }
  }

  const d1 = (data.ddd_telefone_1 || '').replace(/\D/g, '');
  const d2 = (data.ddd_telefone_2 || '').replace(/\D/g, '');
  const extras: string[] = [];
  const f2Fmt = formatTelefoneBrasil(data.ddd_telefone_2);
  if (f2Fmt && d2 && d2 !== d1) extras.push(f2Fmt);
  const faxFmt = formatTelefoneBrasil(data.ddd_fax);
  if (faxFmt) extras.push(`Fax ${faxFmt}`);
  if (extras.length) {
    lines.push('');
    lines.push(`Telefones adicionais: ${extras.join('; ')}`);
  }

  const ativ = (data.cnae_fiscal_descricao || '').trim();
  if (ativ) {
    lines.push('');
    lines.push(`Atividade Principal: ${ativ}`);
  }

  const secDesc =
    data.cnaes_secundarios
      ?.map((c) => (c.descricao || '').trim())
      .filter((d) => d.length > 0) ?? [];
  if (secDesc.length) {
    lines.push('');
    lines.push('Atividades secundárias:');
    for (const d of secDesc) lines.push(`• ${d}`);
  }

  return lines.join('\n').trim();
}
