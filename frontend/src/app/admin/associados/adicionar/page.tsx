'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createAssociado, type Aniversariante } from '@/lib/firestore';
import { getPlanos, type Plano } from '@/lib/firestore-planos';
import {
  buildEnderecoLinha,
  buildObservacoesFromCnpjApi,
  fetchCnpjBrasilApi,
  formatCepFromApi,
  formatTelefoneBrasil,
  nomeFantasiaFromCnpjResponse,
  onlyDigitsCnpj,
  pickNomeResponsavel,
  tituloMunicipio,
} from '@/lib/brasil-api-cnpj';

export default function AdicionarAssociadoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
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
    aniversariantes: [] as Aniversariante[],
    observacoes: ''
  });
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupHint, setCnpjLookupHint] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const cnpjLookupReq = useRef(0);

  useEffect(() => {
    getPlanos()
      .then((list) => setPlanos(list.filter((p) => p.ativo)))
      .catch(() => setPlanos([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await createAssociado(formData);
      
      // Mostrar sucesso e redirecionar
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.push('/admin/associados');
      }, 2000);
      
    } catch (err) {
      console.error('Erro ao criar associado:', err);
      setError('Erro ao criar associado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    let value = '';
    if (d.length === 0) value = '';
    else if (d.length <= 2) value = `(${d}`;
    else if (d.length <= 6) value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    else if (d.length <= 10) value = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    else value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    setFormData((prev) => ({ ...prev, telefone: value }));
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
    let value = digits;
    if (digits.length <= 14) {
      if (digits.length <= 2) {
        value = digits;
      } else if (digits.length <= 5) {
        value = `${digits.slice(0, 2)}.${digits.slice(2)}`;
      } else if (digits.length <= 8) {
        value = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
      } else if (digits.length <= 12) {
        value = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
      } else {
        value = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
      }
    }
    setFormData((prev) => ({ ...prev, cnpj: value }));
    setCnpjLookupHint(null);
  };

  const handleCnpjBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const digits = onlyDigitsCnpj(e.target.value);
    if (digits.length !== 14) {
      return;
    }
    const req = ++cnpjLookupReq.current;
    setCnpjLookupLoading(true);
    setCnpjLookupHint(null);
    try {
      const data = await fetchCnpjBrasilApi(digits);
      if (req !== cnpjLookupReq.current) return;

      const razao = (data.razao_social || '').trim();
      const fantasia = nomeFantasiaFromCnpjResponse(data);
      const nomeResp = pickNomeResponsavel(data);
      const obsApi = buildObservacoesFromCnpjApi(data);
      const emailApi = (data.email || '').trim();
      const fone =
        formatTelefoneBrasil(data.ddd_telefone_1) ||
        formatTelefoneBrasil(data.ddd_telefone_2);
      const cepFmt = formatCepFromApi(data.cep);
      const endereco = buildEnderecoLinha(data);
      const cidade = tituloMunicipio(data.municipio || '');
      const uf = (data.uf || '').toUpperCase().slice(0, 2);

      setFormData((prev) => ({
        ...prev,
        nome: nomeResp || prev.nome,
        razao_social: razao || prev.razao_social,
        empresa: fantasia || razao || prev.empresa,
        email: emailApi || prev.email,
        telefone: fone || prev.telefone,
        cep: cepFmt || prev.cep,
        endereco: endereco || prev.endereco,
        cidade: cidade || prev.cidade,
        estado: uf || prev.estado,
        observacoes: obsApi || prev.observacoes,
      }));
      setCnpjLookupHint({
        type: 'ok',
        text: 'Dados preenchidos via Brasil API (CNPJ / Minha Receita). Revise antes de salvar.',
      });
    } catch (err) {
      if (req !== cnpjLookupReq.current) return;
      const text = err instanceof Error ? err.message : 'Não foi possível consultar o CNPJ.';
      setCnpjLookupHint({ type: 'err', text });
    } finally {
      if (req === cnpjLookupReq.current) {
        setCnpjLookupLoading(false);
      }
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
      if (value.length <= 5) {
        value = value;
      } else {
        value = `${value.slice(0, 5)}-${value.slice(5)}`;
      }
    }
    setFormData((prev) => ({ ...prev, cep: value }));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/associados"
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Adicionar Associado</h1>
            <p className="mt-1 text-cdl-gray-text">Cadastrar novo associado na CDL Paulo Afonso</p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* ...existing code... */}
          {/* Mensagem de Sucesso */}
          {showSuccessModal && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Associado salvo com sucesso!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Informações Básicas */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ *{' '}
                  <span className="font-normal text-cdl-gray-text">
                    (ao completar, saia do campo para buscar na Receita)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={handleCnpjChange}
                  onBlur={handleCnpjBlur}
                  placeholder="00.000.000/0000-00"
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  required
                />
                {cnpjLookupLoading && (
                  <p className="mt-1 text-xs text-cdl-gray-text">Consultando Brasil API…</p>
                )}
                {cnpjLookupHint && !cnpjLookupLoading && (
                  <p
                    className={`mt-1 text-xs ${
                      cnpjLookupHint.type === 'ok' ? 'text-green-800' : 'text-red-700'
                    }`}
                  >
                    {cnpjLookupHint.text}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razão social
                </label>
                <input
                  type="text"
                  name="razao_social"
                  value={formData.razao_social}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Responsável *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Empresa *{' '}
                  <span className="font-normal text-cdl-gray-text">(nome fantasia)</span>
                </label>
                <input
                  type="text"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plano
                </label>
                <select
                  value={formData.plano}
                  onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                >
                  <option value="">Selecione...</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.nome}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                {planos.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    Nenhum plano ativo. Cadastre em Associados → Planos.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações de Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código do Operador SPC
                </label>
                <input
                  type="text"
                  value={formData.codigo_spc}
                  onChange={(e) => setFormData({ ...formData, codigo_spc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  placeholder="Código SPC"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço *
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade *
                </label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>
          </div>

          {/* Aniversariantes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aniversariantes
            </label>
            <div className="space-y-2 mb-4">
              {formData.aniversariantes.map((aniversariante, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={aniversariante.nome}
                    onChange={(e) => {
                      const novosAniversariantes = [...formData.aniversariantes];
                      novosAniversariantes[index] = { ...aniversariante, nome: e.target.value };
                      setFormData({ ...formData, aniversariantes: novosAniversariantes });
                    }}
                    placeholder="Nome do aniversariante"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  />
                  <input
                    type="date"
                    value={aniversariante.data}
                    onChange={(e) => {
                      const novosAniversariantes = [...formData.aniversariantes];
                      novosAniversariantes[index] = { ...aniversariante, data: e.target.value };
                      setFormData({ ...formData, aniversariantes: novosAniversariantes });
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const novosAniversariantes = formData.aniversariantes.filter((_, i) => i !== index);
                      setFormData({ ...formData, aniversariantes: novosAniversariantes });
                    }}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, aniversariantes: [...formData.aniversariantes, { nome: '', data: '' }] });
                }}
                className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors"
              >
                + Adicionar Aniversariante
              </button>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              placeholder="Informações adicionais sobre o associado..."
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Associado'}
            </button>
            <Link
              href="/admin/associados"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
        
        {/* Modal de Sucesso */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Associado Adicionado!</h3>
                <p className="text-gray-600 mb-6">O associado foi adicionado com sucesso ao sistema.</p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 21l-1-1m0 0l-1 1m6-6V6a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2z" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
