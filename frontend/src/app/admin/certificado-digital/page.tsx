'use client';

import { useEffect, useState } from 'react';
import {
  getCertificadoDigital,
  setCertificadoDigital,
  type CertificadoDigitalItem,
} from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

const SECTION_LABELS = [
  { title: 'Seção 1', titlePlaceholder: 'Ex: Como funciona', contentPlaceholder: 'Texto livre. Use quebras de linha. O usuário adiciona todo o conteúdo aqui.' },
  { title: 'Seção 2', titlePlaceholder: 'Ex: Benefício para Associados', contentPlaceholder: 'Texto livre da seção.' },
  { title: 'Seção 3', titlePlaceholder: 'Ex: Documentos necessários', contentPlaceholder: 'Texto livre da seção.' },
];

export default function AdminCertificadoDigitalPage() {
  const [data, setData] = useState<CertificadoDigitalItem>({
    title: '',
    description: '',
    photo: null,
    section1Title: '',
    section1Content: '',
    section2Title: '',
    section2Content: '',
    section3Title: '',
    section3Content: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    getCertificadoDigital()
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
    setError(null);
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

      await setCertificadoDigital(data);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Certificado Digital</h1>
      <p className="mt-2 text-sm text-cdl-gray-text">
        Edite o conteúdo da página. Cada seção tem título e texto livre.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-8 max-w-3xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">Título</label>
          <input
            type="text"
            required
            value={data.title}
            onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Certificado Digital"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Foto de destaque</label>
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
          {data.photo && (
            <div className="mt-4">
              <img src={data.photo} alt="Preview" className="max-w-md h-auto rounded-lg border border-gray-300" />
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
            placeholder="Obtenha facilidade e agilidade na emissão..."
          />
        </div>

        {SECTION_LABELS.map((label, i) => {
          const sectionNum = i + 1;
          const titleKey = `section${sectionNum}Title` as keyof CertificadoDigitalItem;
          const contentKey = `section${sectionNum}Content` as keyof CertificadoDigitalItem;
          return (
            <div key={i} className="p-4 bg-cdl-gray rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{label.title}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Título da seção</label>
                  <input
                    type="text"
                    value={data[titleKey] as string}
                    onChange={(e) => setData((d) => ({ ...d, [titleKey]: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder={label.titlePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Conteúdo (texto livre)</label>
                  <textarea
                    value={data[contentKey] as string}
                    onChange={(e) => setData((d) => ({ ...d, [contentKey]: e.target.value }))}
                    rows={6}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder={label.contentPlaceholder}
                  />
                  <p className="mt-1 text-xs text-cdl-gray-text">Quebras de linha serão preservadas.</p>
                </div>
              </div>
            </div>
          );
        })}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
      
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Salvo com sucesso!"
      />
    </div>
  );
}
