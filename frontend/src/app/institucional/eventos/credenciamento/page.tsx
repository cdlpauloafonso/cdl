'use client';

import Image from 'next/image';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getCampaign,
  listEventInscriptions,
  type Campaign,
  type EventInscriptionRecord,
} from '@/lib/firestore';
import { hasEventFormRegistration } from '@/lib/event-registration-fields';
import {
  CREDENTIALING_TOKEN_PARAM,
  establishCredentialingSession,
  setInscriptionCredentialedViaSession,
} from '@/lib/event-credentialing-access';
import { EventCredentialingPanel } from '@/components/event-credentialing/EventCredentialingPanel';

function PublicEventCredentialingContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';
  const token = searchParams.get(CREDENTIALING_TOKEN_PARAM) ?? '';

  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<(EventInscriptionRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');

  const loadInscriptions = useCallback(async () => {
    if (!eventId || !token) return;
    const list = await listEventInscriptions(eventId);
    setRows(list);
  }, [eventId, token]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) return;
    const previousViewport = viewportMeta.getAttribute('content');
    viewportMeta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no',
    );
    return () => {
      if (previousViewport) viewportMeta.setAttribute('content', previousViewport);
    };
  }, []);

  useEffect(() => {
    const blockPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', blockPinchZoom, { passive: false });
    return () => document.removeEventListener('touchmove', blockPinchZoom);
  }, []);

  useEffect(() => {
    async function load() {
      if (!eventId || !token) {
        setError('Link incompleto. Solicite um novo link ao administrador do evento.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      setSessionOk(false);
      setSessionId('');
      try {
        const c = await getCampaign(eventId);
        if (!c) {
          setError('Evento não encontrado.');
          return;
        }
        if (!hasEventFormRegistration(c)) {
          setError('Este evento não utiliza inscrição pelo formulário do site.');
          setCampanha(c);
          setRows([]);
          return;
        }
        const session = await establishCredentialingSession(eventId, token, c.title);
        if (!session.ok || !session.sessionId) {
          setError(session.error ?? 'Link inválido ou expirado.');
          setCampanha(null);
          setRows([]);
          return;
        }
        setSessionOk(true);
        setSessionId(session.sessionId);
        setCampanha(c);
        await loadInscriptions();
      } catch {
        setError('Não foi possível carregar o credenciamento.');
        setCampanha(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [eventId, token, loadInscriptions]);

  async function handleToggle(row: EventInscriptionRecord & { id: string }, credentialed: boolean) {
    if (!eventId || !sessionId) return;
    await setInscriptionCredentialedViaSession(eventId, row.id, sessionId, credentialed);
    setRows((prev) =>
      prev.map((x) =>
        x.id === row.id ? { ...x, credentialedAt: credentialed ? new Date().toISOString() : undefined } : x,
      ),
    );
  }

  return (
    <div
      data-credentialing-public-page
      className="min-h-screen touch-manipulation bg-gray-100"
    >
      <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Image
            src="/logo-site.png"
            alt="CDL Paulo Afonso"
            width={120}
            height={40}
            className="h-9 w-auto"
            priority
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900">Credenciamento</h1>
            {campanha?.title ? (
              <p className="truncate text-sm text-gray-600">{campanha.title}</p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cdl-blue" />
              <p className="mt-4 text-cdl-gray-text">Carregando credenciamento...</p>
            </div>
          </div>
        ) : error || !sessionOk ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
            {error || 'Acesso não autorizado.'}
          </div>
        ) : campanha ? (
          <>
            <p className="text-sm text-cdl-gray-text">
              Marque a entrada dos participantes. Esta página permite apenas credenciar — não dá acesso ao painel
              administrativo.
            </p>
            <EventCredentialingPanel
              eventId={eventId}
              campanha={campanha}
              rows={rows}
              onToggle={handleToggle}
              showSensitiveConfirmBanner={false}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function PublicEventCredentialingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <p className="text-cdl-gray-text">Carregando...</p>
        </div>
      }
    >
      <PublicEventCredentialingContent />
    </Suspense>
  );
}
