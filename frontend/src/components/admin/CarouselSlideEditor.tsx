'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  listCarouselSlides,
  getCarouselSlide,
  createCarouselSlide,
  updateCarouselSlide,
  type CarouselSlide,
} from '@/lib/firestore';

type CarouselSlideEditorProps = {
  mode: 'create' | 'edit';
  slideId?: string;
};

const emptyForm = {
  title: '',
  description: '',
  photo: '',
  photoLink: '',
  buttons: [{ text: '', href: '' }],
  order: 0,
};

export function CarouselSlideEditor({ mode, slideId }: CarouselSlideEditorProps) {
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError('');
      setPageLoading(true);
      try {
        if (mode === 'edit') {
          if (!slideId?.trim()) {
            setLoadError('Slide não encontrado.');
            return;
          }
          const slide = await getCarouselSlide(slideId);
          if (cancelled) return;
          if (!slide) {
            setLoadError('Slide não encontrado.');
            return;
          }
          setEditingSlide(slide);
          setFormData({
            title: slide.title,
            description: slide.description,
            photo: slide.photo || '',
            photoLink: slide.photoLink || '',
            buttons:
              slide.buttons && slide.buttons.length > 0
                ? slide.buttons
                : [{ text: '', href: '' }],
            order: slide.order,
          });
        } else {
          const slides = await listCarouselSlides();
          if (cancelled) return;
          const maxOrder = slides.length > 0 ? Math.max(...slides.map((s) => s.order)) : -1;
          setFormData({
            ...emptyForm,
            order: maxOrder + 1,
          });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadError('Erro ao carregar dados.');
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, slideId]);

  const handleAddButton = () => {
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { text: '', href: '' }],
    });
  };

  const handleRemoveButton = (index: number) => {
    setFormData({
      ...formData,
      buttons: formData.buttons.filter((_, i) => i !== index),
    });
  };

  const handleButtonChange = (index: number, field: 'text' | 'href', value: string) => {
    const newButtons = [...formData.buttons];
    newButtons[index][field] = value;
    setFormData({ ...formData, buttons: newButtons });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const hasFilledButtons = formData.buttons.some((b) => b.text.trim() || b.href.trim());
      const isPhotoOnlySlide =
        Boolean(formData.photo) &&
        !formData.title.trim() &&
        !formData.description.trim() &&
        !hasFilledButtons;
      const slideData = {
        title: formData.title,
        description: formData.description,
        photo: formData.photo || null,
        photoLink: isPhotoOnlySlide ? formData.photoLink.trim() || null : null,
        buttons: formData.buttons.filter((b) => b.text && b.href),
        order: formData.order,
      };

      if (mode === 'edit' && editingSlide?.id) {
        await updateCarouselSlide(editingSlide.id, slideData);
      } else {
        await createCarouselSlide(slideData);
      }

      router.push('/admin/carousel');
    } catch (error) {
      console.error('Erro ao salvar slide:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = process.env.NEXT_PUBLIC_IMGBB_KEY;
    if (!apiKey || apiKey.includes('NEXT_PUBLIC_IMGBB_KEY')) {
      alert(
        'Erro: Chave da API ImgBB não está configurada. Por favor, configure a variável de ambiente NEXT_PUBLIC_IMGBB_KEY.'
      );
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('image', file);
    uploadFormData.append('key', apiKey);

    try {
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();
      if (data.success) {
        setFormData({ ...formData, photo: data.data.url });
      } else {
        console.error('Erro na resposta da API ImgBB:', data);
        alert(`Erro ao fazer upload: ${data.error?.message || 'Resposta inválida da API'}`);
      }
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Verifique sua conexão e tente novamente.');
    }
  };

  if (pageLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cdl-blue" />
        <p className="mt-2 text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6">
        <Link href="/admin/carousel" className="mb-4 inline-block text-sm text-cdl-blue hover:underline">
          ← Carrossel
        </Link>
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6">
      <Link href="/admin/carousel" className="mb-4 inline-block text-sm text-cdl-blue hover:underline">
        ← Carrossel
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">
        {mode === 'edit' ? 'Editar slide' : 'Novo slide'}
      </h1>
      <p className="mt-1 text-gray-600">
        {mode === 'edit'
          ? 'Altere os dados do slide e salve para atualizar o carrossel.'
          : 'Preencha os campos abaixo para adicionar um slide ao carrossel da página inicial.'}
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {Boolean(formData.photo) &&
            !formData.title.trim() &&
            !formData.description.trim() &&
            !formData.buttons.some((b) => b.text.trim() || b.href.trim()) && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                Slide apenas com foto detectado. Você pode informar um link para a foto.
              </div>
            )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                required={!formData.photo}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ordem</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
              required={!formData.photo}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Imagem</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
            />
            {formData.photo && (
              <div className="mt-2">
                <img src={formData.photo} alt="Preview" className="h-32 rounded-lg object-cover" />
                <p className="mt-2 text-xs text-gray-500">
                  Com imagem enviada, título e descrição tornam-se opcionais.
                </p>
              </div>
            )}
          </div>

          {Boolean(formData.photo) &&
            !formData.title.trim() &&
            !formData.description.trim() &&
            !formData.buttons.some((b) => b.text.trim() || b.href.trim()) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Link da foto (opcional)</label>
                <input
                  type="text"
                  value={formData.photoLink}
                  onChange={(e) => setFormData({ ...formData, photoLink: e.target.value })}
                  placeholder="/servicos ou https://exemplo.com"
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                />
                <p className="mt-1 text-xs text-gray-500">
                  No site, ao clicar nesta foto, o usuário será direcionado para este link.
                </p>
              </div>
            )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-700">Botões</label>
              <button
                type="button"
                onClick={handleAddButton}
                className="text-sm font-medium text-cdl-blue hover:text-cdl-blue-dark"
              >
                + Adicionar Botão
              </button>
            </div>
            {formData.buttons.map((button, index) => (
              <div key={index} className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  placeholder="Texto do botão"
                  value={button.text}
                  onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                />
                <input
                  type="url"
                  placeholder="URL do botão"
                  value={button.href}
                  onChange={(e) => handleButtonChange(index, 'href', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                />
                {formData.buttons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveButton(index)}
                    className="h-10 rounded-lg px-3 py-2 text-red-600 transition-colors hover:bg-red-50"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-cdl-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cdl-blue-dark disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : mode === 'edit' ? 'Atualizar' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/carousel')}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
