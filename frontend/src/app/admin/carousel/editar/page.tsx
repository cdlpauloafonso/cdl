'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CarouselSlideEditor } from '@/components/admin/CarouselSlideEditor';

function CarouselEditByQueryContent() {
  const searchParams = useSearchParams();
  const id = (searchParams.get('id') || '').trim();
  return <CarouselSlideEditor mode="edit" slideId={id} />;
}

export default function CarouselEditByQueryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cdl-blue" />
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      }
    >
      <CarouselEditByQueryContent />
    </Suspense>
  );
}
