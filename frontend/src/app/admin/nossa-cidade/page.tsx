'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getNossaCidadeCMS, setNossaCidadeCMS } from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { PontosTuristicosNossaCidadeAdmin } from '@/components/admin/PontosTuristicosNossaCidadeAdmin';
import { sortPontosTuristicos } from '@/lib/nossa-cidade-pontos-metadata';

export default function AdminNossaCidadePage() {
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getNossaCidadeCMS()
      .then((data) => {
        if (data) {
          setExcerpt(data.excerpt ?? '');
          setContent(data.content ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('Faça login como administrador.');
        return;
      }
      const idTokenResult = await user.getIdTokenResult();
      const isClaimAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin);
      if (!isClaimAdmin) {
        const db = getFirestore();
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          setError('Acesso não autorizado.');
          return;
        }
      }

      const current = await getNossaCidadeCMS();
      await setNossaCidadeCMS({
        excerpt,
        content,
        pontosTuristicos: sortPontosTuristicos(current?.pontosTuristicos ?? []),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao salvar';
      setError(
        raw.includes('permission') || raw.includes('Permission')
          ? 'Sem permissão no Firestore. Publique as regras com o match /nossaCidade/.'
          : raw
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cdl-blue border-t-transparent" aria-hidden />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nossa cidade</h1>
          <p className="mt-1 text-cdl-gray-text">
            Edite o texto da página institucional abaixo. Os pontos turísticos são geridos na lista (Firestore).
          </p>
        </div>
        <Link
          href="/institucional/nossa-cidade"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Ver página no site
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Texto principal</h2>
          <p className="mt-1 text-sm text-cdl-gray-text">
            Subtítulo abaixo do título «Nossa Cidade». O bloco principal aceita HTML simples (parágrafos, negrito, links).
          </p>
          <label className="mt-4 block text-sm font-semibold text-gray-800" htmlFor="nc-excerpt">
            Resumo (subtítulo)
          </label>
          <textarea
            id="nc-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
          />

          <label className="mt-4 block text-sm font-semibold text-gray-800" htmlFor="nc-content">
            Conteúdo (HTML)
          </label>
          <textarea
            id="nc-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
            placeholder={'<div class="bg-white rounded-xl border ..."><h2>Sobre Paulo Afonso</h2><p>...</p></div>'}
          />
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Texto principal salvo com sucesso.
          </p>
        ) : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cdl-blue px-6 py-3 font-semibold text-white hover:bg-cdl-blue-dark disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar texto principal'}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <PontosTuristicosNossaCidadeAdmin />
      </div>
    </div>
  );
}
