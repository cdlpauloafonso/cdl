'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type CarouselSlideData = {
  title: string;
  subtitle: string;
  photo: string | null;
  buttons: { text: string; href: string }[];
};

type HeroCarouselProps = {
  slides: CarouselSlideData[];
  autoSlideInterval?: number;
};

export function HeroCarousel({ slides, autoSlideInterval = 5000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length, autoSlideInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    goToSlide((currentIndex + 1) % slides.length);
  };

  if (slides.length === 0) return null;

  return (
    <section className="relative overflow-hidden h-[500px] sm:h-[600px] lg:h-[650px]">
      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`transition-opacity duration-700 ease-in-out absolute inset-0 flex flex-col justify-center overflow-hidden h-full ${
              index === currentIndex ? 'opacity-100 relative z-10' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={index !== currentIndex}
          >
            {/* Background: foto ou gradiente */}
            <div className="absolute inset-0 -z-10 h-full">
              {slide.photo ? (
                <>
                  <Image
                    src={slide.photo}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100vw"
                    unoptimized={slide.photo.startsWith('http')}
                  />
                  <div className="absolute inset-0 h-full bg-gradient-to-br from-cdl-blue/90 via-cdl-blue-dark/85 to-cdl-blue/90" />
                </>
              ) : (
                <div className="absolute inset-0 h-full bg-gradient-to-br from-cdl-blue via-cdl-blue-dark to-cdl-blue" />
              )}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08)_0%,_transparent_50%)]" aria-hidden="true" />

            <div className="container-cdl relative w-full flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  {slide.title}
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-blue-100/95 leading-relaxed">
                  {slide.subtitle}
                </p>
                {slide.buttons && slide.buttons.length > 0 && (
                  <div className="mt-10 flex flex-wrap gap-4">
                    {slide.buttons.map((btn, i) => (
                      <Link
                        key={i}
                        href={btn.href}
                        className={
                          i === 0
                            ? 'inline-flex items-center rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-cdl-blue shadow-sm hover:bg-blue-50 transition-colors'
                            : 'inline-flex items-center rounded-lg border-2 border-white/80 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors'
                        }
                      >
                        {btn.text}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controles */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Slide anterior"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Próximo slide"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Ir para slide ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : 'false'}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
