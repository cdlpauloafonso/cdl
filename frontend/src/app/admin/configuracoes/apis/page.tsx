'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAsaasIntegrationStatus, type AsaasIntegrationStatus } from '@/lib/asaas-api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const WEBHOOK_URL = `${API_BASE}/api/asaas/webhook`;

const ENV_VARS = [
  {
    name: 'ASAAS_ENABLED',
    description: 'Ativa a integração (use false para desligar sem remover a chave).',
    example: 'true',
  },
  {
    name: 'ASAAS_ENV',
    description: 'Ambiente: sandbox (testes) ou production.',
    example: 'sandbox',
  },
  {
    name: 'ASAAS_API_KEY',
    description: 'Chave de API gerada no painel Asaas (Integrações → API).',
    example: '$aact_...',
    secret: true,
  },
  {
    name: 'ASAAS_WEBHOOK_TOKEN',
    description: 'Token do webhook no Asaas (header asaas-access-token).',
    example: 'token-secreto',
    secret: true,
  },
  {
    name: 'FIREBASE_SERVICE_ACCOUNT_JSON',
    description: 'Conta de serviço Firebase no backend (webhook Asaas / pagamento). Credenciamento público usa Firestore Rules.',
    example: '{"type":"service_account",...}',
    secret: true,
  },
] as const;

export default function AdminConfiguracoesApisPage() {
  const [status, setStatus] = useState<AsaasIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'webhook' | null>(null);

  useEffect(() => {
    fetchAsaasIntegrationStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
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

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-cdl-gray-text">
        <Link href="/admin/configuracoes" className="text-cdl-blue hover:underline">
          Configurações do site
        </Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="text-gray-700">APIs (Asaas)</span>
      </p>

      <h1 className="mt-2 text-2xl font-bold text-gray-900">APIs — Asaas</h1>
      <p className="mt-1 text-cdl-gray-text">
        Pagamentos de inscrição em eventos via Asaas. As chaves ficam no servidor (arquivo{' '}
        <code className="rounded bg-gray-100 px-1 text-xs">.env</code> do backend), não no Firestore.
      </p>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Status da integração</h2>
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
          </div>
        ) : (
          <p className="mt-3 text-sm text-red-700">
            Não foi possível contactar o backend em{' '}
            <code className="text-xs">{API_BASE}</code>. Verifique se o servidor está em execução e se{' '}
            <code className="text-xs">NEXT_PUBLIC_API_URL</code> está correto no frontend.
          </p>
        )}
        {!loading && status && !status.configured && (
          <p className="mt-3 text-sm text-amber-800">
            Defina <code className="text-xs">ASAAS_API_KEY</code> no backend e reinicie o servidor.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Webhook</h2>
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
          O token configurado em <code>ASAAS_WEBHOOK_TOKEN</code> deve ser o mesmo enviado no header{' '}
          <code>asaas-access-token</code>.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Variáveis no backend
        </h2>
        <p className="mt-2 text-sm text-cdl-gray-text">
          Edite <code className="text-xs">backend/.env</code> (veja{' '}
          <code className="text-xs">backend/.env.example</code>). Reinicie o servidor após alterar.
        </p>
        <ul className="mt-4 space-y-4">
          {ENV_VARS.map((v) => (
            <li key={v.name} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <p className="font-mono text-sm font-semibold text-gray-900">{v.name}</p>
              <p className="mt-1 text-sm text-cdl-gray-text">{v.description}</p>
              <p className="mt-1 text-xs text-gray-400">
                Ex.: {v.secret ? '••••••••' : v.example}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-sky-100 bg-sky-50/80 p-5">
        <h2 className="text-sm font-semibold text-sky-900">Links úteis</h2>
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
    </div>
  );
}
