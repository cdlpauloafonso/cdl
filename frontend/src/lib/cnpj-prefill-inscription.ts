import type { AssociadoFormPatchFromApi } from '@/lib/brasil-api-cnpj';
import { applyInscriptionFieldMask, hasInscriptionFieldMask } from '@/lib/input-masks-br';

/**
 * Mapeia cada chave de inscrição (evento) para o campo correspondente no retorno
 * `associadoFormPatchFromBrasilApi` (mesma base do cadastro de associado).
 */
const INSCRIPTION_FIELD_TO_PATCH: Partial<Record<string, keyof AssociadoFormPatchFromApi>> = {
  cnpj: 'cnpj',
  nome: 'nome',
  empresa: 'empresa',
  razao_social: 'razao_social',
  email: 'email',
  telefone: 'telefone',
  cep: 'cep',
  endereco: 'endereco',
  cidade: 'cidade',
  estado: 'estado',
  observacoes: 'observacoes',
  nome_responsavel: 'nome',
  telefone_celular: 'telefone',
  email_pessoal: 'email',
};

/**
 * Valores a mesclar no formulário de inscrição, apenas para chaves que o admin habilitou.
 * Campos sem dado na API (ex.: CPF, data de nascimento) são ignorados.
 */
export function mergeInscriptionValuesFromCnpjPatch(
  fieldKeys: string[],
  patch: AssociadoFormPatchFromApi
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const key of fieldKeys) {
    const patchKey = INSCRIPTION_FIELD_TO_PATCH[key];
    if (!patchKey) continue;
    const raw = patch[patchKey];
    const v = typeof raw === 'string' ? raw.trim() : '';
    if (!v) continue;
    out[key] = hasInscriptionFieldMask(key) ? applyInscriptionFieldMask(key, v) : v;
  }

  return out;
}
