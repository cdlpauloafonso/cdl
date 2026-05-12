'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSettings } from '@/lib/firestore';
import { MobileWebSubPageChrome } from '@/components/mobile-web/MobileWebSubPageChrome';

const WHATSAPP_STORAGE_KEY = 'cdl_whatsapp_number';

function formatWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

const BENEFITS = [
  'Segurança para vender (SPC, consultas)',
  'Apoio institucional e representação do comércio',
  'Economia de custos em serviços empresariais',
  'Acesso a estrutura profissional e networking',
  'Pertencimento a um grupo forte e conectado',
];

type MobileAssocieSePageProps = {
  segment: string;
};

export function MobileAssocieSePage({ segment }: MobileAssocieSePageProps) {
  const homeHref = segment;
  const meAssociarHref = `${segment}/associe-se/me-associar`;
  /** Até carregar WhatsApp desde settings, mantém comportamento igual à página institucional. */
  const [specialistUrl, setSpecialistUrl] = useState<string>(`${segment}/atendimento`);

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
        //
      }
      if (!number && stored) number = formatWhatsAppNumber(stored);
      if (!number && env) number = formatWhatsAppNumber(env);
      if (!mounted || !number || number.length < 10) return;
      const msg = encodeURIComponent(
        'Olá! Quero falar com um especialista para associação na CDL Paulo Afonso.',
      );
      setSpecialistUrl(`https://wa.me/${number}?text=${msg}`);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MobileWebSubPageChrome
      backHref={homeHref}
      backLabel="Início app"
      title="Associe-se"
      subtitle="Menos institucional, mais resultado — faça parte da comunidade empresarial de Paulo Afonso."
    >
      <p className="text-[13px] leading-relaxed text-slate-600">
        Amplie segurança, representação e oportunidades para o seu negócio na CDL Paulo Afonso.
      </p>

      <section className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md shadow-slate-900/[0.04]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Benefícios</p>
        <h2 className="mt-1 text-base font-bold text-slate-900">Por que associar-se?</h2>
        <ul className="mt-3 space-y-2.5">
          {BENEFITS.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[13px] leading-snug text-slate-700">
              <span className="mt-0.5 shrink-0 text-cdl-blue">✓</span>
              {line}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-[13px] leading-relaxed text-slate-600">
        Prefira preencher o cadastro pelo app ou fale direto com a equipe pela agenda de mensagens ou e-mail.
      </p>

      <div className="mt-4 grid gap-2.5">
        <Link href={meAssociarHref} prefetch={false} className="rounded-xl bg-[#172554] py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-[#131c48]">
          Me associar
        </Link>
        {/^https:\/\/wa\.me\//i.test(specialistUrl) ?
          <a
            href={specialistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border-2 border-cdl-blue py-3.5 text-center text-sm font-semibold text-cdl-blue hover:bg-cdl-blue/8"
          >
            Falar com especialista
          </a>
        : <Link
            href={specialistUrl}
            prefetch={false}
            className="rounded-xl border-2 border-cdl-blue py-3.5 text-center text-sm font-semibold text-cdl-blue hover:bg-cdl-blue/8"
          >
            Falar com especialista
          </Link>}
        <a
          href="mailto:cdlpauloafonso@hotmail.com"
          className="rounded-xl border border-slate-200 bg-white py-3.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          cdlpauloafonso@hotmail.com
        </a>
      </div>
    </MobileWebSubPageChrome>
  );
}
