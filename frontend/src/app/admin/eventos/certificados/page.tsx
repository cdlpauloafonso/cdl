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
  fetchCertificateEmailConfig,
  sendCertificateEmailOne,
  sendCertificateEmailsManaged,
  type CertificateEmailConfig,
  type CertificateEmailItemResult,
} from '@/lib/certificate-email-api';
import {
  hasEventFormRegistration,
  inscriptionCertificateCompanyName,
  inscriptionCertificateRepresentativeName,
  inscriptionDisplayLabel,
  inscriptionParticipantEmail,
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

type Row = EventInscriptionRecord & { id: string };

function formatSentAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function applyEmailResults(rows: Row[], results: CertificateEmailItemResult[]): Row[] {
  const byId = new Map(results.map((r) => [r.inscriptionId, r]));
  return rows.map((row) => {
    const hit = byId.get(row.id);
    if (!hit?.ok || !hit.sentAt) return row;
    return {
      ...row,
      certificateEmailSentAt: hit.sentAt,
      certificateEmailLastError: null,
    };
  });
}

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
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<CertificateFilter>('credentialed');
  const [exportingBulk, setExportingBulk] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [emailConfig, setEmailConfig] = useState<CertificateEmailConfig | null>(null);
  const [emailConfigLoaded, setEmailConfigLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      setError('Nenhum evento selecionado.');
      return;
    }
    setLoading(true);
    setError('');
    setEmailConfigLoaded(false);
    try {
      const [c, list, cfg] = await Promise.all([
        getCampaign(eventId),
        listEventInscriptions(eventId),
        fetchCertificateEmailConfig(eventId),
      ]);
      setCampanha(c);
      setEmailConfig(cfg);
      setEmailConfigLoaded(true);
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
        inscriptionCertificateRepresentativeName(r.fields),
        inscriptionCertificateCompanyName(r.fields) ?? '',
        inscriptionDisplayLabel(r.fields),
        inscriptionParticipantEmail(r.fields) ?? '',
        ...Object.values(r.fields || {}).map((x) => String(x)),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(term);
    });
  }, [eligibleRows, searchTerm]);

  const selectableRows = useMemo(
    () => filteredRows.filter((r) => inscriptionParticipantEmail(r.fields) && !r.certificateEmailSentAt),
    [filteredRows]
  );

  const eventInfo = useMemo(
    () => ({
      title: campanha?.title ?? 'Evento',
      date: campanha?.date,
    }),
    [campanha],
  );

  const emailPrepMessage = useMemo(() => {
    if (!emailConfigLoaded) return 'Carregando configuração de e-mail…';
    if (!emailConfig) {
      return 'Não foi possível carregar a configuração de e-mail. Verifique login admin, Firebase Admin no servidor e deploy do backend.';
    }
    if (!emailConfig.providerReady) {
      return 'Resend ainda não configurado. Cadastre a API key em Admin → Configurações → APIs (Resend) ou defina RESEND_API_KEY no servidor.';
    }
    if (!emailConfig.enabled) {
      return 'Envio preparado. Ative em Admin → Configurações → APIs (Resend) ou com CERTIFICATE_EMAIL_ENABLED=true no backend.';
    }
    return null;
  }, [emailConfig, emailConfigLoaded]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const ids = selectableRows.map((r) => r.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  async function handleDownloadOne(row: Row) {
    if (!campanha) return;
    const name = inscriptionCertificateRepresentativeName(row.fields);
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

  async function handleSendOne(row: Row) {
    if (!eventId) return;
    const email = inscriptionParticipantEmail(row.fields);
    if (!email) {
      setError('Este participante não tem e-mail na inscrição.');
      return;
    }
    if (row.certificateEmailSentAt) {
      setInfo('Certificado já consta como enviado por e-mail.');
      return;
    }

    setSendingId(row.id);
    setError('');
    setInfo('');
    const result = await sendCertificateEmailOne(eventId, row.id);
    setSendingId(null);

    if (result.ok && result.sentAt) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, certificateEmailSentAt: result.sentAt, certificateEmailLastError: null }
            : r
        )
      );
      setInfo('Certificado enviado por e-mail.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      return;
    }

    if (!result.ok) {
      if (result.skipped) {
        setInfo(result.error);
      } else {
        setError(result.error);
      }
    }
  }

  async function handleSendSelected() {
    if (!eventId || selectedIds.size === 0) return;

    const ids = [...selectedIds];
    const chunkSize = emailConfig?.clientChunkSize ?? 15;

    setSendingBulk(true);
    setBulkProgress({ done: 0, total: ids.length });
    setError('');
    setInfo('');

    try {
      const batch = await sendCertificateEmailsManaged(eventId, ids, chunkSize, (done, total) => {
        setBulkProgress({ done, total });
      });

      setRows((prev) => applyEmailResults(prev, batch.results));

      const { sent, failed, skipped } = batch.summary;
      if (sent > 0) {
        setInfo(
          `Processamento concluído: ${sent} enviado(s)${skipped ? `, ${skipped} já enviado(s)` : ''}${failed ? `, ${failed} com falha` : ''}.`
        );
      } else if (failed > 0) {
        setError(
          `Nenhum e-mail enviado. ${failed} falha(s). Verifique RESEND_API_KEY e CERTIFICATE_EMAIL_ENABLED no servidor.`
        );
      } else if (skipped > 0) {
        setInfo('Todos os selecionados já estavam marcados como enviados.');
      }

      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar lote de e-mails.');
    } finally {
      setSendingBulk(false);
      setBulkProgress(null);
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

  const allVisibleSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selectedIds.has(r.id));

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
        Gere PDFs e envie certificados por e-mail. Lotes grandes são divididos automaticamente pelo sistema
        (pausa entre cada envio no servidor).
      </p>

      {emailPrepMessage ? (
        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {emailPrepMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {info}
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
                  onClick={() => {
                    setFilter(tab.id);
                    setSelectedIds(new Set());
                  }}
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exportingBulk || filteredRows.length === 0}
                onClick={() => void handleDownloadBulk()}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {exportingBulk ? 'Gerando PDF…' : `Baixar todos (${filteredRows.length})`}
              </button>
              <button
                type="button"
                disabled={sendingBulk || selectedIds.size === 0 || !emailConfig}
                onClick={() => void handleSendSelected()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {sendingBulk
                  ? bulkProgress
                    ? `Enviando ${bulkProgress.done}/${bulkProgress.total}…`
                    : 'Enviando…'
                  : `Enviar selecionados (${selectedIds.size})`}
              </button>
            </div>
          </div>

          {selectableRows.length > 0 ? (
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="h-3.5 w-3.5 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
              />
              Selecionar enviáveis ({selectableRows.length})
            </label>
          ) : null}

          <div className="relative mt-3">
            <input
              type="search"
              placeholder="Buscar participante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
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
            <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {filteredRows.map((row) => {
                const representativeName = inscriptionCertificateRepresentativeName(row.fields);
                const companyName = inscriptionCertificateCompanyName(row.fields);
                const email = inscriptionParticipantEmail(row.fields);
                const sentLabel = formatSentAt(row.certificateEmailSentAt);
                const busyPdf = exportingId === row.id;
                const busyEmail = sendingId === row.id;
                const canSelect = Boolean(email && !row.certificateEmailSentAt);
                const checked = selectedIds.has(row.id);

                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 px-2.5 py-2 sm:flex-row sm:items-center sm:gap-2 sm:py-1.5"
                  >
                    <div className="flex shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canSelect || sendingBulk}
                        onChange={() => toggleSelect(row.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue disabled:opacity-40"
                        aria-label={`Selecionar ${representativeName}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1 leading-snug">
                      <p className="text-sm font-semibold text-gray-900">{representativeName}</p>
                      {companyName ? (
                        <p className="text-xs font-medium text-gray-600">{companyName}</p>
                      ) : null}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {email ? (
                          <span className="text-[11px] text-gray-500">{email}</span>
                        ) : (
                          <span className="text-[11px] text-amber-700">Sem e-mail</span>
                        )}
                        {isInscriptionCredentialed(row) ? (
                          <span className="inline-flex rounded bg-emerald-100 px-1.5 py-px text-[10px] font-semibold text-emerald-800">
                            Credenciado
                          </span>
                        ) : null}
                        {sentLabel ? (
                          <span className="inline-flex rounded bg-sky-100 px-1.5 py-px text-[10px] font-semibold text-sky-900">
                            Enviado · {sentLabel}
                          </span>
                        ) : null}
                      </div>
                      {row.certificateEmailLastError && !row.certificateEmailSentAt ? (
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-amber-800">
                          {row.certificateEmailLastError}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                      <button
                        type="button"
                        disabled={busyPdf || busyEmail || exportingBulk || sendingBulk}
                        onClick={() => void handleDownloadOne(row)}
                        className="btn-secondary shrink-0 text-xs !px-2.5 !py-1 disabled:opacity-50"
                      >
                        {busyPdf ? '…' : 'PDF'}
                      </button>
                      <button
                        type="button"
                        disabled={
                          !email ||
                          Boolean(row.certificateEmailSentAt) ||
                          busyEmail ||
                          busyPdf ||
                          sendingBulk ||
                          !emailConfig
                        }
                        title={
                          row.certificateEmailSentAt
                            ? 'Já enviado'
                            : !email
                              ? 'Sem e-mail'
                              : emailPrepMessage ?? undefined
                        }
                        onClick={() => void handleSendOne(row)}
                        className="btn-primary shrink-0 text-xs !px-2.5 !py-1 disabled:opacity-50"
                      >
                        {busyEmail ? '…' : row.certificateEmailSentAt ? 'Enviado' : 'E-mail'}
                      </button>
                    </div>
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
