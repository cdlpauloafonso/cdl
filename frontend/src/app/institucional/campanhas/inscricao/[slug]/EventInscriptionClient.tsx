'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  createEventInscription,
  CPF_ALREADY_REGISTERED_ERROR,
  getCampaign,
  getEventInscription,
  getEventInscriptionByCpf,
  isCpfAlreadyRegisteredForEvent,
  isCpfAlreadyRegisteredError,
  getSettings,
  isInscriptionLimitReachedError,
  isRegistrationClosedError,
  isFirestorePermissionDenied,
  INSCRIPTION_PERMISSION_DENIED_ERROR,
  isCnpjCadastradoComoAssociado,
  type Campaign,
  type EventInscriptionRecord,
} from '@/lib/firestore';
import {
  associadoFormPatchFromBrasilApi,
  fetchCnpjBrasilApi,
  onlyDigitsCnpj,
} from '@/lib/brasil-api-cnpj';
import { mergeInscriptionValuesFromCnpjPatch } from '@/lib/cnpj-prefill-inscription';
import {
  EXTRA_INSCRIPTION_FIELDS,
  buildEventInscriptionFieldsPayload,
  getEffectiveRegistration,
  isInscriptionSoldOut,
  inscriptionFieldInputKind,
  isEmpresaInscriptionFieldKey,
  isInscriptionFieldOptional,
  labelForInscriptionField,
  canOfferInscricaoComCpf,
  eventRequiresUniqueCpfInscription,
  needsCnpjInscriptionStep,
  PADRAO_INSCRIPTION_FIELDS,
  sortInscriptionFieldKeys,
  inscriptionDisplayLabel,
} from '@/lib/event-registration-fields';
import { formatPaymentAmountBrl, getEffectivePayment } from '@/lib/event-payment-fields';
import {
  resolveInscriptionChargeAmount,
  type InscriptionPaymentTier,
} from '@/lib/inscription-payment-amount';
import { normalizeVoucherCodeInput } from '@/lib/event-vouchers-admin';
import { resolveVoucherForCharge } from '@/lib/event-voucher-utils';
import {
  createAsaasInscriptionPayment,
  type CreateInscriptionPaymentResponse,
  type InscriptionCardHolderPrefill,
} from '@/lib/asaas-api';
import {
  applyInscriptionFieldMask,
  hasInscriptionFieldMask,
} from '@/lib/input-masks-br';
import { PixPaymentPublicBlock } from '@/components/PixPaymentPublicBlock';
import {
  isInscriptionPaymentConfirmed,
  normalizeInscriptionPaymentStatus,
} from '@/lib/inscription-payment-status';
import { isGratisPaymentAmount } from '@/lib/inscription-payment-gratis';
import { AsaasInscriptionCheckout } from '@/components/AsaasInscriptionCheckout';
import { formatEventDateForDisplay } from '@/lib/event-datetime';
import { isCurrentUserAdmin } from '@/lib/admin-auth';
import { CampaignDraftPreviewBanner } from '@/components/CampaignDraftPreviewBanner';
import { CampaignPreviewAccessDenied } from '@/components/CampaignPreviewAccessDenied';
import { EventInscriptionCheckInQr } from '@/components/event-credentialing/EventInscriptionCheckInQr';
import { EventExistingInscriptionCheckIn } from '@/components/event-credentialing/EventExistingInscriptionCheckIn';
import { campaignInscriptionResumeUrl } from '@/lib/campaign-preview';
import { initFirebase } from '@/lib/firebase';

const PADRAO_IDS = new Set<string>(PADRAO_INSCRIPTION_FIELDS.map((f) => f.id));
const EXTRA_IDS = new Set<string>(EXTRA_INSCRIPTION_FIELDS.map((f) => f.id));

const DOC_TITLE_BASE = 'CDL Paulo Afonso';

const MSG_CNPJ_NAO_ASSOCIADO =
  'Este CNPJ não está cadastrado como associado da CDL Paulo Afonso. Somente associados podem se inscrever.';
const WHATSAPP_STORAGE_KEY = 'cdl_whatsapp_number';

function formatWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function inscriptionSubmitErrorMessage(err: unknown): string {
  if (isInscriptionLimitReachedError(err)) {
    return 'Ingressos esgotados. O limite de inscrições para este evento foi atingido.';
  }
  if (isRegistrationClosedError(err)) {
    return 'As inscrições para este evento foram encerradas.';
  }
  if (
    isFirestorePermissionDenied(err) ||
    (err instanceof Error && err.message === INSCRIPTION_PERMISSION_DENIED_ERROR)
  ) {
    return 'Não foi possível registrar a inscrição (permissão negada). Tente novamente em alguns minutos ou fale com a CDL.';
  }
  if (!(err instanceof Error)) {
    return 'Não foi possível enviar. Tente novamente.';
  }
  const msg = err.message;
  if (msg === 'CUSTOMER_DOCUMENT_REQUIRED') {
    return 'Informe CPF ou CNPJ válido no formulário para gerar o link de pagamento.';
  }
  if (
    msg.includes('Asaas não configurado') ||
    msg === 'ASAAS_NOT_CONFIGURED' ||
    msg === 'ASAAS_PAYMENT_INCOMPLETE'
  ) {
    return 'Pagamento online indisponível no momento. Entre em contato com a CDL.';
  }
  if (msg === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
    return 'Pagamento online temporariamente indisponível (servidor). Entre em contato com a CDL.';
  }
  if (msg === 'CAMPAIGN_NOT_FOUND' || msg === 'INSCRIPTION_NOT_FOUND') {
    return 'Não foi possível concluir o pagamento. Tente enviar novamente ou fale com a CDL.';
  }
  if (msg === 'VOUCHER_INVALID') return 'Código de voucher inválido.';
  if (msg === 'VOUCHER_INACTIVE') return 'Este voucher está inativo.';
  if (msg === 'VOUCHER_EXPIRED') return 'Este voucher expirou.';
  if (msg === 'VOUCHER_EXHAUSTED') return 'Este voucher atingiu o limite de utilizações.';
  if (msg === 'ASAAS_PIX_QR_UNAVAILABLE') {
    return 'Não foi possível gerar o QR Code PIX. Tente novamente ou use outra forma de pagamento.';
  }
  if (msg === 'CAMPAIGN_NOT_PUBLISHED') {
    return 'Este evento ainda não está publicado. Faça login como administrador para testar a inscrição em rascunho.';
  }
  if (msg === CPF_ALREADY_REGISTERED_ERROR) {
    return 'Este CPF já possui inscrição neste evento. Cada CPF pode se inscrever apenas uma vez.';
  }
  if (msg.includes('Não foi possível gerar o link') || msg.includes('servidor de pagamento')) {
    return msg;
  }
  if (msg.length > 0 && msg.length < 200 && !msg.startsWith('CAMPAIGN_')) {
    return msg;
  }
  return 'Não foi possível enviar. Tente novamente.';
}

function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits[i]) * (10 - i);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits[i]) * (11 - i);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;
  return secondDigit === Number(digits[10]);
}

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
  inscricaoAssociadosOnly,
  inscricaoViaCpf,
}: {
  fieldKey: string;
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  cnpjLookup?: CnpjLookupProps;
  observationText?: string;
  /** Evento restrito a associados (configuração do admin). */
  inscricaoAssociadosOnly?: boolean;
  inscricaoViaCpf?: boolean;
}) {
  const kind = inscriptionFieldInputKind(fieldKey);
  const label = labelForInscriptionField(fieldKey);
  const base = 'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2';

  const optional = isInscriptionFieldOptional(fieldKey, { inscricaoViaCpf });

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
        {optional && <span className="font-normal text-cdl-gray-text"> (opcional)</span>}
        {isCnpjApi && (
          <span className="font-normal text-cdl-gray-text block mt-1 text-xs leading-snug">
            {inscricaoAssociadosOnly
              ? 'O CNPJ precisa estar cadastrado como associado da CDL para enviar a inscrição. Ao completar 14 dígitos, saia do campo para consultar a Receita e preencher os dados.'
              : 'Ao completar 14 dígitos, saia do campo para validar o CNPJ na Receita Federal e preencher os dados automaticamente. Neste evento não é obrigatório ser associado da CDL.'}
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

function cardHolderPrefillFromInscription(values: Record<string, string>): InscriptionCardHolderPrefill {
  const name =
    values.nome_responsavel?.trim() ||
    values.nome?.trim() ||
    values.empresa?.trim() ||
    '';
  const email = values.email_pessoal?.trim() || values.email?.trim() || '';
  const cpfCnpj = values.cpf?.trim() || values.cnpj?.trim() || '';
  const phone = values.telefone_celular?.trim() || values.telefone?.trim() || '';
  return {
    name,
    email,
    cpfCnpj,
    postalCode: values.cep?.trim() || '',
    addressNumber: 'S/N',
    phone,
  };
}

export function EventInscriptionClient({
  slug,
  previewRequested = false,
  resumeInscriptionId,
  campanhasIndexHref = '/institucional/campanhas',
  campanhaVerHref,
  associeHref = '/associe-se',
  fillAppShellViewport = false,
}: {
  slug: string;
  previewRequested?: boolean;
  /** Retoma checkout Asaas ou confirmação após inscrição já gravada (link do credenciamento no app). */
  resumeInscriptionId?: string;
  campanhasIndexHref?: string;
  campanhaVerHref?: string;
  associeHref?: string;
  fillAppShellViewport?: boolean;
}) {
  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [cnpjStepValue, setCnpjStepValue] = useState('');
  const [cnpjStepDone, setCnpjStepDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  /** Checkout Asaas na própria página (antes do pagamento confirmado). */
  const [asaasCheckout, setAsaasCheckout] = useState<CreateInscriptionPaymentResponse | null>(null);
  const [inscriptionPaid, setInscriptionPaid] = useState(false);
  const [error, setError] = useState('');
  const [pixStepActive, setPixStepActive] = useState(false);
  /** Inscrição já gravada; nova tentativa só gera o pagamento Asaas. */
  const [pendingInscriptionId, setPendingInscriptionId] = useState<string | null>(null);
  const [completedInscriptionId, setCompletedInscriptionId] = useState<string | null>(null);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupHint, setCnpjLookupHint] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [cnpjRejeitadoNaoAssociado, setCnpjRejeitadoNaoAssociado] = useState(false);
  /** CNPJ reconhecido na base de associados para tarifa reduzida (Asaas). */
  const [associadoPaymentTier, setAssociadoPaymentTier] = useState(false);
  const [completedAsaasCharge, setCompletedAsaasCharge] = useState<{
    amount: number;
    tier: InscriptionPaymentTier;
    voucherApplied?: boolean;
  } | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [voucherHint, setVoucherHint] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  /** Participante optou por pular a etapa de CNPJ e preencher o formulário com CPF. */
  const [inscricaoViaCpf, setInscricaoViaCpf] = useState(false);
  const [supportWhatsappUrl, setSupportWhatsappUrl] = useState('/atendimento');
  const cnpjLookupReq = useRef(0);
  const [adminOk, setAdminOk] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [resumeInscriptionIdLocal, setResumeInscriptionIdLocal] = useState<string | undefined>();
  const effectiveResumeInscriptionId =
    resumeInscriptionId?.trim() || resumeInscriptionIdLocal?.trim() || undefined;
  const [resumeLoading, setResumeLoading] = useState(Boolean(effectiveResumeInscriptionId));
  const [existingInscription, setExistingInscription] = useState<
    (EventInscriptionRecord & { id: string }) | null
  >(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        initFirebase();
        const [c, isAdmin] = await Promise.all([getCampaign(slug), isCurrentUserAdmin()]);
        if (!mounted) return;
        setAdminOk(isAdmin);
        setAuthChecked(true);
        if (c?.published === false && !isAdmin) {
          setCampanha(null);
        } else {
          setCampanha(c);
        }
      } catch {
        if (mounted) setCampanha(null);
      } finally {
        if (mounted) {
          setAuthChecked(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    const inscId = effectiveResumeInscriptionId;
    if (!inscId || !campanha || loading) return;

    let cancelled = false;
    (async () => {
      setResumeLoading(true);
      setError('');
      try {
        const row = await getEventInscription(slug, inscId);
        if (cancelled) return;
        if (!row) {
          setError('Inscrição não encontrada.');
          return;
        }

        setValues(row.fields ?? {});
        const paymentCfg = getEffectivePayment(campanha);
        const status = normalizeInscriptionPaymentStatus(row);

        if (paymentCfg.kind === 'none' || isInscriptionPaymentConfirmed({ paymentStatus: status })) {
          setCompletedInscriptionId(inscId);
          setInscriptionPaid(true);
          setDone(true);
          return;
        }

        setCompletedInscriptionId(inscId);
        setPendingInscriptionId(inscId);

        if (paymentCfg.kind === 'asaas') {
          const tier: InscriptionPaymentTier =
            row.paymentAmountTier === 'associado' ? 'associado' : 'normal';
          setAssociadoPaymentTier(tier === 'associado');
          if (row.voucherCode) setVoucherCodeInput(row.voucherCode);
          const charge = resolveInscriptionChargeAmount(paymentCfg, tier === 'associado');
          setCompletedAsaasCharge({
            amount:
              typeof row.paymentAmountApplied === 'number' && row.paymentAmountApplied > 0
                ? row.paymentAmountApplied
                : charge.amount,
            tier,
            voucherApplied: Boolean(row.voucherCode),
          });
          if (status === 'gratis' || isGratisPaymentAmount(charge.amount)) {
            setInscriptionPaid(true);
            setDone(true);
            return;
          }
          const checkout = await createAsaasInscriptionPayment(slug, inscId);
          if (cancelled) return;
          if (checkout.gratis || checkout.paymentStatus === 'gratis') {
            setInscriptionPaid(true);
            setDone(true);
            return;
          }
          setAsaasCheckout(checkout);
          setDone(true);
          return;
        }

        if (paymentCfg.kind === 'pix') {
          setPixStepActive(true);
          setDone(true);
        }
      } catch (err) {
        if (!cancelled) setError(inscriptionSubmitErrorMessage(err));
      } finally {
        if (!cancelled) setResumeLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveResumeInscriptionId, campanha, loading, slug]);

  useEffect(() => {
    if (!campanha?.title) return;
    document.title = `Inscrição · ${campanha.title} | ${DOC_TITLE_BASE}`;
    return () => {
      document.title = DOC_TITLE_BASE;
    };
  }, [campanha?.title]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const env = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() ?? '';
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(WHATSAPP_STORAGE_KEY)?.trim() ?? '' : '';
      let number = '';
      try {
        const settings = await getSettings();
        const apiNum = settings?.whatsapp_number?.trim();
        if (apiNum) number = formatWhatsAppNumber(apiNum);
      } catch {
        // fallback para storage/env
      }
      if (!number && stored) number = formatWhatsAppNumber(stored);
      if (!number && env) number = formatWhatsAppNumber(env);
      if (!mounted || !number || number.length < 10) return;
      const msg = encodeURIComponent(
        `Olá! Sou associado (ou estou tentando me inscrever) e meu CNPJ não validou na inscrição do evento "${campanha?.title ?? ''}". Podem me ajudar?`
      );
      setSupportWhatsappUrl(`https://wa.me/${number}?text=${msg}`);
    })();
    return () => {
      mounted = false;
    };
  }, [campanha?.title]);

  const isDraftPreview = adminOk && campanha?.published === false;
  const pageOuterClass = fillAppShellViewport
    ? 'flex min-h-0 flex-1 flex-col bg-gradient-to-b from-white to-cdl-gray/30 pb-12 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1.5rem))] sm:pb-16 sm:pt-[max(4rem,calc(env(safe-area-inset-top,0px)+2rem))]'
    : 'py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30';
  const eventVerHref =
    campanhaVerHref ??
    `/institucional/campanhas/ver?slug=${encodeURIComponent(slug)}${isDraftPreview ? '&preview=1' : ''}`;

  if (loading || resumeLoading || !authChecked) {
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

  if (!campanha) {
    if (previewRequested && authChecked && !adminOk) {
      return <CampaignPreviewAccessDenied />;
    }
    return (
      <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
        <div className="container-cdl max-w-2xl">
          <Link href={campanhasIndexHref} prefetch={false} className="text-sm text-cdl-blue hover:underline mb-6 inline-block">
            ← Campanhas e eventos
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-lg font-medium text-gray-900 mb-2">Evento não encontrado</p>
            <p className="text-cdl-gray-text text-sm">Verifique o link ou entre em contato com a CDL.</p>
          </div>
        </div>
      </div>
    );
  }

  if (campanha.registrationClosed) {
    return (
      <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
        <div className="container-cdl max-w-2xl">
          <nav className="mb-8">
            <Link
              href={eventVerHref}
              prefetch={false}
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 sm:p-10 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-900 mb-2">Inscrição no evento</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{campanha.title}</h1>
            <p className="text-xl font-semibold text-gray-900">Inscrição encerrada</p>
            <p className="mt-3 text-amber-950/90 max-w-md mx-auto">
              As inscrições para este evento foram encerradas pela organização. Não é mais possível enviar novos cadastros pelo site.
            </p>
            <Link
              href={eventVerHref}
              prefetch={false}
              className="btn-primary inline-block mt-8"
            >
              Voltar ao evento
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const reg = getEffectiveRegistration(campanha);
  if (reg.kind !== 'form' || reg.keys.length === 0) {
    return (
      <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
        <div className="container-cdl max-w-2xl">
          <Link href={campanhasIndexHref} prefetch={false} className="text-sm text-cdl-blue hover:underline mb-6 inline-block">
            ← Campanhas e eventos
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-lg font-medium text-gray-900 mb-2">Inscrição indisponível</p>
            <p className="text-cdl-gray-text text-sm mb-6">
              Este evento não está com inscrição pelo site ativa no momento.
            </p>
            <Link
              href={eventVerHref}
              prefetch={false}
              className="btn-primary inline-block"
            >
              Voltar ao evento
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inscricoesEncerradas = isInscriptionSoldOut(campanha);

  if (inscricoesEncerradas && !isDraftPreview) {
    return (
      <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
        <div className="container-cdl max-w-2xl">
          <nav className="mb-8">
            <Link
              href={eventVerHref}
              prefetch={false}
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
          <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-10 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-cdl-blue mb-2">Inscrição no evento</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{campanha.title}</h1>
            <p className="text-xl font-semibold text-gray-900">Ingressos esgotados</p>
            <p className="mt-3 text-cdl-gray-text max-w-md mx-auto">
              O limite de inscrições para este evento foi atingido. Acompanhe nossos canais para novas oportunidades.
            </p>
            <Link
              href={eventVerHref}
              prefetch={false}
              className="btn-primary inline-block mt-8"
            >
              Voltar ao evento
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fieldKeys = sortInscriptionFieldKeys(reg.keys);
  const userInputKeys = fieldKeys.filter((k) => k !== 'observacoes');
  const padraoKeys = userInputKeys.filter((k) => PADRAO_IDS.has(k));
  const associadoKeys = userInputKeys.filter((k) => !PADRAO_IDS.has(k) && !EXTRA_IDS.has(k));
  const empresaKeys = associadoKeys;
  const empresaSectionTitle = inscricaoViaCpf ? 'Dados da empresa' : 'Dados de associado';
  const extraKeys = userInputKeys.filter((k) => EXTRA_IDS.has(k));
  const adminObservationText =
    fieldKeys.includes('observacoes') && reg.observationText?.trim()
      ? reg.observationText.trim()
      : '';
  const payment = getEffectivePayment(campanha);
  const hasAssociadoPrice =
    payment.kind === 'asaas' &&
    payment.amountAssociado != null &&
    payment.amountAssociado > 0;
  const baseAsaasCharge =
    payment.kind === 'asaas'
      ? resolveInscriptionChargeAmount(payment, associadoPaymentTier)
      : null;

  const asaasChargePreview = (() => {
    if (!baseAsaasCharge || payment.kind !== 'asaas') return null;
    const code = normalizeVoucherCodeInput(voucherCodeInput);
    if (!code) return baseAsaasCharge;
    const resolved = resolveVoucherForCharge(campanha?.vouchers, code, baseAsaasCharge.amount);
    if (!resolved.ok) return baseAsaasCharge;
    return { ...baseAsaasCharge, amount: resolved.applied.amountAfter };
  })();

  async function refreshAssociadoPaymentTierFromCnpj(cnpjRaw: string): Promise<boolean> {
    if (!hasAssociadoPrice || inscricaoViaCpf) {
      setAssociadoPaymentTier(false);
      return false;
    }
    const d = onlyDigitsCnpj(cnpjRaw);
    if (d.length !== 14) {
      setAssociadoPaymentTier(false);
      return false;
    }
    const ok = await isCnpjCadastradoComoAssociado(cnpjRaw);
    setAssociadoPaymentTier(ok);
    return ok;
  }

  const inscriptionDocumentMode = reg.kind === 'form' ? reg.documentMode : 'cpf_allowed';
  const needsCnpjValidationStep = needsCnpjInscriptionStep(inscriptionDocumentMode, userInputKeys);
  const podeInscreverComCpf = canOfferInscricaoComCpf(inscriptionDocumentMode, userInputKeys);
  const inscricaoAssociadosOnly =
    campanha.registrationConfig?.type === 'form' &&
    campanha.registrationConfig.associadosOnly === true;

  async function lookupCnpjAndPrefill(raw: string, opts?: { setFormErrorOnInvalid?: boolean }): Promise<boolean> {
    const digits = onlyDigitsCnpj(raw ?? '');
    if (digits.length !== 14) {
      setCnpjLookupHint(null);
      setCnpjRejeitadoNaoAssociado(false);
      if (opts?.setFormErrorOnInvalid) {
        setError('Informe um CNPJ válido para continuar.');
      }
      return false;
    }
    const req = ++cnpjLookupReq.current;
    setCnpjLookupLoading(true);
    setCnpjLookupHint(null);
    try {
      if (inscricaoAssociadosOnly) {
        const isAssociado = await isCnpjCadastradoComoAssociado(raw);
        if (req !== cnpjLookupReq.current) return false;
        if (!isAssociado) {
          setCnpjRejeitadoNaoAssociado(true);
          setCnpjLookupHint({ type: 'err', text: MSG_CNPJ_NAO_ASSOCIADO });
          return false;
        }
      } else {
        setCnpjRejeitadoNaoAssociado(false);
      }

      let associadoTarifaHint = '';
      if (hasAssociadoPrice) {
        const isAssocPay = await isCnpjCadastradoComoAssociado(raw);
        if (req !== cnpjLookupReq.current) return false;
        setAssociadoPaymentTier(isAssocPay);
        if (isAssocPay && payment.kind === 'asaas') {
          const { amount } = resolveInscriptionChargeAmount(payment, true);
          associadoTarifaHint = ` Tarifa de associado CDL: ${formatPaymentAmountBrl(amount)}.`;
        }
      }

      const data = await fetchCnpjBrasilApi(digits);
      if (req !== cnpjLookupReq.current) return false;
      const patch = associadoFormPatchFromBrasilApi(data);
      const merged = mergeInscriptionValuesFromCnpjPatch(userInputKeys, patch);
      const maskedCnpj = applyInscriptionFieldMask('cnpj', digits);
      setValues((prev) => ({ ...prev, ...merged, cnpj: maskedCnpj }));
      setCnpjStepValue(maskedCnpj);
      setCnpjLookupHint({
        type: 'ok',
        text: `Dados preenchidos via Brasil API (CNPJ / Minha Receita). Revise antes de enviar.${associadoTarifaHint}`,
      });
      return true;
    } catch (err) {
      if (req !== cnpjLookupReq.current) return false;
      const text = err instanceof Error ? err.message : 'Não foi possível consultar o CNPJ.';
      setCnpjLookupHint({ type: 'err', text });
      if (opts?.setFormErrorOnInvalid) {
        setError(text);
      }
      return false;
    } finally {
      if (req === cnpjLookupReq.current) {
        setCnpjLookupLoading(false);
      }
    }
    return false;
  }

  async function handleCnpjBlur(e: React.FocusEvent<HTMLInputElement>) {
    await lookupCnpjAndPrefill(e.currentTarget.value);
  }

  const cnpjLookupUi: CnpjLookupProps | undefined = userInputKeys.includes('cnpj')
    ? {
        loading: cnpjLookupLoading,
        hint: cnpjLookupHint,
        onBlur: handleCnpjBlur,
        onDirty: () => {
          setCnpjLookupHint(null);
          setCnpjRejeitadoNaoAssociado(false);
          setAssociadoPaymentTier(false);
        },
      }
    : undefined;

  async function openExistingInscriptionForCpf(cpfRaw: string): Promise<boolean> {
    try {
      const row = await getEventInscriptionByCpf(slug, cpfRaw);
      if (!row) return false;
      setExistingInscription(row);
      setError('');
      setSubmitting(false);
      return true;
    } catch {
      return false;
    }
  }

  async function validateInscriptionData(): Promise<boolean> {
    setError('');
    if (userInputKeys.includes('cpf')) {
      const cpf = values.cpf ?? '';
      if (!isValidCpf(cpf)) {
        setError('Informe um CPF válido para continuar.');
        return false;
      }
    }
    if (userInputKeys.includes('cnpj') && !inscricaoViaCpf) {
      const d = onlyDigitsCnpj(values.cnpj ?? '');
      if (d.length !== 14) {
        setError('Informe um CNPJ válido para continuar.');
        return false;
      }
      if (inscricaoAssociadosOnly) {
        const ok = await isCnpjCadastradoComoAssociado(values.cnpj ?? '');
        if (!ok) {
          setError(`${MSG_CNPJ_NAO_ASSOCIADO} Não é possível enviar a inscrição.`);
          setCnpjRejeitadoNaoAssociado(true);
          return false;
        }
      }
      if (hasAssociadoPrice) {
        await refreshAssociadoPaymentTierFromCnpj(values.cnpj ?? '');
      }
    }
    for (const key of userInputKeys) {
      if (inscricaoViaCpf && isEmpresaInscriptionFieldKey(key)) continue;
      if (inscriptionDocumentMode === 'cpf_allowed' && key === 'cnpj' && !values.cnpj?.trim()) continue;
      if (!values[key]?.trim()) {
        setError(`Preencha o campo: ${labelForInscriptionField(key)}`);
        return false;
      }
    }
    if (campanha && eventRequiresUniqueCpfInscription(campanha)) {
      const fieldsPreview = buildEventInscriptionFieldsPayload(userInputKeys, values, {
        viaCpf: inscricaoViaCpf,
        documentMode: inscriptionDocumentMode,
      });
      const cpf = fieldsPreview.cpf;
      if (cpf) {
        try {
          const taken = await isCpfAlreadyRegisteredForEvent(slug, cpf);
          if (taken) {
            if (await openExistingInscriptionForCpf(cpf)) return false;
            setError(
              'Este CPF já possui inscrição neste evento. Cada CPF pode se inscrever apenas uma vez.',
            );
            return false;
          }
        } catch {
          /* validação definitiva na transação ao gravar */
        }
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
    let inscriptionId: string | null = pendingInscriptionId;
    try {
      const fields = buildEventInscriptionFieldsPayload(userInputKeys, values, {
        viaCpf: inscricaoViaCpf,
        documentMode: inscriptionDocumentMode,
      });
      if (Object.keys(fields).length === 0) {
        setError('Preencha os campos obrigatórios antes de enviar.');
        return;
      }
      const fresh = await getCampaign(slug);
      if (fresh && isInscriptionSoldOut(fresh) && !isDraftPreview) {
        setCampanha(fresh);
        return;
      }
      if (fresh?.registrationClosed) {
        setCampanha(fresh);
        return;
      }
      const voucherCode =
        payment.kind === 'asaas' ? normalizeVoucherCodeInput(voucherCodeInput) : '';
      if (payment.kind === 'asaas' && voucherCode) {
        if (!campanha?.vouchers?.length) {
          setError('Código de voucher inválido.');
          setSubmitting(false);
          return;
        }
        let tierFlag = associadoPaymentTier;
        if (hasAssociadoPrice && !inscricaoViaCpf) {
          tierFlag = await refreshAssociadoPaymentTierFromCnpj(
            values.cnpj?.trim() ? values.cnpj : cnpjStepValue,
          );
        }
        const base = resolveInscriptionChargeAmount(payment, tierFlag);
        const check = resolveVoucherForCharge(campanha.vouchers, voucherCode, base.amount);
        if (!check.ok) {
          setError(check.error);
          setSubmitting(false);
          return;
        }
      }

      if (!inscriptionId) {
        inscriptionId = await createEventInscription(slug, fields, {
          allowUnpublished: isDraftPreview,
          ...(voucherCode ? { voucherCode } : {}),
        });
        setPendingInscriptionId(inscriptionId);
      }

      if (payment.kind === 'asaas') {
        let tierFlag = associadoPaymentTier;
        if (hasAssociadoPrice && !inscricaoViaCpf) {
          tierFlag = await refreshAssociadoPaymentTierFromCnpj(
            values.cnpj?.trim() ? values.cnpj : cnpjStepValue,
          );
        }
        let charge = resolveInscriptionChargeAmount(payment, tierFlag);
        if (voucherCode && campanha?.vouchers?.length) {
          const applied = resolveVoucherForCharge(campanha.vouchers, voucherCode, charge.amount);
          if (applied.ok) {
            charge = { ...charge, amount: applied.applied.amountAfter };
          }
        }
        setCompletedAsaasCharge({
          ...charge,
          voucherApplied: Boolean(voucherCode),
        });
        const checkout = await createAsaasInscriptionPayment(slug, inscriptionId);
        setCompletedInscriptionId(inscriptionId);
        if (checkout.gratis || checkout.paymentStatus === 'gratis' || isGratisPaymentAmount(charge.amount)) {
          setInscriptionPaid(true);
          setDone(true);
          return;
        }
        setAsaasCheckout(checkout);
        setPendingInscriptionId(null);
        setDone(true);
        return;
      }

      setPendingInscriptionId(null);
      setCompletedInscriptionId(inscriptionId);
      setDone(true);
    } catch (err) {
      console.error('[inscrição evento]', err);
      if (isInscriptionLimitReachedError(err) || isRegistrationClosedError(err)) {
        try {
          const again = await getCampaign(slug);
          if (again) setCampanha(again);
        } catch {
          /* ignore */
        }
        setPendingInscriptionId(null);
      } else if (isCpfAlreadyRegisteredError(err)) {
        const cpfDup = buildEventInscriptionFieldsPayload(userInputKeys, values, {
          viaCpf: inscricaoViaCpf,
          documentMode: inscriptionDocumentMode,
        }).cpf;
        if (cpfDup && (await openExistingInscriptionForCpf(cpfDup))) {
          return;
        }
        setError(inscriptionSubmitErrorMessage(err));
      } else if (
        isFirestorePermissionDenied(err) ||
        (err instanceof Error && err.message === INSCRIPTION_PERMISSION_DENIED_ERROR)
      ) {
        try {
          const again = await getCampaign(slug);
          if (again) {
            setCampanha(again);
            if (isInscriptionSoldOut(again) && !isDraftPreview) return;
          }
        } catch {
          /* ignore */
        }
        const cpfDup = buildEventInscriptionFieldsPayload(userInputKeys, values, {
          viaCpf: inscricaoViaCpf,
          documentMode: inscriptionDocumentMode,
        }).cpf;
        if (cpfDup && (await openExistingInscriptionForCpf(cpfDup))) {
          return;
        }
        setError(inscriptionSubmitErrorMessage(err));
      } else if (inscriptionId && payment.kind === 'asaas') {
        setPendingInscriptionId(inscriptionId);
        setError(
          `${inscriptionSubmitErrorMessage(err)} Sua inscrição foi registrada; clique em «Confirmar inscrição e pagar» novamente para tentar abrir o pagamento.`,
        );
      } else {
        setError(inscriptionSubmitErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCnpjStepSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const latest = await getCampaign(slug);
      if (latest?.registrationClosed) {
        setCampanha(latest);
        return;
      }
    } catch {
      /* continua; lookup abaixo pode falhar de outra forma */
    }
    const ok = await lookupCnpjAndPrefill(cnpjStepValue, { setFormErrorOnInvalid: true });
    if (!ok) return;
    setCnpjStepDone(true);
  }

  function handleInscreverComCpf() {
    setInscricaoViaCpf(true);
    setCnpjStepDone(true);
    setError('');
    setCnpjLookupHint(null);
    setCnpjRejeitadoNaoAssociado(false);
    setAssociadoPaymentTier(false);
    setCnpjStepValue('');
    setValues((prev) => {
      const next = { ...prev };
      delete next.cnpj;
      return next;
    });
  }

  const showAsaasCheckout = done && payment.kind === 'asaas' && asaasCheckout && !inscriptionPaid;
  const showSuccessAfterPayment =
    done && (payment.kind !== 'asaas' || inscriptionPaid);
  const showCheckInQr =
    completedInscriptionId &&
    (payment.kind !== 'asaas' || inscriptionPaid);

  if (existingInscription) {
    const paymentResumeHref = campaignInscriptionResumeUrl(slug, existingInscription.id, {
      preview: isDraftPreview,
    });
    return (
      <div className={pageOuterClass}>
        <div className={`container-cdl max-w-2xl ${fillAppShellViewport ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
          {isDraftPreview && <CampaignDraftPreviewBanner className="mb-6" />}
          <nav className="mb-8">
            <Link
              href={eventVerHref}
              prefetch={false}
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
            <p className="text-sm font-semibold uppercase tracking-wide text-cdl-blue mb-2">Inscrição no evento</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{campanha.title}</h1>
          </header>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <EventExistingInscriptionCheckIn
              campaignId={slug}
              campanha={campanha}
              row={existingInscription}
              paymentResumeHref={paymentResumeHref}
              onOpenPaymentResume={() => {
                const id = existingInscription.id;
                setExistingInscription(null);
                setResumeInscriptionIdLocal(id);
              }}
            />
            <button
              type="button"
              onClick={() => setExistingInscription(null)}
              className="mt-8 w-full text-center text-sm font-medium text-cdl-blue hover:underline"
            >
              Usar outro CPF ou corrigir dados
            </button>
          </div>
          {fillAppShellViewport ? <div className="min-h-16 flex-1" aria-hidden /> : null}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
        <div className="container-cdl max-w-lg">
          <div
            className={`rounded-xl border px-6 py-10 ${
              showAsaasCheckout
                ? 'border-cdl-blue/25 bg-white text-left'
                : showSuccessAfterPayment
                  ? 'border-green-200 bg-green-50 text-center'
                  : 'border-cdl-blue/25 bg-white text-center'
            }`}
          >
            {showAsaasCheckout ? (
              <>
                <p className="text-sm font-medium text-cdl-blue mb-2">Inscrição registrada — pagamento</p>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{campanha.title}</h1>
                <p className="text-cdl-gray-text mb-6 text-sm">
                  Seus dados foram salvos. Conclua o pagamento abaixo para confirmar sua participação.
                  {completedAsaasCharge?.tier === 'associado' ? (
                    <span className="text-cdl-blue"> Tarifa de associado CDL aplicada.</span>
                  ) : null}
                </p>
                <AsaasInscriptionCheckout
                  campaignId={slug}
                  inscriptionId={completedInscriptionId!}
                  amount={completedAsaasCharge?.amount ?? asaasCheckout.amount}
                  baseAmount={baseAsaasCharge?.amount}
                  paymentTier={completedAsaasCharge?.tier}
                  vouchers={campanha.vouchers}
                  initialVoucherCode={voucherCodeInput}
                  initialVoucherApplied={completedAsaasCharge?.voucherApplied}
                  description={payment.description}
                  checkout={asaasCheckout}
                  holderPrefill={cardHolderPrefillFromInscription(values)}
                  className="mb-2"
                  onPaid={() => setInscriptionPaid(true)}
                  onAmountChange={(nextAmount, meta) => {
                    setCompletedAsaasCharge((prev) =>
                      prev
                        ? { ...prev, amount: nextAmount, voucherApplied: meta.voucherApplied }
                        : { amount: nextAmount, tier: associadoPaymentTier ? 'associado' : 'normal', voucherApplied: meta.voucherApplied },
                    );
                  }}
                />
                <p className="mt-6 text-xs text-cdl-gray-text text-center">
                  O QR Code de check-in será exibido após a confirmação do pagamento.
                </p>
              </>
            ) : showSuccessAfterPayment ? (
              <>
                <p className="text-sm font-medium text-green-800 mb-2">
                  {payment.kind === 'asaas' && inscriptionPaid
                    ? 'Inscrição confirmada'
                    : payment.kind === 'asaas'
                      ? 'Pagamento confirmado'
                      : 'Inscrição registrada'}
                </p>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{campanha.title}</h1>
                <p className="text-cdl-gray-text mb-6">
                  {payment.kind === 'asaas' && inscriptionPaid
                    ? 'Sua inscrição foi confirmada (incluindo inscrição gratuita por voucher, quando aplicável). Apresente o QR Code de check-in abaixo na entrada do evento.'
                    : payment.kind === 'asaas'
                      ? 'Sua inscrição e pagamento foram confirmados. Apresente o QR Code de check-in abaixo na entrada do evento.'
                      : 'Recebemos seus dados para este evento. Em breve entraremos em contato se necessário.'}
                </p>
                {showCheckInQr ? (
                  <EventInscriptionCheckInQr
                    eventId={slug}
                    inscriptionId={completedInscriptionId}
                    participantLabel={inscriptionDisplayLabel(values)}
                    className="mb-6 text-left"
                  />
                ) : null}
                <Link
                  href={eventVerHref}
              prefetch={false}
                  className="btn-primary inline-block"
                >
                  Voltar ao evento
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageOuterClass}>
      <div className={`container-cdl max-w-2xl ${fillAppShellViewport ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
        {isDraftPreview && <CampaignDraftPreviewBanner className="mb-6" />}
        <nav className="mb-8">
          <Link
            href={eventVerHref}
            prefetch={false}
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
                {formatEventDateForDisplay(campanha.date)}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cdl-blue mb-2">Inscrição no evento</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{campanha.title}</h1>
          {campanha.description && <p className="text-lg text-cdl-gray-text leading-relaxed">{campanha.description}</p>}
        </header>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {needsCnpjValidationStep && !cnpjStepDone
              ? (inscricaoAssociadosOnly ? 'Validação de associado' : 'Validação de dados')
              : payment.kind === 'pix' && pixStepActive
                ? 'Pagamento (PIX)'
                : 'Preencha seus dados'}
          </h2>

          {needsCnpjValidationStep && !cnpjStepDone ? (
            <form onSubmit={handleCnpjStepSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ
                  <span className="font-normal text-cdl-gray-text block mt-1 text-xs leading-snug">
                    {inscricaoAssociadosOnly
                      ? 'Para continuar, informe o CNPJ da empresa associada.'
                      : 'Para continuar, informe o CNPJ da sua empresa.'}
                  </span>
                </label>
                <input
                  type="tel"
                  required
                  value={cnpjStepValue}
                  onChange={(e) => {
                    setError('');
                    setCnpjLookupHint(null);
                    setCnpjRejeitadoNaoAssociado(false);
                    const masked = applyInscriptionFieldMask('cnpj', e.target.value);
                    setCnpjStepValue(masked);
                    setValues((prev) => ({ ...prev, cnpj: masked }));
                  }}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
                {cnpjLookupLoading && (
                  <p className="mt-1 text-xs text-cdl-gray-text">Consultando Brasil API…</p>
                )}
                {cnpjLookupHint && !cnpjLookupLoading && (
                  <p className={`mt-1 text-xs ${cnpjLookupHint.type === 'ok' ? 'text-green-800' : 'text-red-700'}`}>
                    {cnpjLookupHint.text}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {cnpjRejeitadoNaoAssociado && (
                <div className="rounded-lg border border-cdl-blue/20 bg-cdl-blue/5 p-4">
                  <p className="text-sm text-cdl-gray-text mb-3">
                    Se você ainda não for associado, pode iniciar sua associação. Caso já seja associado e a validação não
                    tenha funcionado, fale com nosso atendimento.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={associeHref} prefetch={false} className="btn-primary">
                      Associe-se
                    </Link>
                    <a href={supportWhatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                      Comunicar problema
                    </a>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button type="submit" disabled={cnpjLookupLoading} className="btn-primary w-full sm:w-auto min-w-[220px]">
                  {cnpjLookupLoading ? 'Validando...' : 'Validar CNPJ e continuar'}
                </button>
              </div>
              {podeInscreverComCpf && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-sm font-medium text-gray-900">Não tem CNPJ?</p>
                  <p className="mt-1 text-xs text-cdl-gray-text leading-relaxed">
                    Você pode se inscrever informando seu CPF e os demais dados pessoais no próximo passo.
                  </p>
                  <button
                    type="button"
                    onClick={handleInscreverComCpf}
                    disabled={cnpjLookupLoading}
                    className="btn-secondary mt-3 w-full sm:w-auto min-w-[200px]"
                  >
                    Inscrever com CPF
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {!(payment.kind === 'pix' && pixStepActive) ? (
              <>
                {inscricaoViaCpf && (
                  <section className="rounded-lg border border-cdl-blue/20 bg-cdl-blue/5 px-4 py-3">
                    <p className="text-sm font-medium text-cdl-blue">Inscrição com CPF</p>
                    <p className="mt-1 text-sm text-cdl-gray-text">
                      Preencha primeiro o cadastro padrão (obrigatório). Os dados da empresa, se quiser informar, são opcionais.
                    </p>
                  </section>
                )}
                {adminObservationText && (
                  <section className="rounded-lg border border-cdl-blue/20 bg-cdl-blue/5 px-4 py-3">
                    <p className="text-sm font-medium text-cdl-blue">Observações da organização</p>
                    <p className="mt-1 text-sm text-cdl-gray-text">{adminObservationText}</p>
                  </section>
                )}
                {inscricaoViaCpf && padraoKeys.length > 0 && (
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
                          inscricaoAssociadosOnly={inscricaoAssociadosOnly}
                          inscricaoViaCpf={inscricaoViaCpf}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {inscricaoViaCpf && empresaKeys.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">
                      {empresaSectionTitle}
                    </h3>
                    <p className="text-xs text-cdl-gray-text -mt-2">
                      Preencha se tiver empresa; todos os campos abaixo são opcionais.
                    </p>
                    <div className="space-y-4">
                      {empresaKeys.map((key) => (
                        <FieldRow
                          key={key}
                          fieldKey={key}
                          values={values}
                          setValues={setValues}
                          cnpjLookup={key === 'cnpj' ? cnpjLookupUi : undefined}
                          observationText={reg.kind === 'form' ? reg.observationText : undefined}
                          inscricaoAssociadosOnly={inscricaoAssociadosOnly}
                          inscricaoViaCpf={inscricaoViaCpf}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {!inscricaoViaCpf && empresaKeys.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">
                      {empresaSectionTitle}
                    </h3>
                    <div className="space-y-4">
                      {empresaKeys.map((key) => (
                        <FieldRow
                          key={key}
                          fieldKey={key}
                          values={values}
                          setValues={setValues}
                          cnpjLookup={key === 'cnpj' ? cnpjLookupUi : undefined}
                          observationText={reg.kind === 'form' ? reg.observationText : undefined}
                          inscricaoAssociadosOnly={inscricaoAssociadosOnly}
                          inscricaoViaCpf={inscricaoViaCpf}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {!inscricaoViaCpf && padraoKeys.length > 0 && (
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
                          inscricaoAssociadosOnly={inscricaoAssociadosOnly}
                          inscricaoViaCpf={inscricaoViaCpf}
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
                          inscricaoAssociadosOnly={inscricaoAssociadosOnly}
                          inscricaoViaCpf={inscricaoViaCpf}
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
            {payment.kind === 'asaas' && asaasChargePreview ? (
              <div className="rounded-lg border border-cdl-blue/20 bg-cdl-blue/5 px-4 py-3 space-y-3">
                <p className="text-sm text-cdl-gray-text">
                  Valor da inscrição:{' '}
                  <strong className="text-gray-900">
                    {formatPaymentAmountBrl(asaasChargePreview.amount)}
                  </strong>
                  {asaasChargePreview.tier === 'associado' ? (
                    <span className="ml-1 text-xs font-medium text-cdl-blue">
                      (tarifa associado CDL)
                    </span>
                  ) : null}
                  {baseAsaasCharge &&
                  voucherCodeInput.trim() &&
                  asaasChargePreview.amount < baseAsaasCharge.amount ? (
                    <span className="ml-1 text-xs font-medium text-green-700">(com voucher)</span>
                  ) : null}
                </p>
                {hasAssociadoPrice &&
                asaasChargePreview.tier === 'normal' &&
                userInputKeys.includes('cnpj') &&
                !inscricaoViaCpf ? (
                  <p className="text-xs text-cdl-gray-text">
                    CNPJs cadastrados como associados CDL podem ter valor diferente, aplicado
                    automaticamente na cobrança.
                  </p>
                ) : null}
                {(campanha?.vouchers?.length ?? 0) > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Código de voucher (opcional)
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={voucherCodeInput}
                      onChange={(e) => {
                        const v = normalizeVoucherCodeInput(e.target.value);
                        setVoucherCodeInput(v);
                        if (!v) {
                          setVoucherHint(null);
                          return;
                        }
                        if (!baseAsaasCharge) return;
                        const r = resolveVoucherForCharge(campanha?.vouchers, v, baseAsaasCharge.amount);
                        if (r.ok) {
                          setVoucherHint({
                            type: 'ok',
                            text: `Desconto aplicado: ${formatPaymentAmountBrl(r.applied.amountAfter)}`,
                          });
                        } else {
                          setVoucherHint({ type: 'err', text: r.error });
                        }
                      }}
                      placeholder="Ex.: CDL2026"
                      className="mt-1 block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase"
                    />
                    {voucherHint ? (
                      <p
                        className={`mt-1 text-xs ${voucherHint.type === 'ok' ? 'text-green-800' : 'text-red-700'}`}
                      >
                        {voucherHint.text}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
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
              {needsCnpjValidationStep && !pixStepActive && (
                <button
                  type="button"
                  onClick={() => {
                    setCnpjStepDone(false);
                    setInscricaoViaCpf(false);
                    setPixStepActive(false);
                    setError('');
                  }}
                  disabled={submitting}
                  className="btn-secondary"
                >
                  {inscricaoViaCpf ? 'Voltar à validação por CNPJ' : 'Alterar CNPJ'}
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
                    : payment.kind === 'asaas'
                      ? 'Confirmar inscrição e pagar'
                      : 'Confirmar inscrição'}
              </button>
            </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
