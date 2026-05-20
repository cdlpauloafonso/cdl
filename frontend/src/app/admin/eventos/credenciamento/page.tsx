'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  getCampaign,
  listEventInscriptions,
  setEventInscriptionCredentialed,
  type Campaign,
  type EventInscriptionRecord,
} from '@/lib/firestore';
import { hasEventFormRegistration } from '@/lib/event-registration-fields';
import { CredentialingPublicLinkSection } from '@/components/admin/CredentialingPublicLinkSection';
import { EventCredentialingPanel } from '@/components/event-credentialing/EventCredentialingPanel';
import {
  EVENT_ADMIN_LIST_PATH,
  currentAdminPath,
  eventDetailsPath,
  eventSubPageHref,
  resolveEventAdminBackHref,
} from '@/lib/event-admin-navigation';
import { EventAdminBackLink } from '@/components/admin/EventAdminBackLink';

export default function AdminEventoCredenciamentoPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';
  const backHref = resolveEventAdminBackHref(
    searchParams.get('returnTo'),
    eventId ? eventDetailsPath(eventId) : EVENT_ADMIN_LIST_PATH
  );
  const currentPath = currentAdminPath(pathname, searchParams.toString());

  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<(EventInscriptionRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      setError('Nenhum evento selecionado.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const c = await getCampaign(eventId);
      setCampanha(c);
      if (!c) {
        setError('Evento não encontrado.');
        setRows([]);
        return;
      }
      if (!hasEventFormRegistration(c)) {
        setError('Este evento não utiliza inscrição pelo formulário do site.');
        setRows([]);
        return;
      }
      const list = await listEventInscriptions(eventId);
      setRows(list);
    } catch {
      setError('Erro ao carregar inscrições.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle(row: EventInscriptionRecord & { id: string }, credentialed: boolean) {
    if (!eventId) return;
    await setEventInscriptionCredentialed(eventId, row.id, credentialed);
    setRows((prev) =>
      prev.map((x) =>
        x.id === row.id ? { ...x, credentialedAt: credentialed ? new Date().toISOString() : undefined } : x,
      ),
    );
  }

  if (!eventId) {
    return (
      <div>
        <EventAdminBackLink href={backHref} className="text-sm text-cdl-blue hover:underline mb-4 inline-block" />
        <p className="text-cdl-gray-text">Informe um evento na URL (?eventId=).</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cdl-blue" />
          <p className="mt-4 text-cdl-gray-text">Carregando credenciamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <EventAdminBackLink href={backHref} />
      <h1 className="text-2xl font-bold text-gray-900">Credenciamento</h1>
      <p className="mt-1 text-gray-600">
        {campanha ? (
          <span className="font-medium text-gray-800">{campanha.title}</span>
        ) : (
          '—'
        )}
      </p>
      <p className="mt-2 text-sm text-cdl-gray-text">
        Marque a entrada dos participantes no evento. Esta tela é só para credenciar — para editar ou exportar
        inscrições, use a lista de inscritos.
      </p>

      {campanha && hasEventFormRegistration(campanha) ? (
        <CredentialingPublicLinkSection eventId={eventId} eventTitle={campanha.title} />
      ) : null}

      {error && !campanha ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {campanha && hasEventFormRegistration(campanha) ? (
        <EventCredentialingPanel
          eventId={eventId}
          campanha={campanha}
          rows={rows}
          error={error || undefined}
          onToggle={handleToggle}
          footerLink={
            <Link
              href={eventSubPageHref('inscritos', eventId, currentPath)}
              className="text-cdl-blue hover:underline"
            >
              Abrir lista completa de inscritos
            </Link>
          }
        />
      ) : error ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}
