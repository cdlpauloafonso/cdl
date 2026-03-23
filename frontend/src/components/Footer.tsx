'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSettings } from '@/lib/firestore';

const links = [
  { href: '/', label: 'Home' },
  { href: '/institucional/diretoria', label: 'Diretoria' },
  { href: '/institucional/nossa-cidade', label: 'Nossa Cidade' },
  { href: '/servicos', label: 'Soluções para empresas' },
  { href: '/servicos/auditorio', label: 'Auditório' },
  { href: '/servicos/certificado-digital', label: 'Certificado Digital' },
  { href: '/noticias', label: 'Notícias' },
  { href: '/atendimento', label: 'Atendimento' },
  { href: '/area-associado', label: 'Área do Associado' },
  { href: '/associe-se', label: 'Associe-se' },
];

const DEFAULT_ADDRESS = 'R. Monsenhor Magalhães, 214 - Centro\nPaulo Afonso - BA, 48602-015';
const DEFAULT_EMAIL = 'cdlpauloafonso@hotmail.com';
const DEFAULT_PHONE = '(75) 3281-4942';
const DEFAULT_PHONE2 = '(75) 3281-6997';

function formatTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return `tel:+${digits}`;
  if (digits.length >= 10) return `tel:+55${digits}`;
  return `tel:${phone}`;
}

export function Footer() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  const address = settings?.address?.trim() || DEFAULT_ADDRESS;
  const email = settings?.email?.trim() || DEFAULT_EMAIL;
  const phone = settings?.phone?.trim() || DEFAULT_PHONE;
  const phone2 = settings?.phone2?.trim() || DEFAULT_PHONE2;

  return (
    <footer className="bg-cdl-blue-dark text-white mt-auto">
      <div className="container-cdl py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-xl font-bold text-white">CDL Paulo Afonso</p>
            <p className="mt-2 text-sm text-blue-200/90">
              Comunidade empresarial. Serviços, networking e apoio ao comércio local.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-200/90">Links</h3>
            <ul className="mt-3 space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/90 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-200/90">Contato</h3>
            <div className="mt-3 space-y-2">
              {address && (
                <p className="text-sm text-white/90 whitespace-pre-line">{address}</p>
              )}
              {email && (
                <p className="text-sm text-white/90">
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                    {email}
                  </a>
                </p>
              )}
              {phone && (
                <p className="text-sm text-white/90">
                  <a href={formatTelHref(phone)} className="hover:text-white transition-colors">
                    {phone}
                  </a>
                </p>
              )}
              {phone2 && (
                <p className="text-sm text-white/90">
                  <a href={formatTelHref(phone2)} className="hover:text-white transition-colors">
                    {phone2}
                  </a>
                </p>
              )}
              <div className="flex items-center gap-4 pt-2">
                <a
                  href="https://www.instagram.com/cdlpauloafonso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/90 hover:text-white transition-colors"
                  aria-label="Instagram CDL Paulo Afonso"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com/@cdlpauloafonso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/90 hover:text-white transition-colors"
                  aria-label="YouTube CDL Paulo Afonso"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-white/10 text-center text-sm text-white/70">
          © {new Date().getFullYear()} CDL Paulo Afonso. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
