'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchAsaasIntegration,
  fetchAsaasIntegrationStatus,
  saveAsaasIntegration,
  testAsaasIntegration,
  type AsaasIntegrationPublic,
  type AsaasIntegrationStatus,
} from '@/lib/asaas-api';
import {
  fetchResendIntegration,
  fetchResendIntegrationStatus,
  saveResendIntegration,
  testResendIntegration,
  type ResendIntegrationPublic,
  type ResendIntegrationStatus,
} from '@/lib/resend-api';
import { API_NOT_CONFIGURED_MESSAGE, getApiBaseUrl, isApiConfiguredForClient } from '@/lib/api-base';

const API_BASE = getApiBaseUrl();
const apiConfigured = isApiConfiguredForClient();
const WEBHOOK_URL = `${API_BASE}/api/asaas/webhook`;

type FeedbackKind = 'ok' | 'err' | null;
type Feedback = { kind: FeedbackKind; text: string };

const EMPTY_FEEDBACK: Feedback = { kind: null, text: '' };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export default function AdminConfiguracoesApisPage() {
  const [status, setStatus] = useState<AsaasIntegrationStatus | null>(null);
  const [integration, setIntegration] = useState<AsaasIntegrationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState<'webhook' | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(EMPTY_FEEDBACK);

  // Drafts (não enviam vazio, então o servidor não sobrescreve segredo existente)
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [enabled, setEnabled] = useState(true);
  const [sandboxKey, setSandboxKey] = useState('');
  const [productionKey, setProductionKey] = useState('');
  const [webhookToken, setWebhookToken] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [st, integ] = await Promise.all([
          fetchAsaasIntegrationStatus(),
          fetchAsaasIntegration().catch((err) => {
            if (!cancelled) {
              setFeedback({
                kind: 'err',
                text:
                  err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar as credenciais.',
              });
            }
            return null;
          }),
        ]);
        if (cancelled) return;
        setStatus(st);
        if (integ) {
          setIntegration(integ);
          setEnvironment(integ.environment);
          setEnabled(integ.enabled);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      setCopied('webhook');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      alert('Não foi possível copiar. Copie manualmente o endereço abaixo.');
    }
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(EMPTY_FEEDBACK);
    try {
      const updated = await saveAsaasIntegration({
        environment,
        enabled,
        apiKeySandbox: sandboxKey.trim() ? sandboxKey.trim() : undefined,
        apiKeyProduction: productionKey.trim() ? productionKey.trim() : undefined,
        webhookToken: webhookToken.trim() ? webhookToken.trim() : undefined,
      });
      setIntegration(updated);
      setSandboxKey('');
      setProductionKey('');
      setWebhookToken('');
      const newStatus = await fetchAsaasIntegrationStatus();
      setStatus(newStatus);
      setFeedback({ kind: 'ok', text: 'Configurações salvas com segurança.' });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível salvar.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear(field: 'apiKeySandbox' | 'apiKeyProduction' | 'webhookToken') {
    const label =
      field === 'apiKeySandbox'
        ? 'a chave de sandbox'
        : field === 'apiKeyProduction'
          ? 'a chave de produção'
          : 'o token do webhook';
    if (!confirm(`Tem certeza que deseja remover ${label}? Esta ação é imediata.`)) return;
    setSaving(true);
    setFeedback(EMPTY_FEEDBACK);
    try {
      const updated = await saveAsaasIntegration({
        clearSandboxKey: field === 'apiKeySandbox' || undefined,
        clearProductionKey: field === 'apiKeyProduction' || undefined,
        clearWebhookToken: field === 'webhookToken' || undefined,
      });
      setIntegration(updated);
      const newStatus = await fetchAsaasIntegrationStatus();
      setStatus(newStatus);
      setFeedback({ kind: 'ok', text: 'Credencial removida.' });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível remover.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setFeedback(EMPTY_FEEDBACK);
    const result = await testAsaasIntegration();
    setTesting(false);
    if (result.ok) {
      setFeedback({
        kind: 'ok',
        text: `Conexão bem-sucedida (${result.environment === 'production' ? 'produção' : 'sandbox'}).`,
      });
    } else {
      setFeedback({
        kind: 'err',
        text: result.error ?? 'Falha ao contactar Asaas.',
      });
    }
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-cdl-gray-text">
        <Link href="/admin/configuracoes" className="text-cdl-blue hover:underline">
          Configurações do site
        </Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="text-gray-700">APIs</span>
      </p>

      <h1 className="mt-2 text-2xl font-bold text-gray-900">APIs — integrações</h1>
      <p className="mt-1 text-cdl-gray-text">
        Pagamentos (Asaas) e envio de certificados por e-mail (Resend). As credenciais são
        armazenadas com acesso restrito e exibidas aqui apenas em forma mascarada.
      </p>

      {!apiConfigured && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">API não configurada no frontend</p>
          <p className="mt-1">{API_NOT_CONFIGURED_MESSAGE}</p>
          <p className="mt-2 text-xs">
            Valor esperado no Netlify:{' '}
            <code className="rounded bg-amber-100 px-1">https://apiassas.cdlpauloafonso.com</code>
          </p>
        </div>
      )}

      {/* Feedback */}
      {feedback.kind && (
        <div
          className={`mt-4 rounded-lg border px-4 py-2 text-sm ${
            feedback.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Status Asaas */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Asaas — status
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-cdl-gray-text">Verificando servidor...</p>
        ) : status ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                status.configured
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {status.configured ? 'Configurado' : 'Não configurado'}
            </span>
            <span className="text-sm text-gray-600">
              Ambiente:{' '}
              <strong className="font-medium text-gray-900">
                {status.environment === 'production' ? 'Produção' : 'Sandbox'}
              </strong>
            </span>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {testing ? 'Testando...' : 'Testar conexão'}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-red-700">
            {!apiConfigured
              ? API_NOT_CONFIGURED_MESSAGE
              : (
                  <>
                    Não foi possível contactar o backend em{' '}
                    <code className="text-xs">{API_BASE}</code>. Verifique se o servidor está em
                    execução (aaPanel / PM2) e se o DNS aponta para este host.
                  </>
                )}
          </p>
        )}
      </section>

      {/* Webhook Asaas */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Asaas — webhook
        </h2>
        <p className="mt-2 text-sm text-cdl-gray-text">
          Cadastre esta URL no painel Asaas (Integrações → Webhooks) para confirmar pagamentos automaticamente.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="block flex-1 break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800">
            {WEBHOOK_URL}
          </code>
          <button type="button" onClick={copyWebhook} className="btn-secondary shrink-0 text-sm">
            {copied === 'webhook' ? 'Copiado!' : 'Copiar URL'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          O token configurado abaixo deve ser o mesmo enviado pelo Asaas no header{' '}
          <code>asaas-access-token</code>.
        </p>
      </section>

      {/* Credenciais Asaas */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Asaas — credenciais
        </h2>
        <p className="mt-2 text-xs text-gray-500">
          As chaves nunca trafegam para o navegador depois de salvas. Você só vê os
          últimos dígitos. Para trocar, digite a nova chave no campo correspondente
          e clique em <strong>Salvar</strong>. Campo em branco mantém a chave atual.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-cdl-gray-text">Carregando...</p>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Ativada */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
              />
              <span className="text-sm text-gray-800">
                Integração ativada (desligue para suspender cobranças sem remover as chaves)
              </span>
            </label>

            {/* Ambiente */}
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="asaas-env">
                Ambiente
              </label>
              <select
                id="asaas-env"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value === 'production' ? 'production' : 'sandbox')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:outline-none focus:ring-2 focus:ring-cdl-blue/30"
              >
                <option value="sandbox">Sandbox (testes)</option>
                <option value="production">Produção</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Cada ambiente usa sua própria chave de API. Mantenha as duas chaves
                cadastradas para alternar quando quiser.
              </p>
            </div>

            {/* Chave Sandbox */}
            <CredentialField
              id="asaas-sandbox-key"
              label="Chave API — Sandbox"
              masked={integration?.apiKeySandboxMasked ?? ''}
              hasValue={Boolean(integration?.hasSandboxKey)}
              value={sandboxKey}
              onChange={setSandboxKey}
              onClear={() => handleClear('apiKeySandbox')}
              placeholder="$aact_..."
              disabled={saving}
            />

            {/* Chave Produção */}
            <CredentialField
              id="asaas-prod-key"
              label="Chave API — Produção"
              masked={integration?.apiKeyProductionMasked ?? ''}
              hasValue={Boolean(integration?.hasProductionKey)}
              value={productionKey}
              onChange={setProductionKey}
              onClear={() => handleClear('apiKeyProduction')}
              placeholder="$aact_..."
              disabled={saving}
            />

            {/* Webhook token */}
            <CredentialField
              id="asaas-webhook-token"
              label="Token do webhook"
              masked={integration?.webhookTokenMasked ?? ''}
              hasValue={Boolean(integration?.hasWebhookToken)}
              value={webhookToken}
              onChange={setWebhookToken}
              onClear={() => handleClear('webhookToken')}
              placeholder="Token forte (mín. 24 caracteres)"
              disabled={saving}
            />

            {/* Origem dos dados / auditoria */}
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Origem dos dados:{' '}
              <strong>
                {integration?.source === 'firestore'
                  ? 'Painel (Firestore protegido)'
                  : integration?.source === 'env'
                    ? '.env do backend'
                    : 'Sem credenciais cadastradas'}
              </strong>
              {integration?.updatedAt && (
                <>
                  {' '}· Atualizado em <strong>{formatDate(integration.updatedAt)}</strong>
                  {integration.updatedBy ? <> por <strong>{integration.updatedBy}</strong></> : null}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !apiConfigured}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !apiConfigured}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {testing ? 'Testando...' : 'Testar conexão'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Links úteis Asaas */}
      <section className="mt-6 rounded-xl border border-sky-100 bg-sky-50/80 p-5">
        <h2 className="text-sm font-semibold text-sky-900">Asaas — links úteis</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <a
              href="https://sandbox.asaas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cdl-blue hover:underline"
            >
              Painel Asaas Sandbox
            </a>
          </li>
          <li>
            <a
              href="https://www.asaas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cdl-blue hover:underline"
            >
              Painel Asaas Produção
            </a>
          </li>
          <li>
            <a
              href="https://docs.asaas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cdl-blue hover:underline"
            >
              Documentação Asaas
            </a>
          </li>
        </ul>
      </section>

      <ResendConfigSection apiConfigured={apiConfigured} formatDate={formatDate} />
    </div>
  );
}

function ResendConfigSection({
  apiConfigured,
  formatDate,
}: {
  apiConfigured: boolean;
  formatDate: (iso: string | null) => string;
}) {
  const [status, setStatus] = useState<ResendIntegrationStatus | null>(null);
  const [integration, setIntegration] = useState<ResendIntegrationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(EMPTY_FEEDBACK);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [enabled, setEnabled] = useState(false);
  const [sandboxKey, setSandboxKey] = useState('');
  const [productionKey, setProductionKey] = useState('');
  const [fromSandbox, setFromSandbox] = useState('onboarding@resend.dev');
  const [fromProduction, setFromProduction] = useState(
    'CDL Paulo Afonso <certificados@cdlpauloafonso.com>',
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [st, integ] = await Promise.all([
          fetchResendIntegrationStatus(),
          fetchResendIntegration().catch((err) => {
            if (!cancelled) {
              setFeedback({
                kind: 'err',
                text:
                  err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar credenciais Resend.',
              });
            }
            return null;
          }),
        ]);
        if (cancelled) return;
        setStatus(st);
        if (integ) {
          setIntegration(integ);
          setEnvironment(integ.environment);
          setEnabled(integ.enabled);
          if (integ.fromAddressSandbox) setFromSandbox(integ.fromAddressSandbox);
          if (integ.fromAddressProduction) setFromProduction(integ.fromAddressProduction);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setFeedback(EMPTY_FEEDBACK);
    try {
      const updated = await saveResendIntegration({
        environment,
        enabled,
        apiKeySandbox: sandboxKey.trim() ? sandboxKey.trim() : undefined,
        apiKeyProduction: productionKey.trim() ? productionKey.trim() : undefined,
        fromAddressSandbox: fromSandbox.trim() ? fromSandbox.trim() : undefined,
        fromAddressProduction: fromProduction.trim() ? fromProduction.trim() : undefined,
      });
      setIntegration(updated);
      setSandboxKey('');
      setProductionKey('');
      const newStatus = await fetchResendIntegrationStatus();
      setStatus(newStatus);
      setFeedback({ kind: 'ok', text: 'Configurações Resend salvas.' });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível salvar.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear(field: 'apiKeySandbox' | 'apiKeyProduction') {
    const label = field === 'apiKeySandbox' ? 'a chave de sandbox' : 'a chave de produção';
    if (!confirm(`Remover ${label}?`)) return;
    setSaving(true);
    setFeedback(EMPTY_FEEDBACK);
    try {
      const updated = await saveResendIntegration({
        clearSandboxKey: field === 'apiKeySandbox' || undefined,
        clearProductionKey: field === 'apiKeyProduction' || undefined,
      });
      setIntegration(updated);
      const newStatus = await fetchResendIntegrationStatus();
      setStatus(newStatus);
      setFeedback({ kind: 'ok', text: 'Chave removida.' });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Não foi possível remover.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setFeedback(EMPTY_FEEDBACK);
    const result = await testResendIntegration();
    setTesting(false);
    if (result.ok) {
      setFeedback({
        kind: 'ok',
        text: `Conexão Resend OK (${result.environment === 'production' ? 'produção' : 'sandbox'})${
          result.domainsCount != null ? ` · ${result.domainsCount} domínio(s) verificado(s)` : ''
        }.`,
      });
    } else {
      setFeedback({
        kind: 'err',
        text: result.error ?? 'Falha ao contactar Resend.',
      });
    }
  }

  const activeFrom =
    environment === 'production'
      ? integration?.fromAddressProduction || fromProduction
      : integration?.fromAddressSandbox || fromSandbox;

  return (
    <>
      <h2 className="mt-10 text-lg font-bold text-gray-900">Resend — certificados por e-mail</h2>
      <p className="mt-1 text-sm text-cdl-gray-text">
        Envio de certificados em PDF. Em <strong>sandbox</strong>, use{' '}
        <code className="text-xs">onboarding@resend.dev</code> e envie só para e-mails verificados
        no Resend. Em <strong>produção</strong>, verifique o domínio{' '}
        <strong>cdlpauloafonso.com</strong> antes de enviar em massa.
      </p>

      {feedback.kind && (
        <div
          className={`mt-4 rounded-lg border px-4 py-2 text-sm ${
            feedback.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Status</h3>
        {loading ? (
          <p className="mt-3 text-sm text-cdl-gray-text">Verificando...</p>
        ) : status ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                status.providerReady
                  ? status.enabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {!status.providerReady
                ? 'Sem API key'
                : status.enabled
                  ? 'Ativo'
                  : 'Desativado'}
            </span>
            <span className="text-sm text-gray-600">
              Ambiente:{' '}
              <strong className="font-medium text-gray-900">
                {status.environment === 'production' ? 'Produção' : 'Sandbox'}
              </strong>
            </span>
            {status.fromAddress && (
              <span className="text-sm text-gray-600">
                Remetente:{' '}
                <strong className="font-medium text-gray-900">{status.fromAddress}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {testing ? 'Testando...' : 'Testar conexão'}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-red-700">
            Não foi possível contactar o backend. Se o Asaas responde mas o Resend não, faça deploy
            do backend no servidor (git pull + build + PM2 restart).
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Credenciais</h3>
        <p className="mt-2 text-xs text-gray-500">
          Cada ambiente usa sua própria API key. Campo em branco mantém a chave atual ao salvar.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-cdl-gray-text">Carregando...</p>
        ) : (
          <div className="mt-4 space-y-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
              />
              <span className="text-sm text-gray-800">Envio de certificados ativado</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="resend-env">
                Ambiente ativo
              </label>
              <select
                id="resend-env"
                value={environment}
                onChange={(e) =>
                  setEnvironment(e.target.value === 'production' ? 'production' : 'sandbox')
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:outline-none focus:ring-2 focus:ring-cdl-blue/30"
              >
                <option value="sandbox">Sandbox (testes — onboarding@resend.dev)</option>
                <option value="production">Produção (domínio verificado)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Remetente em uso: <code className="rounded bg-gray-100 px-1">{activeFrom}</code>
              </p>
            </div>

            <CredentialField
              id="resend-sandbox-key"
              label="API key — Sandbox"
              masked={integration?.apiKeySandboxMasked ?? ''}
              hasValue={Boolean(integration?.hasSandboxKey)}
              value={sandboxKey}
              onChange={setSandboxKey}
              onClear={() => handleClear('apiKeySandbox')}
              placeholder="re_..."
              disabled={saving}
            />

            <CredentialField
              id="resend-prod-key"
              label="API key — Produção"
              masked={integration?.apiKeyProductionMasked ?? ''}
              hasValue={Boolean(integration?.hasProductionKey)}
              value={productionKey}
              onChange={setProductionKey}
              onClear={() => handleClear('apiKeyProduction')}
              placeholder="re_..."
              disabled={saving}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="resend-from-sandbox">
                Remetente — Sandbox
              </label>
              <input
                id="resend-from-sandbox"
                type="text"
                value={fromSandbox}
                onChange={(e) => setFromSandbox(e.target.value)}
                placeholder="onboarding@resend.dev"
                disabled={saving}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:outline-none focus:ring-2 focus:ring-cdl-blue/30"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="resend-from-production"
              >
                Remetente — Produção
              </label>
              <input
                id="resend-from-production"
                type="text"
                value={fromProduction}
                onChange={(e) => setFromProduction(e.target.value)}
                placeholder="CDL Paulo Afonso <certificados@cdlpauloafonso.com>"
                disabled={saving}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:outline-none focus:ring-2 focus:ring-cdl-blue/30"
              />
              <p className="mt-1 text-xs text-gray-500">
                Formato: <code>Nome &lt;email@dominio.com&gt;</code>
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Origem:{' '}
              <strong>
                {integration?.source === 'firestore'
                  ? 'Painel (Firestore protegido)'
                  : integration?.source === 'env'
                    ? '.env do backend'
                    : 'Sem credenciais'}
              </strong>
              {integration?.updatedAt && (
                <>
                  {' '}· Atualizado em <strong>{formatDate(integration.updatedAt)}</strong>
                  {integration.updatedBy ? (
                    <>
                      {' '}
                      por <strong>{integration.updatedBy}</strong>
                    </>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !apiConfigured}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !apiConfigured}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {testing ? 'Testando...' : 'Testar conexão'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-violet-100 bg-violet-50/80 p-5">
        <h3 className="text-sm font-semibold text-violet-900">Resend — links úteis</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cdl-blue hover:underline"
            >
              Criar API key
            </a>
          </li>
          <li>
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cdl-blue hover:underline"
            >
              Verificar domínio
            </a>
          </li>
          <li>
            <a
              href="https://resend.com/docs/send-with-nodejs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cdl-blue hover:underline"
            >
              Documentação Node.js
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}

type CredentialFieldProps = {
  id: string;
  label: string;
  masked: string;
  hasValue: boolean;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder: string;
  disabled: boolean;
};

function CredentialField({
  id,
  label,
  masked,
  hasValue,
  value,
  onChange,
  onClear,
  placeholder,
  disabled,
}: CredentialFieldProps) {
  const [reveal, setReveal] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1 text-xs text-gray-500">
        Valor atual:{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5">
          {hasValue ? masked : 'não definido'}
        </code>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type={reveal ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasValue ? 'Manter atual (deixe em branco)' : placeholder}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:outline-none focus:ring-2 focus:ring-cdl-blue/30"
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          disabled={!value}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {reveal ? 'Ocultar' : 'Mostrar'}
        </button>
        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
