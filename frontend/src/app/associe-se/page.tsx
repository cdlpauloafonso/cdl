 'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSettings } from '@/lib/firestore';

const WHATSAPP_STORAGE_KEY = 'cdl_whatsapp_number';

function formatWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

export default function AssocieSePage() {
  const [specialistUrl, setSpecialistUrl] = useState('/atendimento');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const env = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() ?? '';
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(WHATSAPP_STORAGE_KEY)?.trim() ?? '' : '';
      let number = '';
      try {
        const settings = await getSettings();
        const apiNum = settings?.whatsapp_number?.trim();
        if (apiNum) number = formatWhatsAppNumber(apiNum);
      } catch {
        // fallback storage/env
      }
      if (!number && stored) number = formatWhatsAppNumber(stored);
      if (!number && env) number = formatWhatsAppNumber(env);
      if (!mounted || !number || number.length < 10) return;
      const msg = encodeURIComponent('Olá! Quero falar com um especialista para associação na CDL Paulo Afonso.');
      setSpecialistUrl(`https://wa.me/${number}?text=${msg}`);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900">Associe-se</h1>
        <p className="mt-4 text-lg text-cdl-gray-text">
          Faça parte da comunidade que impulsiona o comércio de Paulo Afonso. 
          Menos institucional, mais resultado, mais local.
        </p>
        <div className="mt-10 rounded-xl border border-gray-200 bg-cdl-gray/50 p-8">
          <h2 className="text-xl font-semibold text-gray-900">Por que associar-se?</h2>
          <ul className="mt-4 space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Segurança para vender (SPC, consultas)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Apoio institucional e representação do comércio
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Economia de custos em serviços empresariais
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Acesso a estrutura profissional e networking
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cdl-blue mt-0.5">✓</span>
              Pertencimento a um grupo forte e conectado
            </li>
          </ul>
        </div>
        <div className="mt-10">
          <p className="text-gray-700">
            Entre em contato para falar com um especialista e fazer sua proposta de associação.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/associe-se/me-associar" className="btn-primary">
              Me associar
            </Link>
            <a href={specialistUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Fale com especialista
            </a>
            <a href="mailto:cdlpauloafonso@hotmail.com" className="btn-secondary">
              cdlpauloafonso@hotmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
