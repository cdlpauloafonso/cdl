'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCampaign } from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { RegistrationLinkSection, type RegistrationLinkMode } from '@/components/admin/RegistrationLinkSection';
import { EventPaymentSection } from '@/components/admin/EventPaymentSection';

type CreateCampaignFormProps = {
  variant: 'campaign' | 'event';
};

const copy = {
  campaign: {
    backHref: '/admin/campanhas',
    backLabel: '← Campanhas',
    title: 'Nova campanha',
    submitIdle: 'Criar campanha',
    errorCreate: 'Erro ao criar campanha',
    successPath: '/admin/campanhas',
  },
  event: {
    title: 'Novo evento',
    submitIdle: 'Criar evento',
    errorCreate: 'Erro ao criar evento',
    successPath: '/admin/eventos',
  },
} as const;

export function CreateCampaignForm({ variant }: CreateCampaignFormProps) {
  const c = copy[variant];
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [wantsRegistrationLink, setWantsRegistrationLink] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<RegistrationLinkMode>('form');
  const [registrationExternalUrl, setRegistrationExternalUrl] = useState('');
  const [registrationFieldKeys, setRegistrationFieldKeys] = useState<string[]>([]);
  const [registrationObservationText, setRegistrationObservationText] = useState('');
  const [associadosOnly, setAssociadosOnly] = useState(false);
  const [inscriptionLimit, setInscriptionLimit] = useState<number | null>(null);
  const [wantsPixPayment, setWantsPixPayment] = useState(false);
  const [pixImageUrl, setPixImageUrl] = useState('');
  const [pixCopyPaste, setPixCopyPaste] = useState('');
  const [pixObservationText, setPixObservationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('Você precisa estar logado como administrador');
        setLoading(false);
        return;
      }
      const idTokenResult = await user.getIdTokenResult();
      const isClaimAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin);
      if (!isClaimAdmin) {
        const db = getFirestore();
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          setError('Acesso não autorizado');
          setLoading(false);
          return;
        }
      }

      if (variant === 'event' && wantsRegistrationLink) {
        if (registrationMode === 'external' && !registrationExternalUrl.trim()) {
          setError('Configure a inscrição: informe a URL do link externo ou desative a opção.');
          setLoading(false);
          return;
        }
        if (registrationMode === 'form' && registrationFieldKeys.length === 0) {
          setError('Configure a inscrição: selecione ao menos um campo ou desative a opção.');
          setLoading(false);
          return;
        }
      }

      if (variant === 'event' && wantsPixPayment) {
        const hasImg = Boolean(pixImageUrl.trim());
        const hasCode = Boolean(pixCopyPaste.trim());
        if (!hasImg && !hasCode) {
          setError('Pagamentos PIX: envie a foto do QR ou informe o código copia e cola, ou desmarque a opção.');
          setLoading(false);
          return;
        }
      }

      await createCampaign({
        title,
        description,
        fullDescription: fullDescription || undefined,
        date: date || undefined,
        category: category || undefined,
        image: imageUrl || undefined,
        ...(variant === 'event' && wantsRegistrationLink
          ? {
              registrationConfig:
                registrationMode === 'external'
                  ? { type: 'external', url: registrationExternalUrl.trim() }
                  : {
                      type: 'form',
                      fieldKeys: registrationFieldKeys,
                      associadosOnly,
                      ...(registrationObservationText.trim()
                        ? { observationText: registrationObservationText.trim() }
                        : {}),
                      ...(inscriptionLimit != null && inscriptionLimit > 0
                        ? { inscriptionLimit: inscriptionLimit }
                        : {}),
                    },
            }
          : {}),
        ...(variant === 'event' && wantsPixPayment && (pixImageUrl.trim() || pixCopyPaste.trim())
          ? {
              paymentConfig: {
                ...(pixImageUrl.trim() ? { pixImageUrl: pixImageUrl.trim() } : {}),
                ...(pixCopyPaste.trim() ? { pixCopyPaste: pixCopyPaste.trim() } : {}),
                ...(pixObservationText.trim() ? { pixObservationText: pixObservationText.trim() } : {}),
              },
            }
          : {}),
      });
      router.push(c.successPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : c.errorCreate;
      setError(msg || c.errorCreate);
    } finally {
      setLoading(false);
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
      async function compressImage(input: File, maxDim = 1600, quality = 0.75): Promise<Blob | null> {
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
        } catch {
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
      }

      const compressed = await compressImage(file, 1600, 0.75);
      const toUpload = compressed && compressed.size > 0 ? compressed : file;
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
        setImageUrl(data.data.url);
      } else {
        setImageError('Erro ao enviar imagem');
      }
    } catch {
      setImageError('Erro ao enviar imagem');
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <div>
      {variant === 'campaign' && (
        <Link href={copy.campaign.backHref} className="text-sm text-cdl-blue hover:underline mb-4 inline-block">
          {copy.campaign.backLabel}
        </Link>
      )}
      <h1 className="text-2xl font-bold text-gray-900">{c.title}</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">Título</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descrição curta</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Foto destaque</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) uploadImageFile(file);
              }}
            />
            {imageUploading && <span className="text-sm text-cdl-gray-text">Enviando...</span>}
            {imageError && <span className="text-sm text-red-600">{imageError}</span>}
          </div>
          {imageUrl && (
            <div className="mt-3">
              <img src={imageUrl} alt="preview" className="w-48 h-auto rounded-md border" />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descrição completa</label>
          <textarea
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data/Período</label>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="ex: Junho, Novembro - Dezembro"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Categoria</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="ex: Networking, Festival, Campanha"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        {variant === 'event' && (
          <>
            <RegistrationLinkSection
              wantsLink={wantsRegistrationLink}
              onWantsLinkChange={(value) => {
                setWantsRegistrationLink(value);
                if (!value) {
                  setRegistrationObservationText('');
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
              pixPayment={
                wantsRegistrationLink
                  ? {
                      enabled: wantsPixPayment,
                      onEnabledChange: setWantsPixPayment,
                      pixImageUrl,
                      onPixImageUrlChange: setPixImageUrl,
                      pixCopyPaste,
                      onPixCopyPasteChange: setPixCopyPaste,
                      pixObservationText,
                      onPixObservationTextChange: setPixObservationText,
                    }
                  : undefined
              }
            />
            {!wantsRegistrationLink && (
              <EventPaymentSection
                enabled={wantsPixPayment}
                onEnabledChange={setWantsPixPayment}
                pixImageUrl={pixImageUrl}
                onPixImageUrlChange={setPixImageUrl}
                pixCopyPaste={pixCopyPaste}
                onPixCopyPasteChange={setPixCopyPaste}
                pixObservationText={pixObservationText}
                onPixObservationTextChange={setPixObservationText}
              />
            )}
          </>
        )}
        <div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : c.submitIdle}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
