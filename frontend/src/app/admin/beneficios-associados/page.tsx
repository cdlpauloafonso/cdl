'use client';

import { useEffect, useState } from 'react';
import {
  getBeneficiosAssociados,
  setBeneficiosAssociados,
  type BeneficiosAssociadosItem,
} from '@/lib/firestore';
import { BeneficiosParceirosAdmin } from '@/components/admin/BeneficiosParceirosAdmin';
import { SuccessModal } from '@/components/ui/SuccessModal';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

export default function AdminBeneficiosAssociadosPage() {
  const [data, setData] = useState<BeneficiosAssociadosItem>({
    title: '',
    description: '',
    photo: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    getBeneficiosAssociados()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function uploadImageFile(file?: File | null) {
    if (!file) return;
    setImageError('');
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('key', IMGBB_KEY || '');

      const res = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Falha no upload da imagem');

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Erro no upload');

      setData((prev) => ({ ...prev, photo: json.data.url }));
    } catch (e: unknown) {
      setImageError(e instanceof Error ? e.message : 'Erro ao fazer upload');
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await setBeneficiosAssociados(data);
      setShowSuccessModal(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  const fieldLabel = 'mb-1 block text-xs font-medium text-gray-700 sm:text-sm';

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <div className="mb-4 sm:mb-5">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Benefícios para Associados</h1>
          <p className="mt-1 text-sm text-cdl-gray-text sm:text-base">
            Edite o cabeçalho da página e gerencie parceiros abaixo. Ativar/desativar vale só para cada parceiro.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 sm:space-y-4 lg:space-y-3">
          {/* Mobile: coluna única; desktop: foto compacta à esquerda + texto à direita */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,260px)_1fr]">
            <div className="min-w-0 lg:max-w-[260px]">
              <label className={fieldLabel}>Foto principal</label>
              {data.photo ? (
                <div className="relative mt-1">
                  <img
                    src={data.photo}
                    alt="Foto principal"
                    className="aspect-[16/10] w-full rounded-lg border border-gray-200 object-cover sm:aspect-[4/3] lg:aspect-square lg:max-h-[200px] lg:w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setData((prev) => ({ ...prev, photo: null }))}
                    className="absolute right-1.5 top-1.5 rounded-md bg-red-500 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-red-600 sm:right-2 sm:top-2 sm:px-2.5 sm:text-sm"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="mt-1 rounded-lg border-2 border-dashed border-gray-300 p-3 sm:p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadImageFile(e.target.files?.[0])}
                    disabled={imageUploading}
                    className="block w-full text-xs text-gray-600 file:mr-2 file:rounded-full file:border-0 file:bg-cdl-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-cdl-blue-dark sm:text-sm file:sm:mr-4 file:sm:px-4 file:sm:py-2 file:sm:text-sm"
                  />
                  {imageUploading && <p className="mt-1.5 text-xs text-gray-500 sm:text-sm">Enviando...</p>}
                  {imageError && <p className="mt-1.5 text-xs text-red-600 sm:text-sm">{imageError}</p>}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:gap-3 lg:gap-2.5">
              <div>
                <label htmlFor="title" className={fieldLabel}>
                  Título
                </label>
                <input
                  id="title"
                  type="text"
                  value={data.title}
                  onChange={(e) => setData((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cdl-blue sm:px-3 sm:py-2 sm:text-base"
                  placeholder="Ex: Benefícios Exclusivos para Associados"
                />
              </div>

              <div className="min-h-0 flex-1">
                <label htmlFor="description" className={fieldLabel}>
                  Descrição
                </label>
                <textarea
                  id="description"
                  value={data.description}
                  onChange={(e) => setData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  className="mt-1 min-h-[120px] w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm leading-relaxed focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cdl-blue sm:min-h-[140px] sm:px-3 sm:py-2 sm:text-base lg:min-h-[168px]"
                  placeholder="Descreva os benefícios oferecidos aos associados..."
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:px-4 sm:py-3">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3 sm:pt-0">
            <a
              href="/servicos/beneficios-associados"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-md border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 sm:px-4"
            >
              Ver no site
            </a>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center rounded-md bg-cdl-blue px-3 py-2 text-sm font-medium text-white hover:bg-cdl-blue-dark disabled:opacity-50 sm:px-4"
            >
              {saving ? 'Salvando...' : 'Salvar cabeçalho'}
            </button>
          </div>
        </form>
      </div>

      <BeneficiosParceirosAdmin />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Cabeçalho salvo com sucesso!"
      />
    </div>
  );
}
