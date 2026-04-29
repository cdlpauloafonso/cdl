'use client';

import { useEffect, useState } from 'react';
import { listCarouselSlides, createCarouselSlide, updateCarouselSlide, deleteCarouselSlide, type CarouselSlide } from '@/lib/firestore';
import Link from 'next/link';
import { SuccessModal } from '@/components/ui/SuccessModal';

export default function CarouselPage() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    photo: '',
    photoLink: '',
    buttons: [{ text: '', href: '' }],
    order: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = async () => {
    try {
      const data = await listCarouselSlides();
      setSlides(data);
    } catch (error) {
      console.error('Erro ao carregar slides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (slide: CarouselSlide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      description: slide.description,
      photo: slide.photo || '',
      photoLink: slide.photoLink || '',
      buttons: slide.buttons || [{ text: '', href: '' }],
      order: slide.order
    });
  };

  const handleAddButton = () => {
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { text: '', href: '' }]
    });
  };

  const handleRemoveButton = (index: number) => {
    setFormData({
      ...formData,
      buttons: formData.buttons.filter((_, i) => i !== index)
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
        buttons: formData.buttons.filter(b => b.text && b.href),
        order: formData.order
      };

      if (editingSlide) {
        await updateCarouselSlide(editingSlide.id!, slideData);
      } else {
        await createCarouselSlide(slideData);
      }

      await loadSlides();
      handleCancel();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao salvar slide:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEditingSlide(null);
    setFormData({
      title: '',
      description: '',
      photo: '',
      photoLink: '',
      buttons: [{ text: '', href: '' }],
      order: 0
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este slide?')) return;

    try {
      await deleteCarouselSlide(id);
      await loadSlides();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao excluir slide:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica se a chave da API está configurada
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_KEY;
    if (!apiKey || apiKey.includes('NEXT_PUBLIC_IMGBB_KEY')) {
      alert('Erro: Chave da API ImgBB não está configurada. Por favor, configure a variável de ambiente NEXT_PUBLIC_IMGBB_KEY.');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('image', file);
    uploadFormData.append('key', apiKey);

    try {
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: uploadFormData
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue"></div>
        <p className="mt-2 text-gray-600">Carregando slides...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Carrossel</h1>
          <p className="text-gray-600 mt-1">Gerencie os slides do carrossel da página inicial</p>
        </div>
        <Link
          href="/admin"
          className="w-full rounded-lg bg-gray-100 px-4 py-2 text-center text-gray-700 transition-colors hover:bg-gray-200 sm:w-auto"
        >
          ← Voltar
        </Link>
      </div>

      {/* Formulário de Edição */}
      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:mb-6 sm:p-4 lg:p-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">
          {editingSlide ? 'Editar Slide' : 'Novo Slide'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/*
            Quando só houver foto (sem título/descrição/botões), permitimos opcionalmente
            um link para tornar a imagem clicável no carrossel do site.
          */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                required={!formData.photo}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordem
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                required={!formData.photo}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagem
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
            />
            {formData.photo && (
              <div className="mt-2">
                <img
                  src={formData.photo}
                  alt="Preview"
                  className="h-32 object-cover rounded-lg"
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link da foto (opcional)
                </label>
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
              <label className="block text-sm font-medium text-gray-700">
                Botões
              </label>
              <button
                type="button"
                onClick={handleAddButton}
                className="text-cdl-blue hover:text-cdl-blue-dark text-sm font-medium"
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
              {isSubmitting ? 'Salvando...' : (editingSlide ? 'Atualizar' : 'Criar')}
            </button>
            {editingSlide && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de Slides */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-3 sm:p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Slides Existentes</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {slides.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum slide encontrado. Crie seu primeiro slide acima.
            </div>
          ) : (
            slides.map((slide) => (
              <div key={slide.id} className="p-3 sm:p-4 lg:p-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-gray-900 break-words">{slide.title}</h3>
                    <span className="text-xs sm:text-sm text-gray-500">Ordem: {slide.order}</span>
                  </div>
                  <p className="mb-2 text-sm text-gray-600 break-words">{slide.description}</p>
                  {slide.photo && (
                    <img
                      src={slide.photo}
                      alt={slide.title}
                      className="h-16 w-24 rounded object-cover sm:h-20 sm:w-32"
                    />
                  )}
                  {slide.buttons && slide.buttons.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {slide.buttons.map((button, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          {button.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(slide)}
                    className="rounded-lg px-3 py-1.5 text-sm text-cdl-blue transition-colors hover:bg-cdl-blue/10"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(slide.id!)}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Salvo com sucesso!"
      />
    </div>
  );
}
