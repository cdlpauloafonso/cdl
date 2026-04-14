'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createAssociado,
  createAssociadoFromImport,
  getAssociados,
  updateAssociado,
  type Aniversariante,
  type Associado,
} from '@/lib/firestore';
import { getPlanos, type Plano } from '@/lib/firestore-planos';
import { associadoFormPatchFromBrasilApi, fetchCnpjBrasilApi, onlyDigitsCnpj } from '@/lib/brasil-api-cnpj';
import {
  IMPORT_API_DELAY_MS,
  mergeAssociadoRowWithCnpjApi,
  parseAssociadosCsv,
  CSV_TEMPLATE_HEADER,
  associadoFormCsvTemplateExampleRow,
} from '@/lib/associados-csv-import';

export default function AdicionarAssociadoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    status: 'ativo' as 'ativo' | 'desativado' | 'em_negociacao',
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
    observacoes: ''
  });
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupHint, setCnpjLookupHint] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const cnpjLookupReq = useRef(0);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<Record<string, string>[] | null>(null);
  const [csvError, setCsvError] = useState('');
  const [csvApplyLoading, setCsvApplyLoading] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<{
    ok: number;
    errors: { line: number; msg: string }[];
  } | null>(null);

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
      const msg = err instanceof Error ? err.message : 'Erro ao criar associado. Tente novamente.';
      setError(msg);
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

  const handleResponsavelPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    let value = '';
    if (d.length === 0) value = '';
    else if (d.length <= 2) value = `(${d}`;
    else if (d.length <= 6) value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    else if (d.length <= 10) value = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    else value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    setFormData((prev) => ({ ...prev, telefone_responsavel: value }));
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

  const downloadCsvTemplate = () => {
    const body = `${CSV_TEMPLATE_HEADER}\n${associadoFormCsvTemplateExampleRow()}`;
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'associados-modelo.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCsvError('');
    setBulkImportResult(null);
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseAssociadosCsv(text);
      if (parsed.rows.length === 0) {
        setCsvRows(null);
        setCsvError('Nenhuma linha de dados encontrada no CSV (verifique cabeçalhos e separador ; ou ,).');
        return;
      }
      setCsvRows(parsed.rows);
    } catch {
      setCsvRows(null);
      setCsvError('Não foi possível ler o arquivo. Use UTF-8 e separador ; ou ,.');
    }
    e.target.value = '';
  };

  const aplicarPrimeiraLinhaCsv = async () => {
    if (!csvRows?.length) return;
    setCsvApplyLoading(true);
    setCsvError('');
    setBulkImportResult(null);
    try {
      const merged = await mergeAssociadoRowWithCnpjApi(csvRows[0]);
      setFormData((prev) => ({
        ...prev,
        ...merged,
        aniversariantes: merged.aniversariantes?.length ? merged.aniversariantes : prev.aniversariantes,
      }));
      setCnpjLookupHint({
        type: 'ok',
        text: 'Linha 1 do CSV aplicada: dados da Receita (CNPJ) quando possível; o restante veio do arquivo. Revise antes de salvar.',
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Falha ao processar a linha do CSV.';
      setCsvError(text);
    } finally {
      setCsvApplyLoading(false);
    }
  };

  const importarTodasLinhasCsv = async () => {
    if (!csvRows?.length) return;
    const ok = window.confirm(
      `Importar ${csvRows.length} linha(s) para o cadastro? Cada CNPJ válido será consultado na Brasil API; isso pode levar alguns minutos.`
    );
    if (!ok) return;

    setBulkImporting(true);
    setBulkImportResult(null);
    setCsvError('');
    const errors: { line: number; msg: string }[] = [];
    let success = 0;
    const existentes = await getAssociados();
    const existentesByCnpj = new Map<string, Associado>();
    existentes.forEach((a) => {
      const digits = onlyDigitsCnpj(a.cnpj || '');
      if (digits.length === 14) existentesByCnpj.set(digits, a);
    });

    for (let i = 0; i < csvRows.length; i++) {
      const lineNo = i + 2;
      try {
        const merged = await mergeAssociadoRowWithCnpjApi(csvRows[i]);
        const digits = onlyDigitsCnpj(merged.cnpj || '');
        const existente = digits.length === 14 ? existentesByCnpj.get(digits) : undefined;

        if (existente) {
          const confirmarAtualizacao = window.confirm(
            `Linha ${lineNo}: já existe associado com este CNPJ (${existente.empresa || existente.nome}). Deseja atualizar esse cadastro com os dados do CSV?`
          );
          if (confirmarAtualizacao) {
            const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...base } = existente;
            await updateAssociado(existente.id, {
              ...base,
              ...merged,
            });
            success++;
            existentesByCnpj.set(digits, { ...existente, ...merged });
          } else {
            errors.push({ line: lineNo, msg: 'CNPJ já existente (não atualizado por escolha do usuário).' });
          }
          continue;
        }

        const newId = await createAssociadoFromImport(merged);
        if (digits.length === 14) {
          existentesByCnpj.set(digits, {
            id: newId,
            ...merged,
            created_at: new Date(),
            updated_at: new Date(),
          } as Associado);
        }
        success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar.';
        errors.push({ line: lineNo, msg });
      }
      if (i < csvRows.length - 1) {
        await new Promise((r) => setTimeout(r, IMPORT_API_DELAY_MS));
      }
    }

    setBulkImportResult({ ok: success, errors });
    setBulkImporting(false);
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

      {/* Importação CSV */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Importar CSV</h2>
        <p className="text-sm text-cdl-gray-text mb-4">
          Com CNPJ de 14 dígitos, os dados são buscados na Brasil API (Receita). Campos que a API não
          preencher são completados com as colunas do arquivo. Plano e código SPC usam o CSV quando
          informados.
        </p>
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvFileChange}
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Escolher arquivo CSV
          </button>
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            Baixar modelo
          </button>
          <button
            type="button"
            disabled={!csvRows?.length || csvApplyLoading || bulkImporting}
            onClick={() => void aplicarPrimeiraLinhaCsv()}
            className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark text-sm disabled:opacity-50"
          >
            {csvApplyLoading ? 'Aplicando…' : 'Preencher formulário com a linha 1'}
          </button>
          <button
            type="button"
            disabled={!csvRows?.length || bulkImporting || csvApplyLoading}
            onClick={() => void importarTodasLinhasCsv()}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm disabled:opacity-50"
          >
            {bulkImporting ? 'Importando…' : 'Importar todas as linhas'}
          </button>
        </div>
        {csvError && (
          <p className="text-sm text-red-700 mb-2">{csvError}</p>
        )}
        {csvRows && csvRows.length > 0 && (
          <p className="text-sm text-gray-700 mb-2">
            <strong>{csvRows.length}</strong> linha(s) carregada(s). A primeira linha de dados corresponde
            ao arquivo (após o cabeçalho).
          </p>
        )}
        {bulkImportResult && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-medium text-gray-900">
              Importação em lote: <span className="text-green-800">{bulkImportResult.ok}</span> salvo(s).
            </p>
            {bulkImportResult.errors.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-red-800 space-y-1">
                {bulkImportResult.errors.map((e, idx) => (
                  <li key={idx}>
                    Linha {e.line}: {e.msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  Telefone do responsável
                </label>
                <input
                  type="tel"
                  value={formData.telefone_responsavel}
                  onChange={handleResponsavelPhoneChange}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
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
                    setFormData({ ...formData, data_nascimento_responsavel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
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
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'ativo' | 'desativado' | 'em_negociacao',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                >
                  <option value="ativo">Ativo</option>
                  <option value="desativado">Desativado</option>
                  <option value="em_negociacao">Em negociação</option>
                </select>
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
                  Telefone Empresa *
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade de funcionários
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.quantidade_funcionarios}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantidade_funcionarios: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  placeholder="Ex.: 15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
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
