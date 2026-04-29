'use client';

import { useEffect, useState } from 'react';
import {
  getAuditorium,
  setAuditorium,
  type AuditoriumItem,
} from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

export default function AdminAuditorioPage() {
  const [data, setData] = useState<AuditoriumItem>({
    title: '',
    description: '',
    photo: null,
    infrastructureTitle: 'Infraestrutura',
    infrastructureItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getAuditorium()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          return await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) return resolve(blob);
              canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
            }, 'image/webp', quality);
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
        form.append('image', toUpload, file.name.replace(/\.[^/.]+$/, '') + '.jpg');
      } else {
        form.append('image', toUpload as File);
      }

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: 'POST',
        body: form,
      });
      const result = await res.json();
      if (result?.data?.url) {
        setData((d) => ({ ...d, photo: result.data.url }));
      } else {
        setImageError('Erro ao enviar imagem');
      }
    } catch {
      setImageError('Erro ao enviar imagem');
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('Você precisa estar logado como administrador');
        return;
      }
      const idTokenResult = await user.getIdTokenResult();
      const isClaimAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin);
      if (!isClaimAdmin) {
        const db = getFirestore();
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          setError('Acesso não autorizado');
          return;
        }
      }

      await setAuditorium(data);
      alert('Salvo com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <h1 className="text-2xl font-bold text-gray-900">Auditório</h1>
      <p className="mt-2 text-sm text-cdl-gray-text">
        Edite o conteúdo da página do Auditório para Eventos
      </p>
      <form onSubmit={handleSubmit} className="mt-4 max-w-3xl space-y-4 sm:mt-6 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Título</label>
          <input
            type="text"
            required
            value={data.title}
            onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Auditório para Eventos"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Foto de destaque</label>
          <div className="mt-1 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImageFile(file);
              }}
              disabled={imageUploading}
              className="block text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cdl-blue file:text-white hover:file:bg-cdl-blue-dark file:cursor-pointer"
            />
            {imageUploading && <span className="text-sm text-cdl-gray-text">Enviando...</span>}
            {imageError && <span className="text-sm text-red-600">{imageError}</span>}
          </div>
          {data.photo && (
            <div className="mt-4">
              <img src={data.photo} alt="Preview" className="h-auto w-full max-w-md rounded-lg border border-gray-300" />
              <button
                type="button"
                onClick={() => setData((d) => ({ ...d, photo: null }))}
                className="mt-2 text-sm text-red-600 hover:underline"
              >
                Remover foto
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            required
            value={data.description}
            onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
            rows={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Realize seus eventos com conforto e tecnologia..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Título da seção Infraestrutura</label>
          <input
            type="text"
            value={data.infrastructureTitle}
            onChange={(e) => setData((d) => ({ ...d, infrastructureTitle: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Infraestrutura"
          />
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="block text-sm font-medium text-gray-700">Itens da infraestrutura</label>
            <button
              type="button"
              onClick={() => setData((d) => ({ ...d, infrastructureItems: [...d.infrastructureItems, ''] }))}
              className="text-left text-sm font-medium text-cdl-blue hover:underline sm:text-right"
            >
              + Adicionar item
            </button>
          </div>
          <div className="space-y-2">
            {data.infrastructureItems.map((item, index) => (
              <div key={index} className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...data.infrastructureItems];
                    updated[index] = e.target.value;
                    setData((d) => ({ ...d, infrastructureItems: updated }));
                  }}
                  placeholder="Ex: Sistema de som e iluminação profissional"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      infrastructureItems: d.infrastructureItems.filter((_, i) => i !== index),
                    }))
                  }
                  className="self-start px-1 text-xs text-red-600 hover:underline sm:px-2 sm:text-sm"
                >
                  Remover
                </button>
              </div>
            ))}
            {data.infrastructureItems.length === 0 && (
              <p className="text-sm text-cdl-gray-text italic py-4 text-center border border-dashed border-gray-300 rounded-lg">
                Nenhum item. Clique em &quot;Adicionar item&quot; para incluir.
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
