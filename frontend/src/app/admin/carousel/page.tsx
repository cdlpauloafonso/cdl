'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  listCarouselSlides,
  deleteCarouselSlide,
  updateCarouselSlide,
  sortCarouselSlidesAdminList,
  type CarouselSlide,
} from '@/lib/firestore';
import { SuccessModal } from '@/components/ui/SuccessModal';

export default function CarouselPage() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = async () => {
    try {
      const data = await listCarouselSlides();
      setSlides(sortCarouselSlidesAdminList(data));
    } catch (error) {
      console.error('Erro ao carregar slides:', error);
    } finally {
      setLoading(false);
    }
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

  const handleToggleEnabled = async (slide: CarouselSlide) => {
    if (!slide.id) return;
    setUpdatingStatusId(slide.id);
    try {
      await updateCarouselSlide(slide.id, { enabled: slide.enabled === false });
      await loadSlides();
    } catch (error) {
      console.error('Erro ao atualizar status do slide:', error);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cdl-blue" />
        <p className="mt-2 text-gray-600">Carregando slides...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Carrossel</h1>
          <p className="mt-1 text-gray-600">Gerencie os slides do carrossel da página inicial</p>
        </div>
        <div className="flex w-full sm:w-auto">
          <Link href="/admin/carousel/novo" className="btn-primary w-full px-4 py-2 text-center sm:w-auto">
            Novo slide
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-2.5 py-2 sm:px-3 sm:py-2">
          <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Slides Existentes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {slides.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-500 sm:py-5 sm:text-sm">
              Nenhum slide encontrado. Use o botão <strong className="font-medium text-gray-700">Novo slide</strong> para
              criar.
            </div>
          ) : (
            slides.map((slide) => (
              <div key={slide.id} className="px-2.5 py-2.5 sm:px-3 sm:py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                  {slide.photo && (
                    <img
                      src={slide.photo}
                      alt={slide.title || 'Slide'}
                      className="h-11 w-[4.5rem] shrink-0 rounded-md object-cover ring-1 ring-gray-100 sm:h-[52px] sm:w-24"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="text-sm font-semibold leading-snug text-gray-900 break-words">
                        {slide.title || '—'}
                      </h3>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-[11px]">
                        Ordem {slide.order}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium sm:text-[11px] ${
                          slide.enabled === false ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {slide.enabled === false ? 'Desabilitado' : 'Ativo'}
                      </span>
                    </div>
                    {slide.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600">{slide.description}</p>
                    ) : null}
                    {slide.buttons && slide.buttons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {slide.buttons.map((button, index) => (
                          <span
                            key={index}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 sm:text-xs"
                          >
                            {button.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 sm:ml-auto sm:flex-col sm:gap-1 md:flex-row md:gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleToggleEnabled(slide)}
                      disabled={updatingStatusId === slide.id}
                      className="rounded-md px-2 py-1 text-left text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50 sm:px-2.5 sm:py-1.5"
                    >
                      {updatingStatusId === slide.id
                        ? 'Salvando...'
                        : slide.enabled === false
                          ? 'Habilitar'
                          : 'Desabilitar'}
                    </button>
                    <Link
                      href={`/admin/carousel/editar?id=${encodeURIComponent(slide.id || '')}`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-cdl-blue transition-colors hover:bg-cdl-blue/10 sm:px-2.5 sm:py-1.5"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(slide.id!)}
                      className="rounded-md px-2 py-1 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 sm:px-2.5 sm:py-1.5"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message="Salvo com sucesso!" />
    </div>
  );
}
