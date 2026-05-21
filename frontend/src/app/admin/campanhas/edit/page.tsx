 'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getCampaign,
  updateCampaign,
  countEventInscriptions,
  ensureCredentialingAccessToken,
  Campaign,
} from '@/lib/firestore';
import { hasEventFormRegistration } from '@/lib/event-registration-fields';
import { RegistrationLinkSection, type RegistrationLinkMode } from '@/components/admin/RegistrationLinkSection';
import { EventPaymentSection } from '@/components/admin/EventPaymentSection';
import { EventVouchersSection } from '@/components/admin/EventVouchersSection';
import { getEffectiveRegistration, resolveInscriptionDocumentMode } from '@/lib/event-registration-fields';
import type { InscriptionDocumentMode } from '@/lib/firestore';
import { parsePositiveInscriptionLimit } from '@/lib/inscription-limit';
import { EventDateTimeFields } from '@/components/admin/EventDateTimeFields';
import type { CampaignPaymentProvider } from '@/lib/firestore';
import {
  buildCampaignPaymentConfigFromAdmin,
  loadPaymentAdminStateFromConfig,
  parsePaymentAmountInput,
} from '@/lib/campaign-payment-admin';
import { campaignPublicPageUrl } from '@/lib/campaign-preview';
import {
  buildEventVouchersForSave,
  loadEventVoucherDraftsFromCampaign,
  validateEventVoucherDrafts,
  type EventVoucherDraft,
} from '@/lib/event-vouchers-admin';

// imgbb upload key
const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

export default function AdminCampanhaEditByQueryPage() {
  const search = useSearchParams();
  const id = search.get('id') ?? '';
  const router = useRouter();
  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');
  const [wantsRegistrationLink, setWantsRegistrationLink] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<RegistrationLinkMode>('form');
  const [registrationExternalUrl, setRegistrationExternalUrl] = useState('');
  const [registrationFieldKeys, setRegistrationFieldKeys] = useState<string[]>([]);
  const [registrationObservationText, setRegistrationObservationText] = useState('');
  const [associadosOnly, setAssociadosOnly] = useState(false);
  const [inscriptionDocumentMode, setInscriptionDocumentMode] = useState<InscriptionDocumentMode | null>(null);
  const [inscriptionLimit, setInscriptionLimit] = useState<number | null>(null);
  const [wantsEventPayment, setWantsEventPayment] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<CampaignPaymentProvider>('asaas');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAmountAssociado, setPaymentAmountAssociado] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [pixImageUrl, setPixImageUrl] = useState('');
  const [pixCopyPaste, setPixCopyPaste] = useState('');
  const [pixObservationText, setPixObservationText] = useState('');
  const [voucherDrafts, setVoucherDrafts] = useState<EventVoucherDraft[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const c = await getCampaign(id);
        if (mounted) setCampanha(c);
      } catch {
        if (mounted) setError('Erro ao carregar evento');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!campanha?.id) return;
    const eff = getEffectiveRegistration(campanha, { ignoreRegistrationClosed: true });
    const formCfg = campanha.registrationConfig?.type === 'form' ? campanha.registrationConfig : null;
    setAssociadosOnly(Boolean(formCfg?.associadosOnly));
    if (eff.kind === 'none') {
      setWantsRegistrationLink(false);
      setRegistrationMode('form');
      setRegistrationExternalUrl('');
      setRegistrationFieldKeys([]);
      setRegistrationObservationText('');
      setAssociadosOnly(false);
      setInscriptionDocumentMode(null);
      setInscriptionLimit(null);
    } else if (eff.kind === 'external') {
      setWantsRegistrationLink(true);
      setRegistrationMode('external');
      setRegistrationExternalUrl(eff.url);
      setRegistrationFieldKeys([]);
      setRegistrationObservationText('');
      setAssociadosOnly(false);
      setInscriptionDocumentMode(null);
      setInscriptionLimit(null);
    } else {
      setWantsRegistrationLink(true);
      setRegistrationMode('form');
      setRegistrationExternalUrl('');
      setRegistrationFieldKeys(eff.keys);
      setRegistrationObservationText(eff.observationText ?? '');
      setInscriptionDocumentMode(
        formCfg?.type === 'form' ? resolveInscriptionDocumentMode(formCfg) : 'cnpj_only'
      );
      const lim = formCfg?.type === 'form' ? parsePositiveInscriptionLimit(formCfg.inscriptionLimit) : null;
      setInscriptionLimit(lim);
    }
  }, [campanha?.id, campanha?.registrationConfig]);

  useEffect(() => {
    if (!campanha?.id) return;
    const loaded = loadPaymentAdminStateFromConfig(campanha.paymentConfig);
    setWantsEventPayment(loaded.enabled);
    setPaymentProvider(loaded.provider);
    setPaymentAmount(loaded.amount);
    setPaymentAmountAssociado(loaded.amountAssociado);
    setPaymentDescription(loaded.description);
    setPixImageUrl(loaded.pixImageUrl);
    setPixCopyPaste(loaded.pixCopyPaste);
    setPixObservationText(loaded.pixObservationText);
  }, [campanha?.id, campanha?.paymentConfig]);

  useEffect(() => {
    if (!campanha?.id) return;
    setVoucherDrafts(loadEventVoucherDraftsFromCampaign(campanha));
  }, [campanha?.id, campanha?.vouchers]);

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;
  if (!id) {
    return (
      <div>
        <Link href="/admin/eventos" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">← Voltar aos eventos</Link>
        <div className="mt-8 p-8 rounded-xl border border-gray-200 bg-white text-center">
          <p className="text-cdl-gray-text">ID do evento não informado.</p>
        </div>
      </div>
    );
  }
  if (!campanha) {
    return (
      <div>
        <Link href="/admin/eventos" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">← Voltar aos eventos</Link>
        <div className="mt-8 p-8 rounded-xl border border-gray-200 bg-white text-center">
          <p className="text-cdl-gray-text">Evento não encontrado.</p>
        </div>
      </div>
    );
  }

  async function handleSave() {
    if (!campanha) return;
    if (wantsRegistrationLink) {
      if (registrationMode === 'external' && !registrationExternalUrl.trim()) {
        setError('Configure a inscrição ou desative a opção.');
        return;
      }
      if (registrationMode === 'form' && registrationFieldKeys.length === 0) {
        setError('Configure a inscrição ou desative a opção.');
        return;
      }
      if (registrationMode === 'form' && !inscriptionDocumentMode) {
        setError('Configure a inscrição: selecione se é apenas CNPJ ou se permite CPF.');
        return;
      }
      if (
        registrationMode === 'form' &&
        inscriptionDocumentMode === 'cnpj_only' &&
        !registrationFieldKeys.includes('cnpj')
      ) {
        setError('Para inscrição apenas por CNPJ, inclua o campo CNPJ na configuração.');
        return;
      }
    }
    if (wantsEventPayment) {
      if (paymentProvider === 'asaas') {
        if (parsePaymentAmountInput(paymentAmount) == null) {
          setError('Pagamento Asaas: informe o valor normal da inscrição, ou desmarque a opção.');
          return;
        }
        const assocRaw = paymentAmountAssociado.trim();
        if (assocRaw && parsePaymentAmountInput(assocRaw) == null) {
          setError('Pagamento Asaas: valor de associado inválido. Corrija ou deixe em branco.');
          return;
        }
      } else {
        const hasImg = Boolean(pixImageUrl.trim());
        const hasCode = Boolean(pixCopyPaste.trim());
        if (!hasImg && !hasCode) {
          setError('PIX manual: envie a foto do QR ou o código copia e cola, ou desmarque a opção.');
          return;
        }
      }
    }

    const voucherError = validateEventVoucherDrafts(voucherDrafts);
    if (voucherError) {
      setError(voucherError);
      return;
    }

    const paymentConfig = buildCampaignPaymentConfigFromAdmin({
      enabled: wantsEventPayment,
      provider: paymentProvider,
      amount: paymentAmount,
      amountAssociado: paymentAmountAssociado,
      description: paymentDescription,
      pixImageUrl,
      pixCopyPaste,
      pixObservationText,
    });
    const vouchersBuilt = buildEventVouchersForSave(voucherDrafts, campanha.vouchers);
    setSaving(true);
    setError('');
    try {
      const {
        id: _removedId,
        registrationConfig: _rc,
        registrationUrl: _ru,
        paymentConfig: _pay,
        ...rest
      } = campanha;

      let inscriptionWebCountSync: number | undefined;
      if (
        wantsRegistrationLink &&
        registrationMode === 'form' &&
        inscriptionLimit != null &&
        inscriptionLimit > 0
      ) {
        try {
          inscriptionWebCountSync = await countEventInscriptions(id);
        } catch {
          /* mantém o valor já salvo no documento se a contagem falhar */
        }
      }

      await updateCampaign(id, {
        ...rest,
        credentialingOnApp: campanha.credentialingOnApp === true,
        ...(inscriptionWebCountSync !== undefined ? { inscriptionWebCount: inscriptionWebCountSync } : {}),
        ...(wantsRegistrationLink
          ? registrationMode === 'external'
            ? {
                registrationConfig: { type: 'external' as const, url: registrationExternalUrl.trim() },
                registrationUrl: null,
              }
            : {
                registrationConfig: {
                  type: 'form' as const,
                  fieldKeys: registrationFieldKeys,
                  documentMode: inscriptionDocumentMode ?? 'cnpj_only',
                  associadosOnly,
                  ...(registrationObservationText.trim()
                    ? { observationText: registrationObservationText.trim() }
                    : {}),
                  ...(inscriptionLimit != null && inscriptionLimit > 0
                    ? { inscriptionLimit: inscriptionLimit }
                    : {}),
                },
                registrationUrl: null,
              }
          : { registrationConfig: null, registrationUrl: null }),
        paymentConfig: paymentConfig ?? null,
        ...(vouchersBuilt && vouchersBuilt.length > 0
          ? { vouchers: vouchersBuilt }
          : { vouchers: null }),
      });
      if (campanha.credentialingOnApp === true) {
        await ensureCredentialingAccessToken(id);
      }
      router.push('/admin/eventos');
    } catch {
      setError('Erro ao salvar evento');
    } finally {
      setSaving(false);
    }
  }

  async function uploadImageFile(file?: File | null) {
    if (!file) return;
    setImageError('');
    setImageUploading(true);
    try {
      if (!IMGBB_KEY) {
        setImageError('Chave de upload não configurada');
        return;
      }
      // compress + resize (reuse same approach as novo)
      const compressImage = async (input: File, maxDim = 1600, quality = 0.75): Promise<Blob | null> => {
        try {
          const bitmap = await createImageBitmap(input);
          const { width, height } = bitmap;
          let targetWidth = width;
          let targetHeight = height;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            targetWidth = Math.round(width * ratio);
            targetHeight = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
          const outputType = 'image/webp';
          return await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) return resolve(blob);
              canvas.toBlob((blob2) => resolve(blob2), 'image/jpeg', quality);
            }, outputType, quality);
          });
        } catch (e) {
          return await new Promise<Blob | null>((resolve) => {
            const img = new Image();
            img.onload = () => {
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                const r = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * r);
                h = Math.round(h * r);
              }
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0, w, h);
              canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(input);
          });
        }
      };

      const compressed = await compressImage(file, 1600, 0.75);
      const toUpload = compressed && (compressed as Blob).size > 0 ? compressed : file;
      const form = new FormData();
      if (toUpload instanceof Blob && !(toUpload instanceof File)) {
        const filename = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        form.append('image', toUpload, filename);
      } else {
        form.append('image', toUpload as File);
      }
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data && data.data && data.data.url) {
        setCampanha((c) => (c ? { ...c, image: data.data.url } : c));
      } else {
        setImageError('Erro ao enviar imagem');
      }
    } catch (e) {
      setImageError('Erro ao enviar imagem');
    } finally {
      setImageUploading(false);
    }
  }

  function removeImage() {
    setCampanha((c) => (c ? { ...c, image: undefined } : c));
  }

  return (
    <div>
      <Link href="/admin/eventos" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">← Voltar aos eventos</Link>

      <div className="mt-6">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Editar evento</h1>
          {campanha.published === false && (
            <>
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-700">
                Rascunho
              </span>
              {campanha.id && (
                <Link
                  href={campaignPublicPageUrl(campanha.id, { preview: true })}
                  className="inline-flex items-center rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
                >
                  Ver rascunho
                </Link>
              )}
            </>
          )}
        </div>
        <p className="mb-4 text-sm text-cdl-gray-text">Edite a apresentação do evento como ela aparece no site.</p>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
              <h2 className="text-sm font-semibold text-gray-900">Apresentação no site</h2>
              <p className="text-[11px] leading-snug text-cdl-gray-text">
                Como na página pública: categoria, data, título, textos e foto.
              </p>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <label
                    htmlFor="edit-campaign-category"
                    className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500"
                  >
                    Categoria
                  </label>
                  <input
                    id="edit-campaign-category"
                    value={campanha.category}
                    onChange={(e) => setCampanha({ ...campanha, category: e.target.value })}
                    placeholder="ex: Networking, Festival"
                    className="block w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm shadow-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue/20"
                  />
                </div>
                <EventDateTimeFields
                  value={campanha.date ?? ''}
                  onChange={(next) => setCampanha({ ...campanha, date: next })}
                  idPrefix="edit-campaign"
                  compact
                />
              </div>

              <div>
                <label
                  htmlFor="edit-campaign-title"
                  className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500"
                >
                  Título
                </label>
                <input
                  id="edit-campaign-title"
                  value={campanha.title}
                  onChange={(e) => setCampanha({ ...campanha, title: e.target.value })}
                  className="block w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-semibold leading-snug text-gray-900 shadow-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue/20"
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[9.5rem_minmax(0,1fr)] lg:items-start">
                <div className="min-w-0 shrink-0">
                  <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Foto destaque
                  </span>
                  <label
                    className={`relative block w-full max-w-[9.5rem] cursor-pointer overflow-hidden rounded-md border bg-gray-100 shadow-sm transition-colors aspect-video ${
                      campanha.image
                        ? 'border-gray-200 hover:ring-2 hover:ring-cdl-blue/30'
                        : 'border-dashed border-gray-300 hover:border-cdl-blue/40 hover:bg-cdl-blue/5'
                    }`}
                    title={campanha.image ? 'Clique para trocar' : 'Enviar foto destaque'}
                  >
                    {campanha.image ? (
                      <img
                        src={campanha.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center">
                        <svg className="h-5 w-5 text-cdl-blue/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[10px] font-medium text-cdl-gray-text">Enviar</span>
                      </span>
                    )}
                    {imageUploading && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] text-white">
                        …
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={imageUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file) void uploadImageFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center justify-start gap-x-2 gap-y-0.5">
                    <label className="cursor-pointer text-[11px] font-medium text-cdl-blue hover:underline">
                      {campanha.image ? 'Trocar' : 'Enviar'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={imageUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (file) void uploadImageFile(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {imageUploading && <span className="text-[11px] text-cdl-gray-text">…</span>}
                    {imageError && <span className="text-[11px] text-red-600">{imageError}</span>}
                    {campanha.image && (
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={imageUploading}
                        className="text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="edit-campaign-description"
                    className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500"
                  >
                    Descrição
                  </label>
                  <textarea
                    id="edit-campaign-description"
                    value={campanha.description}
                    onChange={(e) => setCampanha({ ...campanha, description: e.target.value })}
                    rows={2}
                    placeholder="Texto curto abaixo do título…"
                    className="w-full resize-y rounded-md border border-gray-200 px-2.5 py-1.5 text-sm leading-snug text-cdl-gray-text shadow-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-campaign-full-description"
                  className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500"
                >
                  Descrição completa
                </label>
                <textarea
                  id="edit-campaign-full-description"
                  value={campanha.fullDescription}
                  onChange={(e) => setCampanha({ ...campanha, fullDescription: e.target.value })}
                  rows={5}
                  placeholder="Conteúdo principal da página do evento…"
                  className="w-full resize-y rounded-md border border-gray-200 px-2.5 py-1.5 text-sm leading-snug text-cdl-gray-text shadow-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue/20"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações do evento</h2>
            <div className="space-y-4">
              <RegistrationLinkSection
                wantsLink={wantsRegistrationLink}
                onWantsLinkChange={(v) => {
                  setWantsRegistrationLink(v);
                  if (!v) {
                    setRegistrationMode('form');
                    setRegistrationExternalUrl('');
                    setRegistrationFieldKeys([]);
                    setRegistrationObservationText('');
                    setAssociadosOnly(false);
                    setInscriptionDocumentMode('cnpj_only');
                    setInscriptionLimit(null);
                  }
                }}
                mode={registrationMode}
                onModeChange={setRegistrationMode}
                externalUrl={registrationExternalUrl}
                onExternalUrlChange={setRegistrationExternalUrl}
                fieldKeys={registrationFieldKeys}
                onFieldKeysChange={setRegistrationFieldKeys}
                observationText={registrationObservationText}
                onObservationTextChange={setRegistrationObservationText}
                associadosOnly={associadosOnly}
                onAssociadosOnlyChange={setAssociadosOnly}
                inscriptionLimit={inscriptionLimit}
                onInscriptionLimitChange={setInscriptionLimit}
                documentMode={inscriptionDocumentMode}
                onDocumentModeChange={setInscriptionDocumentMode}
              />
              <EventPaymentSection
                enabled={wantsEventPayment}
                onEnabledChange={setWantsEventPayment}
                provider={paymentProvider}
                onProviderChange={setPaymentProvider}
                amount={paymentAmount}
                onAmountChange={setPaymentAmount}
                amountAssociado={paymentAmountAssociado}
                onAmountAssociadoChange={setPaymentAmountAssociado}
                paymentDescription={paymentDescription}
                onPaymentDescriptionChange={setPaymentDescription}
                pixImageUrl={pixImageUrl}
                onPixImageUrlChange={setPixImageUrl}
                pixCopyPaste={pixCopyPaste}
                onPixCopyPasteChange={setPixCopyPaste}
                pixObservationText={pixObservationText}
                onPixObservationTextChange={setPixObservationText}
              />
              <EventVouchersSection vouchers={voucherDrafts} onVouchersChange={setVoucherDrafts} />
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    id="edit-published-event"
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
                    checked={campanha.published !== false}
                    onChange={(e) => setCampanha({ ...campanha, published: e.target.checked })}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">Publicar no site</span>
                    <span className="mt-1 block text-xs text-cdl-gray-text">
                      Desmarque para manter como rascunho (o público não verá o evento nas listagens).
                    </span>
                  </span>
                </label>
                {hasEventFormRegistration(campanha) && (
                  <label className="flex cursor-pointer items-start gap-3 border-t border-gray-200/80 pt-3">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
                      checked={campanha.credentialingOnApp === true}
                      disabled={campanha.published === false}
                      onChange={(e) =>
                        setCampanha({ ...campanha, credentialingOnApp: e.target.checked })
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">Credenciamento no site</span>
                      <span className="mt-1 block text-xs text-cdl-gray-text">
                        {campanha.published === false
                          ? 'Publique o evento no site para ativar o atalho na home do app.'
                          : 'Quando ativo, exibe na home do app o nome do evento e o botão «Credenciar».'}
                      </span>
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Edição via interface</h3>
                <p className="text-sm text-cdl-gray-text mb-3">Edite os campos acima e clique em salvar para atualizar o evento no Firebase.</p>
                <p className="text-sm text-cdl-gray-text">A edição via código ainda funciona e pode ser usada como backup.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
            {campanha.id &&
              (campanha.published !== false ? (
                <Link
                  href={campaignPublicPageUrl(campanha.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Ver página pública
                </Link>
              ) : (
                <Link href={campaignPublicPageUrl(campanha.id, { preview: true })} className="btn-secondary">
                  Ver rascunho
                </Link>
              ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

