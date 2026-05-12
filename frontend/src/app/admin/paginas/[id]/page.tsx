'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCarouselSlide,
  createCarouselSlide,
  updateCarouselSlide,
  type CarouselSlide,
  type CarouselButton,
} from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

export default function AdminPaginaEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'nova';
  const [slide, setSlide] = useState<Partial<CarouselSlide>>({
    title: '',
    description: '',
    photo: null,
    photoLink: null,
    buttons: [],
    order: 0,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) {
      setSlide((s) => ({ ...s, order: 0 }));
      setLoading(false);
      return;
    }
    getCarouselSlide(id)
      .then((s) => s && setSlide(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isNew]);

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
      const data = await res.json();
      if (data?.data?.url) {
        setSlide((s) => ({ ...s, photo: data.data.url }));
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

      const buttons = (slide.buttons ?? []).filter((b) => b.text?.trim() && b.href?.trim());
      const isPhotoOnlySlide =
        Boolean(slide.photo) &&
        !(slide.title ?? '').trim() &&
        !(slide.description ?? '').trim() &&
        buttons.length === 0;
      const payload: Omit<CarouselSlide, 'id'> = {
        title: slide.title!,
        description: slide.description ?? '',
        photo: slide.photo ?? null,
        photoLink: isPhotoOnlySlide ? (slide.photoLink ?? '').trim() || null : null,
        buttons,
        order: slide.order ?? 0,
      };

      if (isNew) {
        await createCarouselSlide(payload);
        router.push('/admin/paginas');
      } else {
        await updateCarouselSlide(id, payload);
        router.push('/admin/paginas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const buttons = (slide.buttons ?? []) as CarouselButton[];
  const isPhotoOnlyDraft =
    Boolean(slide.photo) &&
    !(slide.title ?? '').trim() &&
    !(slide.description ?? '').trim() &&
    !buttons.some((b) => (b.text ?? '').trim() || (b.href ?? '').trim());

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div>
      <Link href="/admin/paginas" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">← Páginas</Link>
      <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'Novo slide' : 'Editar slide'}</h1>
      <p className="mt-1 text-sm text-cdl-gray-text">Slide do carrossel inicial do site</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">Título</label>
          <input
            type="text"
            required
            value={slide.title ?? ''}
            onChange={(e) => setSlide((s) => ({ ...s, title: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Ex: A CDL que faz sua empresa crescer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            required
            value={slide.description ?? ''}
            onChange={(e) => setSlide((s) => ({ ...s, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Texto exibido abaixo do título no carrossel"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Foto de fundo</label>
          <p className="mt-1 text-xs text-cdl-gray-text mb-2">
            Sugestão: 1920×650 px (proporção ~3:1). A imagem será recortada para caber no carrossel.
          </p>
          <div className="mt-1 flex items-center gap-3">
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
          {slide.photo && (
            <div className="mt-4">
              <img src={slide.photo} alt="Preview" className="max-w-md h-auto rounded-lg border border-gray-300" />
              <button
                type="button"
                onClick={() => setSlide((s) => ({ ...s, photo: null }))}
                className="mt-2 text-sm text-red-600 hover:underline"
              >
                Remover foto
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-cdl-gray-text">Opcional. Se não houver foto, o gradiente padrão será usado.</p>
        </div>

        {isPhotoOnlyDraft && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Link da foto (opcional)</label>
            <input
              type="text"
              value={slide.photoLink ?? ''}
              onChange={(e) => setSlide((s) => ({ ...s, photoLink: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="/servicos ou https://exemplo.com"
            />
            <p className="mt-1 text-xs text-cdl-gray-text">
              Quando o slide tiver somente foto, este link torna a imagem clicável no site.
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Botões</label>
            <button
              type="button"
              onClick={() => setSlide((s) => ({ ...s, buttons: [...buttons, { text: '', href: '' }] }))}
              className="text-sm text-cdl-blue hover:underline font-medium"
            >
              + Adicionar botão
            </button>
          </div>
          <p className="text-xs text-cdl-gray-text mb-3">Nome = texto do botão. Link = destino ao clicar.</p>
          <div className="space-y-3">
            {buttons.map((btn, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome do botão</label>
                    <input
                      type="text"
                      value={btn.text}
                      onChange={(e) => {
                        const updated = [...buttons];
                        updated[index] = { ...updated[index], text: e.target.value };
                        setSlide((s) => ({ ...s, buttons: updated }));
                      }}
                      placeholder="Ex: Associe-se"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Link</label>
                    <input
                      type="text"
                      value={btn.href}
                      onChange={(e) => {
                        const updated = [...buttons];
                        updated[index] = { ...updated[index], href: e.target.value };
                        setSlide((s) => ({ ...s, buttons: updated }));
                      }}
                      placeholder="/associe-se ou https://..."
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSlide((s) => ({ ...s, buttons: buttons.filter((_, i) => i !== index) }))}
                  className="text-sm text-red-600 hover:underline mt-6"
                >
                  Remover
                </button>
              </div>
            ))}
            {buttons.length === 0 && (
              <p className="text-sm text-cdl-gray-text italic py-4 text-center border border-dashed border-gray-300 rounded-lg">
                Nenhum botão. Clique em &quot;Adicionar botão&quot; para criar.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Ordem</label>
          {isNew ? (
            <>
              <input
                type="number"
                min={0}
                value={0}
                readOnly
                disabled
                className="mt-1 block w-full max-w-[120px] cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600"
              />
              <p className="mt-1 text-xs text-cdl-gray-text">
                O novo slide entra em primeiro (ordem 0). Os demais são renumerados automaticamente.
              </p>
            </>
          ) : (
            <>
              <input
                type="number"
                min={0}
                value={slide.order ?? 0}
                onChange={(e) => setSlide((s) => ({ ...s, order: parseInt(e.target.value, 10) || 0 }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 max-w-[120px]"
              />
              <p className="mt-1 text-xs text-cdl-gray-text">Menor número aparece primeiro entre os slides ativos no site.</p>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
