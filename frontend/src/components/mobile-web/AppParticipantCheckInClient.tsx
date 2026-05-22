'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getCampaign,
  getEventInscriptionByCpf,
  type Campaign,
  type EventInscriptionRecord,
} from '@/lib/firestore';
import { isCheckInOnAppEnabled } from '@/lib/check-in-app';
import { campaignInscriptionResumeUrl } from '@/lib/campaign-preview';
import { segmentFromMobilePathname, resolveAppShellHref } from '@/lib/mobile-shell-links';
import { formatCpfDisplay } from '@/lib/input-masks-br';
import { getEffectivePayment } from '@/lib/event-payment-fields';
import {
  isInscriptionPaymentPending,
  normalizeInscriptionPaymentStatus,
  paymentStatusLabel,
} from '@/lib/inscription-payment-status';
import { isInscriptionCredentialed, formatCredentialedAt } from '@/lib/event-credentialing';
import {
  hasEventFormRegistration,
  formatInscritoNameUppercase,
  inscriptionEtiquetaCompanyName,
  inscriptionEtiquetaParticipantName,
} from '@/lib/event-registration-fields';
import { EventInscriptionCheckInQr } from '@/components/event-credentialing/EventInscriptionCheckInQr';
import { scrollViewportToTopAfterPaint } from '@/lib/scroll-viewport-top';

type AppParticipantCheckInClientProps = {
  eventId: string;
};

export function AppParticipantCheckInClient({ eventId }: AppParticipantCheckInClientProps) {
  const pathname = usePathname();
  const mobileSegment = useMemo(() => (pathname ? segmentFromMobilePathname(pathname) : null), [pathname]);
  const paymentResumeHref = useMemo(
    () => (inscriptionId: string) =>
      resolveAppShellHref(mobileSegment, campaignInscriptionResumeUrl(eventId, inscriptionId)),
    [mobileSegment, eventId],
  );
  const homeHref = mobileSegment ?? '/';

  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cpfLookup, setCpfLookup] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [inscrito, setInscrito] = useState<(EventInscriptionRecord & { id: string }) | null>(null);
  const [lookupError, setLookupError] = useState('');

  const cpfDigits = cpfLookup.replace(/\D/g, '').slice(0, 11);
  const payment = campanha ? getEffectivePayment(campanha) : { kind: 'none' as const };
  const paymentPending = inscrito ? isInscriptionPaymentPending(inscrito, payment) : false;
  const participantName = inscrito ? inscriptionEtiquetaParticipantName(inscrito.fields) : '';
  const participantNameDisplay = formatInscritoNameUppercase(participantName);
  const participantCompany = inscrito ? inscriptionEtiquetaCompanyName(inscrito.fields) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const c = await getCampaign(eventId);
        if (cancelled) return;
        if (!c) {
          setError('Evento não encontrado.');
          setCampanha(null);
          return;
        }
        if (!isCheckInOnAppEnabled(c)) {
          setError('Check-in no app não está disponível para este evento.');
          setCampanha(c);
          return;
        }
        if (!hasEventFormRegistration(c)) {
          setError('Este evento não utiliza inscrição pelo formulário do site.');
          setCampanha(c);
          return;
        }
        setCampanha(c);
      } catch {
        if (!cancelled) setError('Não foi possível carregar o evento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!inscrito) return;
    scrollViewportToTopAfterPaint();
  }, [inscrito?.id]);

  useEffect(() => {
    if (cpfDigits.length !== 11) {
      setInscrito(null);
      setLookupError('');
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLookupBusy(true);
        setLookupError('');
        try {
          const row = await getEventInscriptionByCpf(eventId, cpfDigits);
          if (cancelled) return;
          if (!row) {
            setInscrito(null);
            setLookupError('Nenhuma inscrição encontrada com este CPF neste evento.');
            return;
          }
          setInscrito(row);
        } catch {
          if (!cancelled) {
            setInscrito(null);
            setLookupError('Não foi possível consultar a inscrição. Tente novamente.');
          }
        } finally {
          if (!cancelled) setLookupBusy(false);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cpfDigits, eventId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <Link
          href={homeHref}
          prefetch={false}
          className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-cdl-blue hover:underline"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar à home
        </Link>
        <h1 className="text-base font-bold text-slate-900">Check-in</h1>
        {campanha?.title ? <p className="mt-0.5 truncate text-sm text-slate-600">{campanha.title}</p> : null}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-cdl-blue" />
              <p className="mt-3 text-sm text-slate-600">Carregando…</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center text-sm text-amber-900">
            {error}
          </div>
        ) : campanha ? (
          <>
            {inscrito ? (
              <div className="mb-6 px-2 py-4 text-center">
                <p className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl break-words">
                  {participantNameDisplay}
                </p>
                {participantCompany ? (
                  <p className="mt-2 text-base font-medium leading-snug text-slate-600 break-words">
                    {participantCompany}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                Área do inscrito: informe seu CPF para exibir o QR Code de check-in e validar sua entrada no evento.
              </p>
            )}

            <div className="rounded-xl border border-cdl-blue/25 bg-white p-4 shadow-sm">
              <label htmlFor="checkin-cpf" className="block text-sm font-medium text-gray-900">
                Digite seu CPF
              </label>
              <input
                id="checkin-cpf"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpfLookup}
                onChange={(e) => setCpfLookup(formatCpfDisplay(e.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm tabular-nums tracking-wide focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
              />

              {lookupBusy && cpfDigits.length === 11 ? (
                <p className="mt-3 text-sm text-slate-500">Consultando inscrição…</p>
              ) : null}

              {lookupError ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {lookupError}
                </p>
              ) : null}

              {inscrito ? (
                <div className="mt-4 space-y-3">
                  {paymentPending ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4">
                      <p className="text-sm font-semibold text-amber-950">Pagamento pendente</p>
                      <p className="mt-2 text-sm leading-relaxed text-amber-900">
                        Você ainda não realizou o pagamento da inscrição (
                        {paymentStatusLabel(normalizeInscriptionPaymentStatus(inscrito))}). Conclua o pagamento para
                        liberar o QR Code de check-in.
                      </p>
                      <Link
                        href={paymentResumeHref(inscrito.id)}
                        prefetch={false}
                        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-cdl-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cdl-blue-dark"
                      >
                        Ver opções de pagamento
                      </Link>
                    </div>
                  ) : (
                    <>
                      {isInscriptionCredentialed(inscrito) ? (
                        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                          Check-in já realizado
                          {inscrito.credentialedAt
                            ? ` · ${formatCredentialedAt(inscrito.credentialedAt)}`
                            : ''}
                          . Apresente o QR Code abaixo na entrada se solicitado.
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600">
                          Apresente este QR Code na entrada do evento para validação do seu check-in.
                        </p>
                      )}
                      <EventInscriptionCheckInQr
                        eventId={eventId}
                        inscriptionId={inscrito.id}
                        participantLabel={participantNameDisplay || undefined}
                        eventTitle={campanha?.title}
                        className="border-cdl-blue/15 bg-slate-50/80"
                      />
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {!loading ? (
          <div className="mt-6 pb-2">
            <Link
              href={homeHref}
              prefetch={false}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <svg className="h-5 w-5 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Voltar à home
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
