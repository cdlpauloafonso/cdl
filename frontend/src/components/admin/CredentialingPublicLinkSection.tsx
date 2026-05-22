'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ensureCredentialingAccessToken,
  regenerateCredentialingAccessToken,
} from '@/lib/firestore';
import { publicCredentialingPageUrl } from '@/lib/event-credentialing-access';

type CredentialingPublicLinkSectionProps = {
  eventId: string;
  eventTitle?: string;
};

export function CredentialingPublicLinkSection({ eventId, eventTitle }: CredentialingPublicLinkSectionProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError('');
    try {
      const t = await ensureCredentialingAccessToken(eventId);
      setToken(t);
    } catch {
      setError('Não foi possível gerar o link público.');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const publicUrl = useMemo(() => {
    if (!eventId || !token) return '';
    return publicCredentialingPageUrl(eventId, token);
  }, [eventId, token]);

  async function copyLink() {
    if (!publicUrl) return;
    setBusy(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: eventTitle ? `Credenciamento — ${eventTitle}` : 'Credenciamento do evento',
          text: 'Acesso à tela de credenciamento (somente check-in).',
          url: publicUrl,
        });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
        alert('Link copiado para a área de transferência.');
        return;
      }
      window.prompt('Copie o link público de credenciamento:', publicUrl);
    } catch {
      alert('Não foi possível compartilhar o link agora.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!eventId) return;
    const ok = window.confirm(
      'Gerar um novo link invalida o link anterior. Quem já recebeu o link antigo não conseguirá mais acessar. Continuar?',
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const t = await regenerateCredentialingAccessToken(eventId);
      setToken(t);
    } catch {
      setError('Não foi possível gerar um novo link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-sky-200/80 bg-sky-50/50 p-2.5 sm:p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">Link público administrativo</p>
        <p className="text-[10px] leading-snug text-sky-800/90">
          Portaria — credenciamento sem login no admin
        </p>
      </div>

      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-2 text-xs text-cdl-gray-text">Preparando link…</p>
      ) : publicUrl ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <p className="min-w-0 flex-1 break-all rounded-md border border-sky-200/60 bg-white px-2 py-1.5 font-mono text-[10px] leading-snug text-gray-700 sm:text-[11px]">
            {publicUrl}
          </p>
          <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => void copyLink()}
              className="rounded-md border border-cdl-blue bg-white px-2.5 py-1 text-xs font-medium text-cdl-blue hover:bg-blue-50 disabled:opacity-50"
            >
              {busy ? '…' : 'Copiar / compartilhar'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRegenerate()}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Gerar Novo Link
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
