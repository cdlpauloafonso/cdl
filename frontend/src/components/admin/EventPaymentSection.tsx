'use client';

import { useState } from 'react';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

export type EventPaymentSectionProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
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
    const outputType = 'image/webp';
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) return resolve(blob);
          canvas.toBlob((blob2) => resolve(blob2), 'image/jpeg', quality);
        },
        outputType,
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
 * Pagamento via PIX (foto do QR + código copia e cola), abaixo da inscrição no evento.
 */
export function EventPaymentSection({
  enabled,
  onEnabledChange,
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
      <p className="text-sm font-medium text-gray-900 mb-3">Pagamentos (PIX)</p>
      <p className="text-xs text-cdl-gray-text mb-3">
        Opcional. Exiba na página do evento e na inscrição uma imagem do QR e o código copia e cola para o participante pagar
        pelo app do banco.
      </p>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          onChange={(e) => {
            onEnabledChange(e.target.checked);
            if (!e.target.checked) {
              onPixImageUrlChange('');
              onPixCopyPasteChange('');
              onPixObservationTextChange('');
            }
          }}
        />
        <span className="text-sm text-gray-700">Incluir instruções de pagamento PIX</span>
      </label>

      {enabled && (
        <div className="mt-4 ml-7 space-y-4 border-l-2 border-emerald-600/30 pl-4">
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
        </div>
      )}
    </div>
  );
}
