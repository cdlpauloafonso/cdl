'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { campaignInscriptionResumeUrl } from '@/lib/campaign-preview';
import { segmentFromMobilePathname, resolveAppShellHref } from '@/lib/mobile-shell-links';
import {
  getCampaign,
  listEventInscriptions,
  type Campaign,
  type EventInscriptionRecord,
} from '@/lib/firestore';
import { hasEventFormRegistration } from '@/lib/event-registration-fields';
import { setInscriptionCredentialedViaSession } from '@/lib/event-credentialing-access';
import { establishAppCredentialingSession } from '@/lib/credentialing-app-api';
import { EventCredentialingPanel } from '@/components/event-credentialing/EventCredentialingPanel';

type AppEventCredentialingClientProps = {
  eventId: string;
  mobileToken: string;
};

export function AppEventCredentialingClient({ eventId, mobileToken }: AppEventCredentialingClientProps) {
  const pathname = usePathname();
  const mobileSegment = useMemo(
    () => (pathname ? segmentFromMobilePathname(pathname) : null),
    [pathname],
  );
  const paymentResumeHref = useMemo(
    () => (inscriptionId: string) =>
      resolveAppShellHref(mobileSegment, campaignInscriptionResumeUrl(eventId, inscriptionId)),
    [mobileSegment, eventId],
  );

  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<(EventInscriptionRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');

  const loadInscriptions = useCallback(async () => {
    if (!eventId) return;
    const list = await listEventInscriptions(eventId);
    setRows(list);
  }, [eventId]);

  useEffect(() => {
    async function load() {
      if (!eventId) {
        setError('Evento inválido.');
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
        if (c.credentialingOnApp !== true) {
          setError('Credenciamento no app não está ativo para este evento.');
          setCampanha(c);
          return;
        }
        if (!hasEventFormRegistration(c)) {
          setError('Este evento não utiliza inscrição por formulário do site.');
          setCampanha(c);
          return;
        }

        const session = await establishAppCredentialingSession(eventId, mobileToken);
        if (!session.ok || !session.sessionId) {
          setError(session.error ?? 'Não foi possível abrir o credenciamento.');
          setCampanha(c);
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
  }, [eventId, mobileToken, loadInscriptions]);

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
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-base font-bold text-slate-900">Credenciamento</h1>
        {campanha?.title ? <p className="mt-0.5 truncate text-sm text-slate-600">{campanha.title}</p> : null}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-cdl-blue" />
              <p className="mt-3 text-sm text-slate-600">Carregando credenciamento…</p>
            </div>
          </div>
        ) : error || !sessionOk ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center text-sm text-amber-900">
            {error || 'Acesso não autorizado.'}
          </div>
        ) : campanha ? (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Marque a entrada dos participantes inscritos neste evento.
            </p>
            <EventCredentialingPanel
              eventId={eventId}
              campanha={campanha}
              rows={rows}
              onToggle={handleToggle}
              showSensitiveConfirmBanner={false}
              paymentResumeHref={paymentResumeHref}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
