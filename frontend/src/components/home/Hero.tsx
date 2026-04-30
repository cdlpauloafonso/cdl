'use client';

import { useEffect, useState } from 'react';
import { HeroCarousel, type CarouselSlideData } from './HeroCarousel';
import { listCarouselSlides } from '@/lib/firestore';

const DEFAULT_SLIDES: CarouselSlideData[] = [
  {
    title: 'A CDL que faz sua empresa vender mais, gastar menos e crescer mais rápido',
    subtitle: 'Comunidade empresarial de Paulo Afonso. Serviços, networking e apoio ao comércio local.',
    photo: null,
    photoLink: null,
    buttons: [
      { text: 'Associe-se', href: '/associe-se' },
      { text: 'Conheça os serviços', href: '/servicos' },
    ],
  },
];

export function Hero() {
  const [slides, setSlides] = useState<CarouselSlideData[]>(DEFAULT_SLIDES);

  useEffect(() => {
    listCarouselSlides()
      .then((items) => {
        const enabledItems = items.filter((item) => item.enabled !== false);
        if (enabledItems.length > 0) {
          setSlides(
            enabledItems.map((s) => ({
              title: s.title,
              subtitle: s.description,
              photo: s.photo,
              photoLink: s.photoLink ?? null,
              buttons: s.buttons ?? [],
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return <HeroCarousel slides={slides} autoSlideInterval={5000} />;
}
