'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getNossaCidadeCMS,
  setNossaCidadeCMS,
  type PontoTuristicoCMS,
  type PontoTuristicoIconKind,
} from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { DEFAULT_PONTOS_TURISTICOS_LIST } from '@/components/institucional/PontosTuristicosSection';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

const ICON_OPTIONS: { value: PontoTuristicoIconKind; label: string }[] = [
  { value: 'church', label: 'Igreja / patrimônio' },
  { value: 'hydro', label: 'Hidrelétrica / barragem' },
  { value: 'bridge', label: 'Ponte' },
  { value: 'nature', label: 'Natureza / caatinga' },
  { value: 'museum', label: 'Museu / cultura' },
  { value: 'craft', label: 'Artesanato' },
  { value: 'boat', label: 'Rio / passeio aquático' },
];

function sortPontos(list: PontoTuristicoCMS[]): PontoTuristicoCMS[] {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function freshPonto(order: number): PontoTuristicoCMS {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ponto-${Date.now()}`,
    nome: '',
    descricaoCurta: '',
    detalhes: '',
    iconKind: 'nature',
    imageSrc: '',
    imageAlt: '',
    order,
  };
}

export default function AdminNossaCidadePage() {
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [pontos, setPontos] = useState<PontoTuristicoCMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imgUploadIdx, setImgUploadIdx] = useState<number | null>(null);
  const [imgErr, setImgErr] = useState('');

  useEffect(() => {
    getNossaCidadeCMS()
      .then((data) => {
        if (data) {
          setExcerpt(data.excerpt ?? '');
          setContent(data.content ?? '');
          if (data.pontosTuristicos?.length) {
            setPontos(sortPontos(data.pontosTuristicos.map((p, i) => ({ ...p, order: p.order ?? i }))));
          } else {
            setPontos(
              DEFAULT_PONTOS_TURISTICOS_LIST.map((p, i) => ({
                ...p,
                iconKind: p.iconKind as PontoTuristicoIconKind,
                order: i,
              }))
            );
          }
        } else {
          setPontos(
            DEFAULT_PONTOS_TURISTICOS_LIST.map((p, i) => ({
              ...p,
              iconKind: p.iconKind as PontoTuristicoIconKind,
              order: i,
            }))
          );
        }
      })
      .catch(() => {
        setPontos(
          DEFAULT_PONTOS_TURISTICOS_LIST.map((p, i) => ({
            ...p,
            iconKind: p.iconKind as PontoTuristicoIconKind,
            order: i,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function uploadForIndex(file: File | undefined, index: number) {
    if (!file) return;
    setImgErr('');
    setImgUploadIdx(index);
    try {
      if (!IMGBB_KEY) {
        setImgErr('Configure NEXT_PUBLIC_IMGBB_KEY para enviar imagens.');
        return;
      }
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: form });
      const data = await res.json();
      const url = data?.data?.url as string | undefined;
      if (url) {
        setPontos((prev) => {
          const next = [...prev];
          if (next[index]) next[index] = { ...next[index], imageSrc: url };
          return next;
        });
      } else {
        setImgErr('Falha no upload da imagem.');
      }
    } catch {
      setImgErr('Falha no upload da imagem.');
    } finally {
      setImgUploadIdx(null);
    }
  }

  function movePonto(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= pontos.length) return;
    setPontos((prev) => {
      const next = [...prev];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      return next.map((p, i) => ({ ...p, order: i }));
    });
  }

  function removePonto(index: number) {
    setPontos((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i })));
  }

  function updatePonto(index: number, patch: Partial<PontoTuristicoCMS>) {
    setPontos((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

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

      const payload: PontoTuristicoCMS[] = pontos.map((p, i) => ({
        ...p,
        order: i,
      }));

      await setNossaCidadeCMS({
        excerpt,
        content,
        pontosTuristicos: payload,
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
            Edite o texto da página institucional e os cartões de pontos turísticos (Firestore).
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

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-900 sm:text-lg">Pontos turísticos</h2>
              <p className="mt-0.5 text-xs leading-snug text-cdl-gray-text sm:text-sm sm:leading-normal">
                Ordem dos cartões na página. URLs de imagem podem ser externas (ex.: Wikimedia, ImgBB).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPontos((prev) => [...prev, freshPonto(prev.length)])}
              className="shrink-0 rounded-lg bg-cdl-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-cdl-blue-dark sm:py-2"
            >
              Adicionar ponto
            </button>
          </div>

          <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
            {pontos.map((p, index) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50/90 p-3 sm:p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-gray-200/80 pb-2 sm:mb-2.5 sm:gap-1.5 sm:border-0 sm:pb-0">
                  <span className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md bg-white px-2 text-xs font-bold tabular-nums text-gray-600 ring-1 ring-gray-200">
                    {index + 1}
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5 sm:flex-none">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePonto(index, -1)}
                      className="min-h-9 min-w-9 rounded-md border border-gray-300 bg-white px-2 text-sm font-medium disabled:opacity-40 sm:min-h-8 sm:min-w-8"
                      aria-label={`Mover ponto ${index + 1} para cima`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index >= pontos.length - 1}
                      onClick={() => movePonto(index, 1)}
                      className="min-h-9 min-w-9 rounded-md border border-gray-300 bg-white px-2 text-sm font-medium disabled:opacity-40 sm:min-h-8 sm:min-w-8"
                      aria-label={`Mover ponto ${index + 1} para baixo`}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePonto(index)}
                    className="min-h-9 w-full rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 sm:ml-auto sm:min-h-8 sm:w-auto sm:text-sm"
                  >
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-12 lg:gap-x-4 lg:gap-y-2">
                  <label className="block lg:col-span-12">
                    <span className="text-xs font-medium text-gray-700">Nome</span>
                    <input
                      value={p.nome}
                      onChange={(e) => updatePonto(index, { nome: e.target.value })}
                      className="mt-0.5 w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm leading-snug outline-none focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                    />
                  </label>

                  <label className="block lg:col-span-12">
                    <span className="text-xs font-medium text-gray-700">Descrição curta (cartão)</span>
                    <textarea
                      value={p.descricaoCurta}
                      onChange={(e) => updatePonto(index, { descricaoCurta: e.target.value })}
                      rows={2}
                      className="mt-0.5 w-full min-w-0 resize-y rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm leading-snug outline-none focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                    />
                  </label>

                  <label className="block lg:col-span-7">
                    <span className="text-xs font-medium text-gray-700">Detalhes (modal «Saiba mais»)</span>
                    <textarea
                      value={p.detalhes}
                      onChange={(e) => updatePonto(index, { detalhes: e.target.value })}
                      rows={3}
                      className="mt-0.5 w-full min-w-0 resize-y rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm leading-snug outline-none focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue lg:min-h-[7.5rem]"
                    />
                  </label>

                  <div className="flex flex-col gap-2 lg:col-span-5 lg:border-l lg:border-gray-200 lg:pl-4">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-700">Ícone</span>
                      <select
                        value={p.iconKind}
                        onChange={(e) =>
                          updatePonto(index, { iconKind: e.target.value as PontoTuristicoIconKind })
                        }
                        className="mt-0.5 w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                      >
                        {ICON_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block min-w-0">
                      <span className="text-xs font-medium text-gray-700">URL da imagem</span>
                      <input
                        value={p.imageSrc}
                        onChange={(e) => updatePonto(index, { imageSrc: e.target.value })}
                        className="mt-0.5 w-full min-w-0 break-all rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[11px] leading-snug outline-none focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue sm:text-xs"
                        placeholder="https://..."
                        spellCheck={false}
                      />
                    </label>

                    <div className="min-w-0">
                      <span className="text-xs font-medium text-gray-700">Enviar imagem (ImgBB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={imgUploadIdx === index}
                        onChange={(e) => uploadForIndex(e.target.files?.[0], index)}
                        className="mt-0.5 block w-full max-w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-gray-200 file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-gray-800 sm:text-sm"
                      />
                    </div>

                    <label className="block min-w-0">
                      <span className="text-xs font-medium text-gray-700">
                        Texto alternativo da imagem (acessibilidade)
                      </span>
                      <input
                        value={p.imageAlt}
                        onChange={(e) => updatePonto(index, { imageAlt: e.target.value })}
                        className="mt-0.5 w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm leading-snug outline-none focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Alterações salvas com sucesso.
          </p>
        ) : null}
        {imgErr ? <p className="text-sm text-amber-800">{imgErr}</p> : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cdl-blue px-6 py-3 font-semibold text-white hover:bg-cdl-blue-dark disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
