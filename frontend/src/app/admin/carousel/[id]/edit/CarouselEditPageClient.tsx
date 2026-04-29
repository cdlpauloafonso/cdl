'use client';

import { useParams } from 'next/navigation';
import { CarouselSlideEditor } from '@/components/admin/CarouselSlideEditor';

export function CarouselEditPageClient() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  return <CarouselSlideEditor mode="edit" slideId={id} />;
}
