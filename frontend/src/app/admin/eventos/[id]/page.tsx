'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deleteCampaignById,
  getCampaign,
  listEventInscriptions,
  subscribeEventInscriptions,
  updateCampaign,
  type Campaign,
  type EventInscriptionRecord,
} from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { formatEventDateForDisplay } from '@/lib/event-datetime';
import { campaignPublicPageUrl, campaignInscriptionPageUrl } from '@/lib/campaign-preview';
import {
  getEffectiveRegistration,
  hasEventFormRegistration,
  hasEventRegistrationConfigured,
  inscriptionDisplayLabel,
  inscriptionDisplaySubtitle,
} from '@/lib/event-registration-fields';
import { getEffectivePayment, type EffectivePayment } from '@/lib/event-payment-fields';
import { isInscriptionCredentialed } from '@/lib/event-credentialing';
import {
  pickUltimosCredenciados,
  pickUltimosInscritos,
} from '@/lib/event-inscription-sort';
import {
  EVENT_ADMIN_LIST_PATH,
  eventDetailsPath,
  eventSubPageHref,
  resolveEventAdminBackHref,
} from '@/lib/event-admin-navigation';
import { EventAdminBackLink } from '@/components/admin/EventAdminBackLink';
import { AdminSensitiveConfirmModal } from '@/components/ui/AdminSensitiveConfirmModal';

const ULTIMOS_INSCRITOS_LIMITE = 5;
const ULTIMOS_CREDENCIADOS_LIMITE = 5;

function applyInscriptionLists(lista: (EventInscriptionRecord & { id: string })[]) {
  const credenciados = lista.filter(isInscriptionCredentialed);
  return {
    inscritos: lista.length,
    ultimosInscritos: pickUltimosInscritos(lista, ULTIMOS_INSCRITOS_LIMITE),
    totalCredenciados: credenciados.length,
    ultimosCredenciados: pickUltimosCredenciados(lista, ULTIMOS_CREDENCIADOS_LIMITE),
  };
}

function formatDateTimeCompact(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const badgeSm =
  'inline-flex shrink-0 rounded px-1.5 py-px text-[10px] font-semibold leading-tight';

function InscriptionCompactRow({
  row,
  meta,
  payment,
  variant = 'default',
  showCredentialedBadge = false,
  credentialedBadgeMuted = false,
}: {
  row: EventInscriptionRecord & { id: string };
  meta: string;
  payment: EffectivePayment;
  variant?: 'default' | 'credentialed';
  showCredentialedBadge?: boolean;
  credentialedBadgeMuted?: boolean;
}) {
  const label = inscriptionDisplayLabel(row.fields);
  const subtitle = inscriptionDisplaySubtitle(row.fields);
  const paymentPending = row.paymentStatus === 'pending';
  const paymentPaid = row.paymentStatus === 'paid';
  const credentialed = isInscriptionCredentialed(row);

  return (
    <li
      className={`flex items-center gap-2 py-1.5 ${
        variant === 'credentialed' ? 'border-emerald-100' : 'border-gray-100'
      }`}
    >
      <p className="min-w-0 flex-1 truncate text-xs leading-snug text-gray-600">
        <span className="font-medium text-gray-900">{label}</span>
        {subtitle ? (
          <>
            <span className="text-gray-400"> · </span>
            <span>{subtitle}</span>
          </>
        ) : null}
        {meta ? (
          <>
            <span className="text-gray-400"> · </span>
            <span className={variant === 'credentialed' ? 'text-emerald-700' : 'text-gray-500'}>{meta}</span>
          </>
        ) : null}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {(showCredentialedBadge || credentialed) && (
          <span
            className={`${badgeSm} ${
              credentialedBadgeMuted
                ? 'bg-emerald-200 text-emerald-900'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            Cred.
          </span>
        )}
        {payment.kind !== 'none' && (paymentPaid || paymentPending) && (
          <span
            className={`${badgeSm} ${paymentPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
          >
            {paymentPaid ? 'Pago' : 'Pend.'}
          </span>
        )}
      </div>
    </li>
  );
}

async function assertAdminSession(): Promise<boolean> {
  initFirebase();
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return false;
  const idTokenResult = await user.getIdTokenResult();
  if (idTokenResult.claims?.admin) return true;
  const db = getFirestore();
  const adminDoc = await getDoc(doc(db, 'admins', user.uid));
  return adminDoc.exists();
}

export default function AdminEventoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const backHref = resolveEventAdminBackHref(searchParams.get('returnTo'), EVENT_ADMIN_LIST_PATH);
  const detailsReturnTarget = eventId ? eventDetailsPath(eventId) : EVENT_ADMIN_LIST_PATH;

  const [evento, setEvento] = useState<Campaign | null>(null);
  const [inscritos, setInscritos] = useState(0);
  const [ultimosInscritos, setUltimosInscritos] = useState<(EventInscriptionRecord & { id: string })[]>([]);
  const [ultimosCredenciados, setUltimosCredenciados] = useState<(EventInscriptionRecord & { id: string })[]>([]);
  const [totalCredenciados, setTotalCredenciados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseRegistrationModal, setShowCloseRegistrationModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingRegistration, setTogglingRegistration] = useState(false);
  const [togglingPublished, setTogglingPublished] = useState(false);
  const [togglingCheckInOnApp, setTogglingCheckInOnApp] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setEvento(null);
      return;
    }
    let mounted = true;
    let unsubInscriptions: (() => void) | undefined;

    function syncInscriptionLists(lista: (EventInscriptionRecord & { id: string })[]) {
      const applied = applyInscriptionLists(lista);
      setInscritos(applied.inscritos);
      setUltimosInscritos(applied.ultimosInscritos);
      setTotalCredenciados(applied.totalCredenciados);
      setUltimosCredenciados(applied.ultimosCredenciados);
    }

    (async () => {
      try {
        const ev = await getCampaign(eventId);
        if (!mounted) return;
        if (!ev) {
          setEvento(null);
          return;
        }
        setEvento(ev);
        if (!hasEventFormRegistration(ev)) {
          if (mounted) {
            setInscritos(0);
            setUltimosInscritos([]);
            setTotalCredenciados(0);
            setUltimosCredenciados([]);
          }
          return;
        }

        unsubInscriptions = subscribeEventInscriptions(
          eventId,
          (lista) => {
            if (!mounted) return;
            syncInscriptionLists(lista);
          },
          () => {
            if (!mounted) return;
            setUltimosInscritos([]);
            setTotalCredenciados(0);
            setUltimosCredenciados([]);
          },
        );

        try {
          const lista = await listEventInscriptions(eventId);
          if (mounted) syncInscriptionLists(lista);
        } catch {
          if (mounted) {
            setInscritos(0);
            setUltimosInscritos([]);
            setTotalCredenciados(0);
            setUltimosCredenciados([]);
          }
        }
      } catch {
        if (mounted) setError('Erro ao carregar evento');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      unsubInscriptions?.();
    };
  }, [eventId]);

  async function applyRegistrationClosed(closed: boolean) {
    if (!evento?.id) return;
    if (!hasEventRegistrationConfigured(evento)) return;
    try {
      setTogglingRegistration(true);
      setError('');
      await updateCampaign(evento.id, { registrationClosed: closed });
      setEvento((prev) => (prev ? { ...prev, registrationClosed: closed } : prev));
    } catch {
      setError('Erro ao atualizar status da inscrição do evento');
    } finally {
      setTogglingRegistration(false);
    }
  }

  function handleRegistrationToggleClick() {
    if (!evento) return;
    if (evento.registrationClosed) {
      void applyRegistrationClosed(false);
      return;
    }
    setError('');
    setShowCloseRegistrationModal(true);
  }

  async function confirmCloseRegistration() {
    setShowCloseRegistrationModal(false);
    await applyRegistrationClosed(true);
  }

  async function setPublishedOnSite(published: boolean) {
    if (!evento?.id) return;
    try {
      setTogglingPublished(true);
      setError('');
      await updateCampaign(evento.id, { published });
      setEvento((prev) => (prev ? { ...prev, published } : prev));
    } catch {
      setError('Erro ao atualizar publicação do evento no site');
    } finally {
      setTogglingPublished(false);
    }
  }

  async function setCheckInOnApp(enabled: boolean) {
    if (!evento?.id) return;
    try {
      setTogglingCheckInOnApp(true);
      setError('');
      await updateCampaign(evento.id, { checkInOnApp: enabled, credentialingOnApp: false });
      setEvento((prev) =>
        prev ? { ...prev, checkInOnApp: enabled, credentialingOnApp: false } : prev,
      );
    } catch {
      setError('Erro ao atualizar check-in no app');
    } finally {
      setTogglingCheckInOnApp(false);
    }
  }

  async function confirmarExclusao() {
    if (!evento?.id) return;
    try {
      setDeleting(true);
      setError('');
      const ok = await assertAdminSession();
      if (!ok) {
        setError('Acesso não autorizado');
        return;
      }
      await deleteCampaignById(evento.id);
      router.push('/admin/eventos');
    } catch {
      setError('Erro ao excluir evento');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-cdl-gray-text">Carregando evento...</p>;
  }

  if (!evento) {
    return (
      <div className="max-w-2xl">
        <EventAdminBackLink href={backHref} />
        <p className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-cdl-gray-text">Evento não encontrado.</p>
      </div>
    );
  }

  const hasRegistration = hasEventRegistrationConfigured(evento);
  const hasFormRegistration = hasEventFormRegistration(evento);
  const inscricaoEncerrada = Boolean(evento.registrationClosed);
  const reg = getEffectiveRegistration(evento, { ignoreRegistrationClosed: true });
  const payment = getEffectivePayment(evento);
  const publicSlug = evento.id ?? eventId;

  return (
    <div className="w-full max-w-3xl">
      <EventAdminBackLink href={backHref} />

      <div className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{evento.title}</h1>
          {evento.published === false && (
            <span className="mt-2 inline-flex rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-700">
              Rascunho
            </span>
          )}
        </div>
        <Link href={`/admin/campanhas/edit?id=${evento.id}`} className="btn-secondary shrink-0 text-sm">
          Editar
        </Link>
      </div>
      {hasFormRegistration && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={eventSubPageHref('credenciamento', eventId, detailsReturnTarget)}
            className="btn-primary text-sm !px-4 !py-2"
          >
            Credenciamento
          </Link>
          <Link
            href={eventSubPageHref('inscritos', eventId, detailsReturnTarget)}
            className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100"
          >
            Inscritos ({inscritos})
          </Link>
          <Link
            href={eventSubPageHref('certificados', eventId, detailsReturnTarget)}
            className="inline-flex items-center rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 ring-1 ring-violet-100 hover:bg-violet-100"
          >
            Certificados
          </Link>
        </div>
      )}
      </div>

      {evento.description && (
        <p className="mt-4 text-sm leading-relaxed text-gray-600">{evento.description}</p>
      )}

      <dl className="mt-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-gray-500">Categoria</dt>
          <dd className="mt-0.5 text-gray-900">{evento.category || '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Data do evento</dt>
          <dd className="mt-0.5 text-gray-900">
            {evento.date ? formatEventDateForDisplay(evento.date) : '—'}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Publicação</dt>
          <dd className="mt-0.5 text-gray-900">{evento.published === false ? 'Rascunho' : 'Publicado'}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Inscrição</dt>
          <dd className="mt-0.5 text-gray-900">
            {!hasRegistration
              ? 'Não configurada'
              : reg.kind === 'external'
                ? 'Link externo'
                : `Formulário (${reg.kind === 'form' ? reg.keys.length : 0} campos)`}
            {hasRegistration && (
              <span
                className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  inscricaoEncerrada ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {inscricaoEncerrada ? 'encerrada' : 'aberta'}
              </span>
            )}
          </dd>
        </div>
        {hasFormRegistration && (
          <>
            <div>
              <dt className="font-medium text-gray-500">Total de inscritos</dt>
              <dd className="mt-0.5 text-gray-900">{inscritos}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Total credenciados</dt>
              <dd className="mt-0.5 text-gray-900">{totalCredenciados}</dd>
            </div>
          </>
        )}
        {payment.kind !== 'none' && (
          <div>
            <dt className="font-medium text-gray-500">Pagamento</dt>
            <dd className="mt-0.5 text-gray-900 capitalize">
              {payment.kind === 'asaas' ? 'Asaas' : payment.kind === 'pix' ? 'PIX manual' : '—'}
            </dd>
          </div>
        )}
      </dl>

      <section className="mt-6 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue disabled:opacity-50"
            checked={evento.published !== false}
            disabled={togglingPublished}
            onChange={(e) => void setPublishedOnSite(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">Publicar no site</span>
            <span className="mt-1 block text-xs text-cdl-gray-text">
              {togglingPublished
                ? 'Salvando…'
                : evento.published !== false
                  ? 'Visível nas listagens e na página do evento.'
                  : 'Rascunho — só admins com link de pré-visualização.'}
            </span>
          </span>
        </label>
        {hasFormRegistration && (
          <label className="flex cursor-pointer items-start gap-3 border-t border-gray-200/80 pt-3">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue disabled:opacity-50"
              checked={evento.checkInOnApp === true || evento.credentialingOnApp === true}
              disabled={togglingCheckInOnApp || evento.published === false}
              onChange={(e) => void setCheckInOnApp(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Check-in no site</span>
              <span className="mt-1 block text-xs text-cdl-gray-text">
                {togglingCheckInOnApp
                  ? 'Salvando…'
                  : evento.published === false
                    ? 'Publique o evento no site para ativar a área de check-in na home do app.'
                    : evento.checkInOnApp === true || evento.credentialingOnApp === true
                      ? 'Inscritos podem fazer check-in pelo app (CPF e QR Code).'
                      : 'Desativado — o app não exibirá este evento na área de check-in.'}
              </span>
            </span>
          </label>
        )}
      </section>

      {hasFormRegistration && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Últimos inscritos</h2>
              {inscritos > 0 && (
                <Link
                  href={eventSubPageHref('inscritos', eventId, detailsReturnTarget)}
                  className="text-xs font-medium text-cdl-blue hover:underline"
                >
                  Ver todos ({inscritos})
                </Link>
              )}
            </div>
            {ultimosInscritos.length === 0 ? (
              <p className="mt-2 text-xs text-cdl-gray-text">Nenhuma inscrição ainda.</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
                {ultimosInscritos.map((row) => (
                  <InscriptionCompactRow
                    key={row.id}
                    row={row}
                    meta={formatDateTimeCompact(row.createdAt)}
                    payment={payment}
                    showCredentialedBadge={isInscriptionCredentialed(row)}
                  />
                ))}
              </ul>
            )}
            {inscritos > ULTIMOS_INSCRITOS_LIMITE && (
              <p className="mt-2 text-[10px] text-gray-500">
                + {inscritos - ULTIMOS_INSCRITOS_LIMITE} inscrição(ões) anterior(es).
              </p>
            )}
          </section>

          <section className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Últimos credenciados
              </h2>
              {totalCredenciados > 0 && (
                <Link
                  href={eventSubPageHref('credenciamento', eventId, detailsReturnTarget)}
                  className="text-xs font-medium text-cdl-blue hover:underline"
                >
                  Credenciamento ({totalCredenciados})
                </Link>
              )}
            </div>
            {ultimosCredenciados.length === 0 ? (
              <p className="mt-2 text-xs text-cdl-gray-text">Nenhum credenciado ainda.</p>
            ) : (
              <ul className="mt-2 divide-y divide-emerald-100/80">
                {ultimosCredenciados.map((row) => (
                  <InscriptionCompactRow
                    key={row.id}
                    row={row}
                    meta={
                      row.credentialedAt
                        ? formatDateTimeCompact(row.credentialedAt)
                        : ''
                    }
                    payment={payment}
                    variant="credentialed"
                    showCredentialedBadge
                    credentialedBadgeMuted
                  />
                ))}
              </ul>
            )}
            {totalCredenciados > ULTIMOS_CREDENCIADOS_LIMITE && (
              <p className="mt-2 text-[10px] text-gray-500">
                + {totalCredenciados - ULTIMOS_CREDENCIADOS_LIMITE} credenciamento(s) anterior(es).
              </p>
            )}
          </section>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {evento.published !== false ? (
          <Link
            href={campaignPublicPageUrl(publicSlug)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm !px-4 !py-2"
          >
            Ver página pública
          </Link>
        ) : (
          <Link
            href={campaignPublicPageUrl(publicSlug, { preview: true })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm !px-4 !py-2"
          >
            Ver rascunho
          </Link>
        )}
        {hasFormRegistration && (
          <Link
            href={campaignInscriptionPageUrl(publicSlug, { preview: evento.published === false })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm !px-4 !py-2"
          >
            Ver inscrição
          </Link>
        )}
        {hasRegistration && (
          <button
            type="button"
            onClick={() => handleRegistrationToggleClick()}
            disabled={togglingRegistration}
            title={
              inscricaoEncerrada ? 'Reabrir inscrição ao público' : 'Encerrar inscrição ao público'
            }
            className={`text-sm !px-4 !py-2 disabled:opacity-50 ${
              inscricaoEncerrada ? 'btn-secondary' : 'btn-primary'
            }`}
          >
            {togglingRegistration
              ? 'Salvando…'
              : inscricaoEncerrada
                ? 'Reabrir inscrição'
                : 'Encerrar inscrição'}
          </button>
        )}
      </div>
      {hasRegistration && (
        <p className="mt-2 text-xs text-gray-500">
          Encerrar a inscrição oculta o formulário no site; você pode reabrir quando quiser.
        </p>
      )}

      <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50/80 p-5">
        <h2 className="text-sm font-semibold text-gray-900">Ações sensíveis</h2>
        <p className="mt-1 text-xs text-gray-600">
          Excluir o evento remove a página e os links públicos. Esta ação não pode ser desfeita.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError('');
              setShowDeleteModal(true);
            }}
            disabled={deleting}
            className="inline-flex items-center rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-50"
          >
            Excluir evento
          </button>
        </div>
        {error && !showDeleteModal && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </section>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmar-exclusao-evento-detalhe-titulo"
          onClick={() => {
            if (!deleting) setShowDeleteModal(false);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
              <p className="text-sm font-semibold text-amber-900">Área sensível — administrador</p>
              <p className="mt-1 text-xs text-amber-800">
                Esta ação altera dados oficiais do site. Prossiga somente se tiver autorização e certeza do impacto.
              </p>
            </div>
            <div className="p-6">
              <h3 id="confirmar-exclusao-evento-detalhe-titulo" className="text-center text-lg font-bold text-gray-900">
                Excluir evento?
              </h3>
              <p className="mt-3 text-center text-sm text-gray-600">
                O evento <strong className="text-gray-900">{evento.title}</strong> será removido da listagem e da
                página pública. <span className="font-medium text-gray-800">Não é possível desfazer.</span>
              </p>
              {hasFormRegistration && (
                <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  Este evento usa inscrição pelo site. Após excluir, o link de inscrição deixa de funcionar; dados já
                  enviados podem exigir tratamento separado no Firebase.
                </p>
              )}
              {error && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarExclusao()}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Excluindo...' : 'Sim, excluir definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminSensitiveConfirmModal
        open={showCloseRegistrationModal}
        title="Deseja realmente encerrar a inscrição?"
        titleId="confirm-close-registration-title"
        confirmLabel="Sim, encerrar"
        confirmTone="warning"
        showSensitiveBanner={false}
        busy={togglingRegistration}
        onClose={() => {
          if (!togglingRegistration) setShowCloseRegistrationModal(false);
        }}
        onConfirm={() => void confirmCloseRegistration()}
      >
        Ao encerrar, o formulário deixa de aparecer no site. Você pode reabrir a inscrição quando precisar.
      </AdminSensitiveConfirmModal>
    </div>
  );
}
