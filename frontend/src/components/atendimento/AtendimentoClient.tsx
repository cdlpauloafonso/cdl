'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

export type AtendimentoClientProps = {
  /** Layout compacto para `/m/:token/atendimento` (WebView / app). */
  mobileShell?: boolean;
};

export function AtendimentoClient({ mobileShell = false }: AtendimentoClientProps) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiPost('/contact', form);
      setSent(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar.';
      const isNetwork = /fetch|network|Failed/i.test(msg);
      setError(isNetwork ? 'Serviço em configuração. Tente novamente mais tarde ou entre em contato por email.' : msg);
    } finally {
      setLoading(false);
    }
  }

  const fieldBase = mobileShell ?
      'mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-cdl-blue focus:outline-none focus:ring-1 focus:ring-cdl-blue'
    : 'mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue';

  const labelCls = mobileShell ? 'block text-[12px] font-medium text-slate-600' : 'block text-sm font-medium text-gray-700';

  if (sent) {
    if (mobileShell) {
      return (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-md shadow-slate-900/[0.04]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Mensagem enviada</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">Entraremos em contato em breve.</p>
        </div>
      );
    }
    return (
      <div className="py-12 sm:py-16">
        <div className="container-cdl max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Mensagem enviada</h1>
          <p className="mt-2 text-cdl-gray-text">Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  if (mobileShell) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md shadow-slate-900/[0.04]">
        <p className="text-[13px] leading-relaxed text-slate-600">
          Preencha os campos abaixo. Nossa equipe responde por e-mail ou telefone.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] leading-snug text-red-800">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="atend-name" className={labelCls}>
              Nome *
            </label>
            <input
              id="atend-name"
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <div>
            <label htmlFor="atend-email" className={labelCls}>
              Email *
            </label>
            <input
              id="atend-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <div>
            <label htmlFor="atend-phone" className={labelCls}>
              Telefone
            </label>
            <input
              id="atend-phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <div>
            <label htmlFor="atend-subject" className={labelCls}>
              Assunto
            </label>
            <input
              id="atend-subject"
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <div>
            <label htmlFor="atend-message" className={labelCls}>
              Mensagem *
            </label>
            <textarea
              id="atend-message"
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#172554] py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-900/25 transition-colors hover:bg-[#131c48] disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl max-w-xl">
        <h1 className="text-3xl font-bold text-gray-900">Atendimento</h1>
        <p className="mt-4 text-cdl-gray-text">Fale com a CDL Paulo Afonso. Preencha o formulário abaixo.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}
          <div>
            <label htmlFor="atend-desktop-name" className={labelCls}>
              Nome *
            </label>
            <input
              id="atend-desktop-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <div>
            <label htmlFor="atend-desktop-email" className={labelCls}>
              Email *
            </label>
            <input
              id="atend-desktop-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <div>
            <label htmlFor="atend-desktop-phone" className={labelCls}>
              Telefone
            </label>
            <input
              id="atend-desktop-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <div>
            <label htmlFor="atend-desktop-subject" className={labelCls}>
              Assunto
            </label>
            <input
              id="atend-desktop-subject"
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <div>
            <label htmlFor="atend-desktop-message" className={labelCls}>
              Mensagem *
            </label>
            <textarea
              id="atend-desktop-message"
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className={fieldBase}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </form>
      </div>
    </div>
  );
}
