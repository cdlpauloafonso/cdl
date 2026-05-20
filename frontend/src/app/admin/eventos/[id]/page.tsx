'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  countEventInscriptions,
  deleteCampaignById,
  getCampaign,
  listEventInscriptions,
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
import { getEffectivePayment } from '@/lib/event-payment-fields';
import { formatCredentialedAt, isInscriptionCredentialed } from '@/lib/event-credentialing';
import {
  EVENT_ADMIN_LIST_PATH,
  eventDetailsPath,
  eventSubPageHref,
  resolveEventAdminBackHref,
} from '@/lib/event-admin-navigation';
import { EventAdminBackLink } from '@/components/admin/EventAdminBackLink';

const ULTIMOS_INSCRITOS_LIMITE = 10;
const ULTIMOS_CREDENCIADOS_LIMITE = 10;

function pickUltimosCredenciados(lista: (EventInscriptionRecord & { id: string })[]) {
  return lista
    .filter(isInscriptionCredentialed)
    .sort((a, b) => {
      const ta = new Date(a.credentialedAt ?? 0).getTime() || 0;
      const tb = new Date(b.credentialedAt ?? 0).getTime() || 0;
      return tb - ta;
    })
    .slice(0, ULTIMOS_CREDENCIADOS_LIMITE);
}

function formatInscriptionDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
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
  const [deleting, setDeleting] = useState(false);
  const [togglingRegistration, setTogglingRegistration] = useState(false);
  const [togglingPublished, setTogglingPublished] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setEvento(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const ev = await getCampaign(eventId);
        if (!mounted) return;
        if (!ev) {
          setEvento(null);
          return;
        }
        setEvento(ev);
        if (hasEventFormRegistration(ev)) {
          try {
            const [total, lista] = await Promise.all([
              countEventInscriptions(eventId),
              listEventInscriptions(eventId),
            ]);
            if (mounted) {
              const credenciados = lista.filter(isInscriptionCredentialed);
              setInscritos(total);
              setUltimosInscritos(lista.slice(0, ULTIMOS_INSCRITOS_LIMITE));
              setTotalCredenciados(credenciados.length);
              setUltimosCredenciados(pickUltimosCredenciados(lista));
            }
          } catch {
            if (mounted) {
              setInscritos(0);
              setUltimosInscritos([]);
              setTotalCredenciados(0);
              setUltimosCredenciados([]);
            }
          }
        } else if (mounted) {
          setUltimosInscritos([]);
          setTotalCredenciados(0);
          setUltimosCredenciados([]);
        }
      } catch {
        if (mounted) setError('Erro ao carregar evento');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  async function toggleRegistrationClosed() {
    if (!evento?.id) return;
    if (!hasEventRegistrationConfigured(evento)) return;
    const next = !evento.registrationClosed;
    try {
      setTogglingRegistration(true);
      setError('');
      await updateCampaign(evento.id, { registrationClosed: next });
      setEvento((prev) => (prev ? { ...prev, registrationClosed: next } : prev));
    } catch {
      setError('Erro ao atualizar status da inscrição do evento');
    } finally {
      setTogglingRegistration(false);
    }
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
            href={eventSubPageHref('credenciamento', evento.id, detailsReturnTarget)}
            className="btn-primary text-sm !px-4 !py-2"
          >
            Credenciamento
          </Link>
          <Link
            href={eventSubPageHref('inscritos', evento.id, detailsReturnTarget)}
            className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100"
          >
            Inscritos ({inscritos})
          </Link>
          <Link
            href={eventSubPageHref('certificados', evento.id, detailsReturnTarget)}
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

      <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
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
      </section>

      {hasFormRegistration && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Últimos inscritos</h2>
            {inscritos > 0 && (
              <Link
                href={eventSubPageHref('inscritos', evento.id, detailsReturnTarget)}
                className="text-sm font-medium text-cdl-blue hover:underline"
              >
                Ver todos ({inscritos})
              </Link>
            )}
          </div>
          {ultimosInscritos.length === 0 ? (
            <p className="mt-3 text-sm text-cdl-gray-text">Nenhuma inscrição registrada ainda.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {ultimosInscritos.map((row) => {
                const subtitle = inscriptionDisplaySubtitle(row.fields);
                const paymentPending = row.paymentStatus === 'pending';
                const paymentPaid = row.paymentStatus === 'paid';
                const credentialed = isInscriptionCredentialed(row);
                return (
                  <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{inscriptionDisplayLabel(row.fields)}</p>
                      {subtitle ? <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p> : null}
                      <p className="mt-1 text-xs text-gray-500">{formatInscriptionDate(row.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {credentialed && (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Credenciado
                        </span>
                      )}
                      {payment.kind !== 'none' && (paymentPaid || paymentPending) && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            paymentPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {paymentPaid ? 'Pago' : 'Pendente'}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {inscritos > ULTIMOS_INSCRITOS_LIMITE && (
            <p className="mt-3 text-xs text-gray-500">
              Exibindo os {ULTIMOS_INSCRITOS_LIMITE} inscritos mais recentes.
            </p>
          )}
        </section>
      )}

      {hasFormRegistration && (
        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Últimos credenciados</h2>
            {totalCredenciados > 0 && (
              <Link
                href={eventSubPageHref('credenciamento', evento.id, detailsReturnTarget)}
                className="text-sm font-medium text-cdl-blue hover:underline"
              >
                Abrir credenciamento ({totalCredenciados})
              </Link>
            )}
          </div>
          {ultimosCredenciados.length === 0 ? (
            <p className="mt-3 text-sm text-cdl-gray-text">Nenhum participante credenciado ainda.</p>
          ) : (
            <ul className="mt-3 divide-y divide-emerald-100">
              {ultimosCredenciados.map((row) => {
                const subtitle = inscriptionDisplaySubtitle(row.fields);
                const paymentPending = row.paymentStatus === 'pending';
                const paymentPaid = row.paymentStatus === 'paid';
                return (
                  <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{inscriptionDisplayLabel(row.fields)}</p>
                      {subtitle ? <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p> : null}
                      <p className="mt-1 text-xs text-emerald-800">
                        Credenciado em {formatCredentialedAt(row.credentialedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <span className="inline-flex rounded-full bg-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                        Credenciado
                      </span>
                      {payment.kind !== 'none' && (paymentPaid || paymentPending) && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            paymentPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {paymentPaid ? 'Pago' : 'Pendente'}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {totalCredenciados > ULTIMOS_CREDENCIADOS_LIMITE && (
            <p className="mt-3 text-xs text-gray-500">
              Exibindo os {ULTIMOS_CREDENCIADOS_LIMITE} credenciamentos mais recentes.
            </p>
          )}
        </section>
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
            onClick={() => void toggleRegistrationClosed()}
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
    </div>
  );
}
