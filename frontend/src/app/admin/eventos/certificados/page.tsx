'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCampaign,
  listEventInscriptions,
  type Campaign,
  type EventInscriptionRecord,
} from '@/lib/firestore';
import {
  hasEventFormRegistration,
  inscriptionDisplayLabel,
  inscriptionDisplaySubtitle,
} from '@/lib/event-registration-fields';
import { isInscriptionCredentialed } from '@/lib/event-credentialing';
import {
  downloadEventCertificatePdf,
  downloadEventCertificatesBulkPdf,
  safeCertificateFileName,
  safeCertificateParticipantFileName,
} from '@/lib/event-certificate-pdf';
import {
  EVENT_ADMIN_LIST_PATH,
  currentAdminPath,
  eventDetailsPath,
  eventSubPageHref,
  resolveEventAdminBackHref,
} from '@/lib/event-admin-navigation';
import { EventAdminBackLink } from '@/components/admin/EventAdminBackLink';

type CertificateFilter = 'credentialed' | 'all';

export default function AdminEventoCertificadosPage() {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<CertificateFilter>('credentialed');
  const [exportingBulk, setExportingBulk] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

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

  const eligibleRows = useMemo(() => {
    return rows.filter((r) => (filter === 'credentialed' ? isInscriptionCredentialed(r) : true));
  }, [rows, filter]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return eligibleRows;
    return eligibleRows.filter((r) => {
      const blob = [
        inscriptionDisplayLabel(r.fields),
        inscriptionDisplaySubtitle(r.fields) ?? '',
        ...Object.values(r.fields || {}).map((x) => String(x)),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(term);
    });
  }, [eligibleRows, searchTerm]);

  const eventInfo = useMemo(
    () => ({
      title: campanha?.title ?? 'Evento',
      date: campanha?.date,
    }),
    [campanha],
  );

  async function handleDownloadOne(row: EventInscriptionRecord & { id: string }) {
    if (!campanha) return;
    const name = inscriptionDisplayLabel(row.fields);
    setExportingId(row.id);
    setError('');
    try {
      const ok = await downloadEventCertificatePdf(
        eventInfo,
        { inscriptionId: row.id, fields: row.fields },
        safeCertificateParticipantFileName(campanha.title, name),
      );
      if (!ok) setError('Não foi possível gerar o certificado.');
    } catch {
      setError('Não foi possível gerar o certificado.');
    } finally {
      setExportingId(null);
    }
  }

  async function handleDownloadBulk() {
    if (!campanha || filteredRows.length === 0) return;
    setExportingBulk(true);
    setError('');
    try {
      const ok = await downloadEventCertificatesBulkPdf(
        eventInfo,
        filteredRows.map((r) => ({ inscriptionId: r.id, fields: r.fields })),
        safeCertificateFileName(campanha.title, eventId.slice(0, 8)),
      );
      if (!ok) setError('Não foi possível gerar os certificados.');
    } catch {
      setError('Não foi possível gerar os certificados.');
    } finally {
      setExportingBulk(false);
    }
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
          <p className="mt-4 text-cdl-gray-text">Carregando certificados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <EventAdminBackLink href={backHref} />
      <h1 className="text-2xl font-bold text-gray-900">Certificados</h1>
      <p className="mt-1 text-gray-600">
        {campanha ? (
          <span className="font-medium text-gray-800">{campanha.title}</span>
        ) : (
          '—'
        )}
      </p>
      <p className="mt-2 text-sm text-cdl-gray-text">
        Gere certificados de participação em PDF para os inscritos. Por padrão, a lista mostra apenas quem foi
        credenciado no evento.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {campanha && hasEventFormRegistration(campanha) ? (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'credentialed' as const, label: 'Credenciados' },
                  { id: 'all' as const, label: 'Todos os inscritos' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
                    filter === tab.id
                      ? 'bg-cdl-blue text-white ring-cdl-blue'
                      : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={exportingBulk || filteredRows.length === 0}
              onClick={() => void handleDownloadBulk()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {exportingBulk ? 'Gerando PDF…' : `Baixar todos (${filteredRows.length})`}
            </button>
          </div>

          <div className="relative mt-4">
            <input
              type="search"
              placeholder="Buscar participante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 pl-10 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
              autoComplete="off"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-cdl-gray-text">
              {filter === 'credentialed'
                ? 'Nenhum participante credenciado ainda. Use a tela de credenciamento ou altere o filtro.'
                : 'Nenhuma inscrição encontrada.'}
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {filteredRows.map((row) => {
                const subtitle = inscriptionDisplaySubtitle(row.fields);
                const busy = exportingId === row.id;
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{inscriptionDisplayLabel(row.fields)}</p>
                      {subtitle ? <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p> : null}
                      {isInscriptionCredentialed(row) ? (
                        <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Credenciado
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={busy || exportingBulk}
                      onClick={() => void handleDownloadOne(row)}
                      className="btn-secondary shrink-0 text-sm !px-4 !py-2 disabled:opacity-50"
                    >
                      {busy ? 'Gerando…' : 'Baixar PDF'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-6 text-center text-sm">
            <Link href={eventSubPageHref('credenciamento', eventId, currentPath)} className="text-cdl-blue hover:underline">
              Ir para credenciamento
            </Link>
          </p>
        </>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}
