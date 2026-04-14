'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  createEventInscription,
  getCampaign,
  isCnpjCadastradoComoAssociado,
  type Campaign,
} from '@/lib/firestore';
import {
  associadoFormPatchFromBrasilApi,
  fetchCnpjBrasilApi,
  onlyDigitsCnpj,
} from '@/lib/brasil-api-cnpj';
import { mergeInscriptionValuesFromCnpjPatch } from '@/lib/cnpj-prefill-inscription';
import {
  EXTRA_INSCRIPTION_FIELDS,
  getEffectiveRegistration,
  inscriptionFieldInputKind,
  isInscriptionFieldOptional,
  labelForInscriptionField,
  PADRAO_INSCRIPTION_FIELDS,
  sortInscriptionFieldKeys,
} from '@/lib/event-registration-fields';
import { getEffectivePayment } from '@/lib/event-payment-fields';
import {
  applyInscriptionFieldMask,
  hasInscriptionFieldMask,
} from '@/lib/input-masks-br';
import { PixPaymentPublicBlock } from '@/components/PixPaymentPublicBlock';

const PADRAO_IDS = new Set<string>(PADRAO_INSCRIPTION_FIELDS.map((f) => f.id));
const EXTRA_IDS = new Set<string>(EXTRA_INSCRIPTION_FIELDS.map((f) => f.id));

const DOC_TITLE_BASE = 'CDL Paulo Afonso';

const MSG_CNPJ_NAO_ASSOCIADO =
  'Este CNPJ não está cadastrado como associado da CDL Paulo Afonso. Somente associados podem se inscrever.';

type CnpjLookupProps = {
  loading: boolean;
  hint: { type: 'ok' | 'err'; text: string } | null;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onDirty: () => void;
};

function FieldRow({
  fieldKey,
  values,
  setValues,
  cnpjLookup,
  observationText,
}: {
  fieldKey: string;
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  cnpjLookup?: CnpjLookupProps;
  observationText?: string;
}) {
  const kind = inscriptionFieldInputKind(fieldKey);
  const label = labelForInscriptionField(fieldKey);
  const base = 'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2';

  const optional = isInscriptionFieldOptional(fieldKey);

  if (kind === 'textarea') {
    const observationHint =
      fieldKey === 'observacoes' && observationText?.trim() ? observationText.trim() : undefined;
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {optional && <span className="font-normal text-cdl-gray-text"> (opcional)</span>}
        </label>
        {observationHint && <p className="mb-1 text-xs text-cdl-gray-text">{observationHint}</p>}
        <textarea
          required={!optional}
          rows={4}
          value={values[fieldKey] ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
          placeholder={observationHint ?? (optional ? 'Informe se desejar…' : undefined)}
          className={base}
        />
      </div>
    );
  }

  const masked = hasInscriptionFieldMask(fieldKey);
  const inputType =
    kind === 'date' ? 'date' : kind === 'email' ? 'email' : masked && (fieldKey === 'telefone' || fieldKey === 'telefone_celular') ? 'tel' : 'text';

  const placeholder =
    fieldKey === 'cpf'
      ? '000.000.000-00'
      : fieldKey === 'cnpj'
        ? '00.000.000/0000-00'
        : fieldKey === 'telefone' || fieldKey === 'telefone_celular'
          ? '(00) 00000-0000'
          : undefined;

  const isCnpjApi = fieldKey === 'cnpj' && cnpjLookup;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {isCnpjApi && (
          <span className="font-normal text-cdl-gray-text block mt-1 text-xs leading-snug">
            O CNPJ precisa estar cadastrado como associado da CDL para enviar a inscrição. Ao completar 14 dígitos, saia
            do campo para consultar a Receita e preencher os dados.
          </span>
        )}
      </label>
      <input
        type={inputType}
        required={!optional}
        value={values[fieldKey] ?? ''}
        onChange={(e) => {
          if (isCnpjApi) cnpjLookup.onDirty();
          setValues((prev) => ({
            ...prev,
            [fieldKey]: masked ? applyInscriptionFieldMask(fieldKey, e.target.value) : e.target.value,
          }));
        }}
        onBlur={isCnpjApi ? cnpjLookup.onBlur : undefined}
        placeholder={placeholder}
        inputMode={
          masked && fieldKey !== 'telefone' && fieldKey !== 'telefone_celular' ? 'numeric' : undefined
        }
        className={base}
        autoComplete={kind === 'email' ? 'email' : 'off'}
      />
      {isCnpjApi && cnpjLookup.loading && (
        <p className="mt-1 text-xs text-cdl-gray-text">Consultando Brasil API…</p>
      )}
      {isCnpjApi && cnpjLookup.hint && !cnpjLookup.loading && (
        <p
          className={`mt-1 text-xs ${
            cnpjLookup.hint.type === 'ok' ? 'text-green-800' : 'text-red-700'
          }`}
        >
          {cnpjLookup.hint.text}
        </p>
      )}
    </div>
  );
}

export function EventInscriptionClient({ slug }: { slug: string }) {
  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pixStepActive, setPixStepActive] = useState(false);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupHint, setCnpjLookupHint] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [cnpjRejeitadoNaoAssociado, setCnpjRejeitadoNaoAssociado] = useState(false);
  const cnpjLookupReq = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getCampaign(slug);
        if (!mounted) return;
        setCampanha(c);
      } catch {
        if (mounted) setCampanha(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!campanha?.title) return;
    document.title = `Inscrição · ${campanha.title} | ${DOC_TITLE_BASE}`;
    return () => {
      document.title = DOC_TITLE_BASE;
    };
  }, [campanha?.title]);

  if (loading) {
    return (
      <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30 min-h-[50vh]">
        <div className="container-cdl max-w-2xl animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-40 mb-8" />
          <div className="h-48 sm:h-56 bg-gray-200 rounded-2xl mb-8" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-10" />
          <div className="h-32 bg-gray-100 rounded-xl border border-gray-200" />
        </div>
      </div>
    );
  }

  if (!campanha) notFound();

  const reg = getEffectiveRegistration(campanha);
  if (reg.kind !== 'form' || reg.keys.length === 0) notFound();

  const fieldKeys = sortInscriptionFieldKeys(reg.keys);
  const userInputKeys = fieldKeys.filter((k) => k !== 'observacoes');
  const padraoKeys = userInputKeys.filter((k) => PADRAO_IDS.has(k));
  const associadoKeys = userInputKeys.filter((k) => !PADRAO_IDS.has(k) && !EXTRA_IDS.has(k));
  const extraKeys = userInputKeys.filter((k) => EXTRA_IDS.has(k));
  const adminObservationText =
    fieldKeys.includes('observacoes') && reg.observationText?.trim()
      ? reg.observationText.trim()
      : '';
  const payment = getEffectivePayment(campanha);

  async function handleCnpjBlur(e: React.FocusEvent<HTMLInputElement>) {
    const raw = e.currentTarget.value;
    const digits = onlyDigitsCnpj(raw);
    if (digits.length !== 14) {
      setCnpjLookupHint(null);
      setCnpjRejeitadoNaoAssociado(false);
      return;
    }
    const req = ++cnpjLookupReq.current;
    setCnpjLookupLoading(true);
    setCnpjLookupHint(null);
    try {
      const isAssociado = await isCnpjCadastradoComoAssociado(raw);
      if (req !== cnpjLookupReq.current) return;
      if (!isAssociado) {
        setCnpjRejeitadoNaoAssociado(true);
        setCnpjLookupHint({ type: 'err', text: MSG_CNPJ_NAO_ASSOCIADO });
        return;
      }
      setCnpjRejeitadoNaoAssociado(false);

      const data = await fetchCnpjBrasilApi(digits);
      if (req !== cnpjLookupReq.current) return;
      const patch = associadoFormPatchFromBrasilApi(data);
      const merged = mergeInscriptionValuesFromCnpjPatch(userInputKeys, patch);
      setValues((prev) => ({ ...prev, ...merged }));
      setCnpjLookupHint({
        type: 'ok',
        text: 'Dados preenchidos via Brasil API (CNPJ / Minha Receita). Revise antes de enviar.',
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
  }

  const cnpjLookupUi: CnpjLookupProps | undefined = userInputKeys.includes('cnpj')
    ? {
        loading: cnpjLookupLoading,
        hint: cnpjLookupHint,
        onBlur: handleCnpjBlur,
        onDirty: () => {
          setCnpjLookupHint(null);
          setCnpjRejeitadoNaoAssociado(false);
        },
      }
    : undefined;

  async function validateInscriptionData(): Promise<boolean> {
    setError('');
    if (userInputKeys.includes('cnpj')) {
      const d = onlyDigitsCnpj(values.cnpj ?? '');
      if (d.length === 14) {
        const ok = await isCnpjCadastradoComoAssociado(values.cnpj ?? '');
        if (!ok) {
          setError(`${MSG_CNPJ_NAO_ASSOCIADO} Não é possível enviar a inscrição.`);
          setCnpjRejeitadoNaoAssociado(true);
          return false;
        }
      }
    }
    for (const key of userInputKeys) {
      if (isInscriptionFieldOptional(key)) continue;
      if (!values[key]?.trim()) {
        setError(`Preencha o campo: ${labelForInscriptionField(key)}`);
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = await validateInscriptionData();
    if (!valid) return;
    if (payment.kind === 'pix' && !pixStepActive) {
      setPixStepActive(true);
      return;
    }
    setSubmitting(true);
    try {
      const fields: Record<string, string> = {};
      userInputKeys.forEach((k) => {
        fields[k] = values[k]?.trim() ?? '';
      });
      await createEventInscription(slug, fields);
      setDone(true);
    } catch {
      setError('Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
        <div className="container-cdl max-w-lg text-center">
          <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-10">
            <p className="text-sm font-medium text-green-800 mb-2">Inscrição registrada</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{campanha.title}</h1>
            <p className="text-cdl-gray-text mb-6">
              Recebemos seus dados para este evento. Em breve entraremos em contato se necessário.
            </p>
            <Link href={`/institucional/campanhas/${slug}`} className="btn-primary inline-block">
              Voltar ao evento
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
      <div className="container-cdl max-w-2xl">
        <nav className="mb-8">
          <Link
            href={`/institucional/campanhas/${slug}`}
            className="text-sm text-cdl-blue hover:underline inline-flex items-center gap-1"
          >
            <span aria-hidden>←</span> Voltar ao evento
          </Link>
        </nav>

        {campanha.image && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <img src={campanha.image} alt={campanha.title} className="w-full h-48 sm:h-56 object-cover" />
          </div>
        )}

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {campanha.category && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cdl-blue text-white">{campanha.category}</span>
            )}
            {campanha.date && (
              <span className="text-sm text-cdl-gray-text flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {campanha.date}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cdl-blue mb-2">Inscrição no evento</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{campanha.title}</h1>
          {campanha.description && <p className="text-lg text-cdl-gray-text leading-relaxed">{campanha.description}</p>}
        </header>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {payment.kind === 'pix' && pixStepActive ? 'Pagamento (PIX)' : 'Preencha seus dados'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {!(payment.kind === 'pix' && pixStepActive) ? (
              <>
                {adminObservationText && (
                  <section className="rounded-lg border border-cdl-blue/20 bg-cdl-blue/5 px-4 py-3">
                    <p className="text-sm font-medium text-cdl-blue">Observações da organização</p>
                    <p className="mt-1 text-sm text-cdl-gray-text">{adminObservationText}</p>
                  </section>
                )}
                {associadoKeys.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">
                      Dados de associado
                    </h3>
                    <div className="space-y-4">
                      {associadoKeys.map((key) => (
                        <FieldRow
                          key={key}
                          fieldKey={key}
                          values={values}
                          setValues={setValues}
                          cnpjLookup={key === 'cnpj' ? cnpjLookupUi : undefined}
                          observationText={reg.kind === 'form' ? reg.observationText : undefined}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {padraoKeys.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">
                      Cadastro padrão
                    </h3>
                    <div className="space-y-4">
                      {padraoKeys.map((key) => (
                        <FieldRow
                          key={key}
                          fieldKey={key}
                          values={values}
                          setValues={setValues}
                          observationText={reg.kind === 'form' ? reg.observationText : undefined}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {extraKeys.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">
                      Complementar
                    </h3>
                    <div className="space-y-4">
                      {extraKeys.map((key) => (
                        <FieldRow
                          key={key}
                          fieldKey={key}
                          values={values}
                          setValues={setValues}
                          observationText={reg.kind === 'form' ? reg.observationText : undefined}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <section className="space-y-4">
                <p className="text-sm text-cdl-gray-text">
                  Dados validados. Confira as instruções de pagamento abaixo e, após realizar o pagamento, confirme para
                  concluir sua inscrição.
                </p>
                {payment.observationText && (
                  <div className="rounded-lg border border-cdl-blue/20 bg-cdl-blue/5 px-4 py-3">
                    <p className="text-sm font-medium text-cdl-blue">Observação da organização</p>
                    <p className="mt-1 text-sm text-cdl-gray-text">{payment.observationText}</p>
                  </div>
                )}
                <PixPaymentPublicBlock payment={payment} className="mt-2" />
              </section>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              {payment.kind === 'pix' && pixStepActive && (
                <button
                  type="button"
                  onClick={() => setPixStepActive(false)}
                  disabled={submitting}
                  className="btn-secondary"
                >
                  Voltar e revisar dados
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || (userInputKeys.includes('cnpj') && cnpjRejeitadoNaoAssociado)}
                className="btn-primary w-full sm:w-auto min-w-[200px]"
              >
                {submitting
                  ? 'Enviando...'
                  : payment.kind === 'pix'
                    ? pixStepActive
                      ? 'Confirmar pagamento e enviar inscrição'
                      : 'Validar dados e ir para pagamento PIX'
                    : 'Confirmar inscrição'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
