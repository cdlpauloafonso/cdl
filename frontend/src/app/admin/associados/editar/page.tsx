'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAssociadoById, updateAssociado, type Associado } from '@/lib/firestore';
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
import { AniversariantesFormSection } from '@/components/admin/AniversariantesFormSection';

function serializeAssociadoForCompare(associado: Associado | null): string {
  if (!associado) return '';
  const { id, created_at, updated_at, ...rest } = associado;
  return JSON.stringify(rest);
}

function EditarAssociadoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id')?.trim() ?? '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(() => Boolean(searchParams.get('id')?.trim()));
  const [associado, setAssociado] = useState<Associado | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planosLoaded, setPlanosLoaded] = useState(false);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupHint, setCnpjLookupHint] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const cnpjLookupReq = useRef(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const initialSnapshotRef = useRef('');

  useEffect(() => {
    getPlanos()
      .then(setPlanos)
      .catch(() => setPlanos([]))
      .finally(() => setPlanosLoaded(true));
  }, []);

  useEffect(() => {
    if (!id) {
      setAssociado(null);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setAssociado(null);

    (async () => {
      try {
        const data = await getAssociadoById(id);
        if (cancelled) return;
        if (data) {
          setAssociado(data);
          initialSnapshotRef.current = serializeAssociadoForCompare(data);
        } else {
          setError('Associado não encontrado.');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao carregar associado:', err);
          setError('Erro ao carregar associado.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const hasUnsavedChanges =
    associado !== null && serializeAssociadoForCompare(associado) !== initialSnapshotRef.current;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleAttemptLeave = (targetHref: string) => {
    if (!hasUnsavedChanges) {
      router.push(targetHref);
      return;
    }
    setPendingLeaveHref(targetHref);
    setShowLeaveModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!associado) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { id: _, created_at, updated_at, ...updateData } = associado;
      await updateAssociado(id, updateData);
      initialSnapshotRef.current = serializeAssociadoForCompare({ ...associado, ...updateData } as Associado);
      
      // Mostrar sucesso e redirecionar
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.push(pendingRedirect || '/admin/associados');
        setPendingRedirect(null);
      }, 2000);
      
    } catch (err) {
      console.error('Erro ao atualizar associado:', err);
      setError('Erro ao atualizar associado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAssociado(prev => prev ? ({
      ...prev,
      [name]: value
    }) : null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
    let value = '';
    if (d.length === 0) value = '';
    else if (d.length <= 2) value = `(${d}`;
    else if (d.length <= 6) value = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    else if (d.length <= 10) value = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    else value = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    setAssociado((prev) => (prev ? { ...prev, telefone: value } : null));
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
    setAssociado((prev) => (prev ? { ...prev, cnpj: value } : null));
    setCnpjLookupHint(null);
  };

  const handleCnpjBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const digits = onlyDigitsCnpj(e.target.value);
    if (digits.length !== 14) return;

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

      setAssociado((prev) => {
        if (!prev) return prev;
        return {
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
          observacoes: obsApi || prev.observacoes || '',
        };
      });
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
    setAssociado(prev => prev ? ({
      ...prev,
      cep: value
    }) : null);
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-semibold text-gray-900">Associado não especificado</h2>
          <p className="mt-2 text-sm text-cdl-gray-text">
            Abra a edição a partir da lista de associados para informar qual registro deseja alterar.
          </p>
          <Link href="/admin/associados" className="mt-6 inline-block btn-primary">
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cdl-blue"></div>
          <p className="mt-4 text-cdl-gray-text">Carregando associado...</p>
        </div>
      </div>
    );
  }

  if (!associado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl text-gray-300 mb-4">😞</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Associado não encontrado</h3>
          <p className="text-cdl-gray-text mb-6">O associado que você está tentando editar não foi encontrado.</p>
          <Link href="/admin/associados" className="btn-primary">
            Voltar para Lista
          </Link>
        </div>
      </div>
    );
  }

  const planoOptions = planos.filter((p) => p.ativo || p.nome === associado.plano);
  const planoNames = new Set(planoOptions.map((p) => p.nome));
  const legacyPlano =
    planosLoaded &&
    Boolean(associado.plano) &&
    !planoNames.has(associado.plano)
      ? associado.plano
      : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/associados"
            onClick={(e) => {
              e.preventDefault();
              handleAttemptLeave('/admin/associados');
            }}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Associado</h1>
            <p className="mt-1 text-cdl-gray-text">Atualizar informações do associado</p>
          </div>
        </div>
      </div>

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

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CNPJ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CNPJ *{' '}
              <span className="font-normal text-cdl-gray-text">
                (ao completar, saia do campo para buscar na Receita)
              </span>
            </label>
            <input
              type="text"
              value={associado.cnpj}
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

          {/* Razão social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razão social
            </label>
            <input
              type="text"
              name="razao_social"
              value={associado.razao_social ?? ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
            />
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              name="nome"
              value={associado.nome}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              required
            />
          </div>

          {/* Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa * <span className="font-normal text-cdl-gray-text">(nome fantasia)</span>
            </label>
            <input
              type="text"
              name="empresa"
              value={associado.empresa}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              required
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone *
            </label>
            <input
              type="tel"
              value={associado.telefone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail *
            </label>
            <input
              type="email"
              name="email"
              value={associado.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CEP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CEP
            </label>
            <input
              type="text"
              value={associado.cep}
              onChange={handleCepChange}
              placeholder="00000-000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
            />
          </div>

          {/* Endereço */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <input
              type="text"
              name="endereco"
              value={associado.endereco}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
            />
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cidade
            </label>
            <input
              type="text"
              name="cidade"
              value={associado.cidade}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="estado"
              value={associado.estado}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plano
            </label>
            <select
              name="plano"
              value={associado.plano ?? ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
            >
              <option value="">Selecione...</option>
              {legacyPlano !== null && (
                <option value={legacyPlano}>
                  {legacyPlano} (valor atual — não está nos planos cadastrados)
                </option>
              )}
              {planoOptions.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                  {!p.ativo ? ' (inativo)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Código SPC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código SPC
            </label>
            <input
              type="text"
              name="codigo_spc"
              value={associado.codigo_spc}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AniversariantesFormSection
            idPrefix="edit-associado-aniv"
            value={associado.aniversariantes ?? []}
            onChange={(next) =>
              setAssociado((prev) => (prev ? { ...prev, aniversariantes: next } : null))
            }
          />

          {/* Observações */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={associado.observacoes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
              placeholder="Informações adicionais sobre o associado..."
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Atualizar Associado'}
          </button>
          <Link
            href="/admin/associados"
            onClick={(e) => {
              e.preventDefault();
              handleAttemptLeave('/admin/associados');
            }}
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Associado Atualizado!</h3>
              <p className="text-gray-600 mb-6">O associado foi atualizado com sucesso.</p>
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

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Deseja sair sem salvar as alterações?</h3>
            <p className="mt-2 text-sm text-cdl-gray-text">
              As mudanças feitas neste cadastro serão perdidas.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  setPendingLeaveHref(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingLeaveHref ?? '/admin/associados';
                  setShowLeaveModal(false);
                  setPendingLeaveHref(null);
                  router.push(target);
                }}
                className="rounded-lg bg-cdl-blue px-4 py-2 text-sm font-semibold text-white hover:bg-cdl-blue-dark"
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditarAssociadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cdl-blue" />
            <p className="mt-4 text-cdl-gray-text">Carregando...</p>
          </div>
        </div>
      }
    >
      <EditarAssociadoContent />
    </Suspense>
  );
}
