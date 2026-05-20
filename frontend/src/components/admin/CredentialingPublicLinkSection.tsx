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
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
      <p className="text-sm font-medium text-gray-900">Link público administrativo</p>
      <p className="mt-1 text-xs text-cdl-gray-text">
        Compartilhe com a equipe na portaria do evento. Quem tiver o link acessa apenas esta tela de credenciamento,
        sem login no painel admin.
      </p>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-3 text-sm text-cdl-gray-text">Preparando link…</p>
      ) : publicUrl ? (
        <div className="mt-3 space-y-3">
          <p className="break-all rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
            {publicUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void copyLink()}
              className="rounded-lg border border-cdl-blue bg-white px-3 py-2 text-sm font-medium text-cdl-blue hover:bg-blue-50 disabled:opacity-50"
            >
              {busy ? 'Aguarde…' : 'Copiar / compartilhar link'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRegenerate()}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Gerar novo link
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
