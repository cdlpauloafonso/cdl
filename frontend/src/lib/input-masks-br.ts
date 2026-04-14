import { formatCnpjDisplay } from '@/lib/brasil-api-cnpj';

/** Máscara CPF: 000.000.000-00 (mesma lógica do cadastro de associado para telefone/CNPJ). */
export function formatCpfDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Telefone BR: (00) 0000-0000 ou (00) 00000-0000 — alinhado a `handlePhoneChange` em associados/adicionar. */
export function formatBrazilPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const MASKED_INSCRIPTION_KEYS = new Set(['cpf', 'cnpj', 'telefone', 'telefone_celular']);

export function hasInscriptionFieldMask(fieldKey: string): boolean {
  return MASKED_INSCRIPTION_KEYS.has(fieldKey);
}

export function applyInscriptionFieldMask(fieldKey: string, raw: string): string {
  switch (fieldKey) {
    case 'cpf':
      return formatCpfDisplay(raw);
    case 'cnpj':
      return formatCnpjDisplay(raw);
    case 'telefone':
    case 'telefone_celular':
      return formatBrazilPhoneDisplay(raw);
    default:
      return raw;
  }
}
