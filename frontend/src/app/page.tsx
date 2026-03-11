import Link from 'next/link';
import Image from 'next/image';
import { Hero } from '@/components/home/Hero';
import { ServicesPreview } from '@/components/home/ServicesPreview';
import { Stats } from '@/components/home/Stats';
import { LatestNews } from '@/components/home/LatestNews';
import { EconomicIndicators } from '@/components/home/EconomicIndicators';
import { CTA } from '@/components/home/CTA';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <LatestNews />
      <EconomicIndicators />
      <ServicesPreview />
      <CTA />
    </>
  );
}
