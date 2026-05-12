'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { associadoFormPatchFromBrasilApi, fetchCnpjBrasilApi, onlyDigitsCnpj } from '@/lib/brasil-api-cnpj';
import {
  createAssociadoFromSite,
  isCnpjCadastradoComoAssociado,
  type Aniversariante,
} from '@/lib/firestore';

export type MeAssociarFormProps = {
  /** «Voltar para Associe-se» e estado concluído / cancelar (ex.: web `/associe-se`, app `/m/…/associe-se`). */
  associeIndexHref?: string;
  /** Com `MobileWebSubPageChrome`: sem título/link duplicados no topo. */
  embeddedInMobileShell?: boolean;
};

export function MeAssociarForm({
  associeIndexHref = '/associe-se',
  embeddedInMobileShell = false,
}: MeAssociarFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupHint, setCnpjLookupHint] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [cnpjJaAssociado, setCnpjJaAssociado] = useState(false);
  const cnpjLookupReq = useRef(0);
  const [formData, setFormData] = useState({
    status: 'em_negociacao' as 'em_negociacao',
    nome: '',
    empresa: '',
    razao_social: '',
    cnpj: '',
    telefone: '',
    telefone_responsavel: '',
    data_nascimento_responsavel: '',
    email: '',
    quantidade_funcionarios: '',
    cep: '',
    endereco: '',
    cidade: '',
    estado: '',
    plano: '',
    codigo_spc: '',
    aniversariantes: [] as Aniversariante[],
    observacoes: '',
  });

  const handlePhoneChange = (field: 'telefone' | 'telefone_responsavel', raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 11);
    let value = '';
    if (d.length === 0) value = '';
    else if (d.length <= 2) value = `(${d}`;
    else if (d.length <= 6) value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    else if (d.length <= 10) value = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    else value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCnpjChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 14);
    let value = digits;
    if (digits.length <= 2) value = digits;
    else if (digits.length <= 5) value = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    else if (digits.length <= 8) value = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    else if (digits.length <= 12)
      value = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    else
      value = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    setFormData((prev) => ({ ...prev, cnpj: value }));
    setCnpjLookupHint(null);
    setCnpjJaAssociado(false);
  };

  const handleCnpjBlur = async (value: string) => {
    const digits = onlyDigitsCnpj(value);
    if (digits.length !== 14) return;
    const req = ++cnpjLookupReq.current;
    setCnpjLookupLoading(true);
    setCnpjLookupHint(null);
    try {
      const jaAssociado = await isCnpjCadastradoComoAssociado(digits);
      if (req !== cnpjLookupReq.current) return;
      if (jaAssociado) {
        setCnpjJaAssociado(true);
        setCnpjLookupHint({
          type: 'err',
          text: 'Este CNPJ já está cadastrado como associado. Não é possível enviar um novo cadastro.',
        });
        return;
      }
      setCnpjJaAssociado(false);

      const data = await fetchCnpjBrasilApi(digits);
      if (req !== cnpjLookupReq.current) return;
      const patch = associadoFormPatchFromBrasilApi(data);
      setFormData((prev) => ({
        ...prev,
        nome: patch.nome || prev.nome,
        razao_social: patch.razao_social || prev.razao_social,
        empresa: patch.empresa || prev.empresa,
        email: patch.email || prev.email,
        telefone: patch.telefone || prev.telefone,
        cep: patch.cep || prev.cep,
        endereco: patch.endereco || prev.endereco,
        cidade: patch.cidade || prev.cidade,
        estado: patch.estado || prev.estado,
        observacoes: patch.observacoes || prev.observacoes,
        cnpj: patch.cnpj || prev.cnpj,
      }));
      setCnpjLookupHint({
        type: 'ok',
        text: 'Dados preenchidos via Brasil API. Revise antes de enviar.',
      });
    } catch (err) {
      if (req !== cnpjLookupReq.current) return;
      const text = err instanceof Error ? err.message : 'Não foi possível consultar o CNPJ.';
      setCnpjLookupHint({ type: 'err', text });
    } finally {
      if (req === cnpjLookupReq.current) setCnpjLookupLoading(false);
    }
  };

  const handleCepChange = (raw: string) => {
    let value = raw.replace(/\D/g, '').slice(0, 8);
    if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
    setFormData((prev) => ({ ...prev, cep: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (cnpjJaAssociado) {
        setError('Este CNPJ já está cadastrado como associado. O envio foi bloqueado.');
        return;
      }
      const digits = onlyDigitsCnpj(formData.cnpj);
      if (digits.length === 14) {
        const exists = await isCnpjCadastradoComoAssociado(digits);
        if (exists) {
          setCnpjJaAssociado(true);
          setCnpjLookupHint({
            type: 'err',
            text: 'Este CNPJ já está cadastrado como associado. Não é possível enviar um novo cadastro.',
          });
          setError('Este CNPJ já está cadastrado como associado. O envio foi bloqueado.');
          return;
        }
      }
      await createAssociadoFromSite(formData);
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível enviar sua solicitação agora.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {!embeddedInMobileShell ? (
        <>
          <Link
            href={associeIndexHref}
            prefetch={false}
            className="text-sm text-cdl-blue hover:underline mb-4 inline-block"
          >
            ← Voltar para Associe-se
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Me associar</h1>
          <p className="mt-2 text-cdl-gray-text">
            Preencha seu cadastro para iniciar sua proposta de associação. Nossa equipe vai analisar e entrar em contato.
          </p>
        </>
      ) : null}

      {done ? (
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="text-sm font-semibold text-green-800">Solicitação enviada com sucesso!</p>
          <p className="mt-1 text-sm text-green-900">
            Recebemos seus dados. Em breve nossa equipe entrará em contato.
          </p>
          <Link href={associeIndexHref} prefetch={false} className="btn-primary mt-4 inline-block">
            Voltar
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-6 ${embeddedInMobileShell ? 'mt-2' : 'mt-6'}`}
        >
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ * <span className="font-normal text-cdl-gray-text">(consulta automática na Receita)</span>
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  onBlur={(e) => void handleCnpjBlur(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                  required
                />
                {cnpjLookupLoading && <p className="mt-1 text-xs text-cdl-gray-text">Consultando CNPJ...</p>}
                {cnpjLookupHint && !cnpjLookupLoading && (
                  <p className={`mt-1 text-xs ${cnpjLookupHint.type === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                    {cnpjLookupHint.text}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razão social</label>
                <input
                  type="text"
                  value={formData.razao_social}
                  onChange={(e) => setFormData((prev) => ({ ...prev, razao_social: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do responsável *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone do responsável</label>
                <input
                  type="tel"
                  value={formData.telefone_responsavel}
                  onChange={(e) => handlePhoneChange('telefone_responsavel', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de nascimento do responsável
                </label>
                <input
                  type="date"
                  value={formData.data_nascimento_responsavel}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, data_nascimento_responsavel: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa *</label>
                <input
                  type="text"
                  value={formData.empresa}
                  onChange={(e) => setFormData((prev) => ({ ...prev, empresa: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone da empresa *</label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handlePhoneChange('telefone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de funcionários</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.quantidade_funcionarios}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantidade_funcionarios: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço *</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endereco: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cidade: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                <input
                  type="text"
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, estado: e.target.value.toUpperCase().slice(0, 2) }))
                  }
                  placeholder="BA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitting || cnpjJaAssociado}
              className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar cadastro'}
            </button>
            <Link
              href={associeIndexHref}
              prefetch={false}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
