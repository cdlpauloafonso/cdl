'use client';

import { useState } from 'react';
import type { CampaignPaymentProvider } from '@/lib/firestore';
import { formatBrlCurrencyInput } from '@/lib/campaign-payment-admin';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

export type EventPaymentSectionProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  provider: CampaignPaymentProvider;
  onProviderChange: (value: CampaignPaymentProvider) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  amountAssociado: string;
  onAmountAssociadoChange: (value: string) => void;
  paymentDescription: string;
  onPaymentDescriptionChange: (value: string) => void;
  pixImageUrl: string;
  onPixImageUrlChange: (url: string) => void;
  pixCopyPaste: string;
  onPixCopyPasteChange: (text: string) => void;
  pixObservationText: string;
  onPixObservationTextChange: (text: string) => void;
};

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
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) return resolve(blob);
          canvas.toBlob((blob2) => resolve(blob2), 'image/jpeg', quality);
        },
        'image/webp',
        quality
      );
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

/**
 * Pagamento na inscrição: PIX manual (QR/copia e cola) ou cobrança Asaas (link automático).
 */
export function EventPaymentSection({
  enabled,
  onEnabledChange,
  provider,
  onProviderChange,
  amount,
  onAmountChange,
  amountAssociado,
  onAmountAssociadoChange,
  paymentDescription,
  onPaymentDescriptionChange,
  pixImageUrl,
  onPixImageUrlChange,
  pixCopyPaste,
  onPixCopyPasteChange,
  pixObservationText,
  onPixObservationTextChange,
}: EventPaymentSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function uploadPixImage(file?: File | null) {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      if (!IMGBB_KEY) {
        setUploadError('Chave ImgBB não configurada (NEXT_PUBLIC_IMGBB_KEY).');
        return;
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
      if (data?.data?.url) {
        onPixImageUrlChange(data.data.url as string);
      } else {
        setUploadError('Não foi possível enviar a imagem.');
      }
    } catch {
      setUploadError('Erro ao enviar a imagem.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
      <p className="text-sm font-medium text-gray-900 mb-3">Pagamento na inscrição</p>
      <p className="text-xs text-cdl-gray-text mb-3">
        Opcional. Exija pagamento após o participante preencher o formulário de inscrição.
      </p>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          onChange={(e) => {
            onEnabledChange(e.target.checked);
            if (!e.target.checked) {
              onAmountChange('');
              onAmountAssociadoChange('');
              onPaymentDescriptionChange('');
              onPixImageUrlChange('');
              onPixCopyPasteChange('');
              onPixObservationTextChange('');
            }
          }}
        />
        <span className="text-sm text-gray-700">Exigir pagamento para concluir a inscrição</span>
      </label>

      {enabled && (
        <div className="mt-4 ml-7 space-y-4 border-l-2 border-emerald-600/30 pl-4">
          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-800">Forma de cobrança</span>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="payment-provider"
                className="mt-1"
                checked={provider === 'asaas'}
                onChange={() => onProviderChange('asaas')}
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Asaas (link de pagamento)</span>
                <span className="mt-0.5 block text-xs text-cdl-gray-text">
                  PIX, boleto ou cartão na página do Asaas. Confirmação automática via webhook.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="payment-provider"
                className="mt-1"
                checked={provider === 'manual_pix'}
                onChange={() => onProviderChange('manual_pix')}
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">PIX manual</span>
                <span className="mt-0.5 block text-xs text-cdl-gray-text">
                  QR Code e código copia e cola configurados por você.
                </span>
              </span>
            </label>
          </div>

          {provider === 'asaas' ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Valor normal (R$) <span className="text-red-600">*</span>
                  </label>
                  <p className="mt-0.5 text-xs text-cdl-gray-text">
                    Cobrado para quem não for associado CDL (ou sem CNPJ na base).
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => onAmountChange(formatBrlCurrencyInput(e.target.value))}
                    placeholder="R$ 0,00"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Valor de associado (R$)
                  </label>
                  <p className="mt-0.5 text-xs text-cdl-gray-text">
                    Opcional. Aplicado automaticamente quando o CNPJ estiver cadastrado como associado.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={amountAssociado}
                    onChange={(e) => onAmountAssociadoChange(formatBrlCurrencyInput(e.target.value))}
                    placeholder="R$ 0,00"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição na fatura (opcional)</label>
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => onPaymentDescriptionChange(e.target.value)}
                  placeholder="Ex.: Inscrição — Workshop CDL"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-cdl-gray-text">
                Configure <code className="text-[11px]">ASAAS_API_KEY</code> no servidor e o webhook apontando para{' '}
                <code className="text-[11px]">/api/asaas/webhook</code>. Sandbox funciona antes da conta ser aprovada.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Foto do QR Code (ou comprovante visual)</label>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file) void uploadPixImage(file);
                      e.target.value = '';
                    }}
                  />
                  {uploading && <span className="text-sm text-cdl-gray-text">Enviando...</span>}
                  {uploadError && <span className="text-sm text-red-600">{uploadError}</span>}
                </div>
                {pixImageUrl && (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <img src={pixImageUrl} alt="Prévia PIX" className="max-h-48 w-auto rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => onPixImageUrlChange('')}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remover imagem
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Código PIX (copia e cola)</label>
                <textarea
                  value={pixCopyPaste}
                  onChange={(e) => onPixCopyPasteChange(e.target.value)}
                  rows={4}
                  placeholder='Cole aqui o código PIX (texto longo usado em "Pix copia e cola" no app do banco).'
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Observação na tela PIX</label>
                <textarea
                  value={pixObservationText}
                  onChange={(e) => onPixObservationTextChange(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Após o pagamento, clique em confirmar para finalizar sua inscrição."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-cdl-gray-text">
                  Esse texto aparece na etapa de pagamento PIX da inscrição do evento.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
