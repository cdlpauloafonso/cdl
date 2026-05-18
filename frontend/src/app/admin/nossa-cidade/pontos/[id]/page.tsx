'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getNossaCidadeCMS,
  setNossaCidadeCMS,
  type PontoTuristicoCMS,
  type PontoTuristicoIconKind,
} from '@/lib/firestore';
import { ensureAdminForClientWrite } from '@/lib/admin-client-write-guard';
import {
  freshPontoTuristico,
  PONTO_TURISTICO_ICON_OPTIONS,
  sortPontosTuristicos,
} from '@/lib/nossa-cidade-pontos-metadata';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

export default function AdminNossaCidadePontoEditPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const isNew = rawId === 'novo';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<PontoTuristicoCMS | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgErr, setImgErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        if (isNew) {
          const cms = await getNossaCidadeCMS();
          const n = sortPontosTuristicos(cms?.pontosTuristicos ?? []).length;
          if (!cancelled) setForm(freshPontoTuristico(n));
          return;
        }
        const cms = await getNossaCidadeCMS();
        const list = sortPontosTuristicos(cms?.pontosTuristicos ?? []);
        const found = list.find((p) => p.id === rawId);
        if (!found) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!cancelled) setForm({ ...found });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, rawId]);

  async function persistFullList(nextList: PontoTuristicoCMS[]) {
    const cms = await getNossaCidadeCMS();
    await setNossaCidadeCMS({
      excerpt: cms?.excerpt ?? '',
      content: cms?.content ?? '',
      pontosTuristicos: sortPontosTuristicos(nextList.map((p, i) => ({ ...p, order: i }))),
    });
  }

  async function handleSave() {
    if (!form) return;
    if (!form.nome.trim()) {
      setError('Informe o nome do ponto turístico.');
      return;
    }
    const authErr = await ensureAdminForClientWrite();
    if (authErr) {
      setError(authErr);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const cms = await getNossaCidadeCMS();
      let list = sortPontosTuristicos(cms?.pontosTuristicos ?? []);
      if (isNew) {
        list = [...list, { ...form, order: list.length }];
      } else {
        const idx = list.findIndex((p) => p.id === rawId);
        if (idx < 0) {
          setError('Ponto não encontrado.');
          return;
        }
        list[idx] = { ...form, id: rawId, order: idx };
      }
      await persistFullList(list);
      router.push('/admin/nossa-cidade');
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Erro ao salvar';
      setError(
        raw.includes('permission') || raw.includes('Permission')
          ? 'Sem permissão no Firestore. Publique as regras com o match /nossaCidade/.'
          : raw
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) {
      router.push('/admin/nossa-cidade');
      return;
    }
    if (!confirm('Remover este ponto turístico?')) return;
    const authErr = await ensureAdminForClientWrite();
    if (authErr) {
      setError(authErr);
      return;
    }
    setRemoving(true);
    setError('');
    try {
      const cms = await getNossaCidadeCMS();
      const list = sortPontosTuristicos(cms?.pontosTuristicos ?? []).filter((p) => p.id !== rawId);
      await persistFullList(list);
      router.push('/admin/nossa-cidade');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
    } finally {
      setRemoving(false);
    }
  }

  async function move(dir: -1 | 1) {
    if (isNew || !form) return;
    const authErr = await ensureAdminForClientWrite();
    if (authErr) {
      setError(authErr);
      return;
    }
    setMoving(true);
    setError('');
    try {
      const cms = await getNossaCidadeCMS();
      const list = sortPontosTuristicos(cms?.pontosTuristicos ?? []);
      const idx = list.findIndex((p) => p.id === rawId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= list.length) return;
      const next = [...list];
      const [row] = next.splice(idx, 1);
      next.splice(to, 0, row);
      await persistFullList(next);
      const refreshed = sortPontosTuristicos((await getNossaCidadeCMS())?.pontosTuristicos ?? []);
      const f = refreshed.find((p) => p.id === rawId);
      if (f) setForm({ ...f });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao reordenar');
    } finally {
      setMoving(false);
    }
  }

  async function uploadImage(file: File | undefined) {
    if (!file || !form) return;
    setImgErr('');
    setImgUploading(true);
    try {
      if (!IMGBB_KEY) {
        setImgErr('Configure NEXT_PUBLIC_IMGBB_KEY para enviar imagens.');
        return;
      }
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
      const data = await res.json();
      const url = data?.data?.url as string | undefined;
      if (url) setForm({ ...form, imageSrc: url });
      else setImgErr('Falha no upload da imagem.');
    } catch {
      setImgErr('Falha no upload da imagem.');
    } finally {
      setImgUploading(false);
    }
  }

  if (loading) {
    return <p className="text-cdl-gray-text">Carregando…</p>;
  }

  if (notFound || !form) {
    return (
      <div>
        <Link href="/admin/nossa-cidade" className="mb-4 inline-block text-sm text-cdl-blue hover:underline">
          ← Voltar a Nossa cidade
        </Link>
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-cdl-gray-text">Ponto turístico não encontrado.</p>
        </div>
      </div>
    );
  }

  const label = 'mb-1 block text-sm font-medium text-gray-700';

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Link href="/admin/nossa-cidade" className="mb-4 inline-block text-sm text-cdl-blue hover:underline">
        ← Voltar a Nossa cidade
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">{isNew ? 'Novo ponto turístico' : 'Editar ponto turístico'}</h1>
      <p className="mb-6 text-cdl-gray-text">Altere os campos e salve para atualizar a página institucional.</p>

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Dados do ponto</h2>

          {!isNew && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-800">Ordem na lista</p>
              <p className="mt-1 text-xs text-cdl-gray-text">Use os botões para trocar a posição na página pública.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={moving}
                  onClick={() => void move(-1)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Subir
                </button>
                <button
                  type="button"
                  disabled={moving}
                  onClick={() => void move(1)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Descer
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-12">
              <label htmlFor="pt-nome" className={label}>
                Nome
              </label>
              <input
                id="pt-nome"
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div className="lg:col-span-12">
              <label htmlFor="pt-desc" className={label}>
                Descrição curta (cartão)
              </label>
              <textarea
                id="pt-desc"
                value={form.descricaoCurta}
                onChange={(e) => setForm({ ...form, descricaoCurta: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div className="lg:col-span-7">
              <label htmlFor="pt-detalhes" className={label}>
                Detalhes (modal «Saiba mais»)
              </label>
              <textarea
                id="pt-detalhes"
                value={form.detalhes}
                onChange={(e) => setForm({ ...form, detalhes: e.target.value })}
                rows={6}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div className="flex flex-col gap-4 lg:col-span-5 lg:border-l lg:border-gray-200 lg:pl-6">
              <div>
                <label htmlFor="pt-icon" className={label}>
                  Ícone
                </label>
                <select
                  id="pt-icon"
                  value={form.iconKind}
                  onChange={(e) => setForm({ ...form, iconKind: e.target.value as PontoTuristicoIconKind })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                >
                  {PONTO_TURISTICO_ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pt-url" className={label}>
                  URL da imagem
                </label>
                <input
                  id="pt-url"
                  value={form.imageSrc}
                  onChange={(e) => setForm({ ...form, imageSrc: e.target.value })}
                  className="mt-1 w-full break-all rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                  placeholder="https://..."
                  spellCheck={false}
                />
              </div>

              <div>
                <span className={label}>Enviar imagem (ImgBB)</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={imgUploading}
                  onChange={(e) => void uploadImage(e.target.files?.[0])}
                  className="mt-1 block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-800"
                />
                {imgUploading && <p className="mt-1 text-xs text-cdl-gray-text">Enviando…</p>}
                {imgErr && <p className="mt-1 text-xs text-amber-800">{imgErr}</p>}
              </div>

              <div>
                <label htmlFor="pt-alt" className={label}>
                  Texto alternativo da imagem
                </label>
                <input
                  id="pt-alt"
                  value={form.imageAlt}
                  onChange={(e) => setForm({ ...form, imageAlt: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                />
              </div>

              {form.imageSrc ? (
                <div>
                  <span className={label}>Pré-visualização</span>
                  <img src={form.imageSrc} alt="" className="mt-2 max-h-40 rounded-lg border border-gray-200 object-cover" />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-cdl-blue px-6 py-3 font-semibold text-white hover:bg-cdl-blue-dark disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <Link
            href="/institucional/nossa-cidade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ver no site
          </Link>
          {!isNew && (
            <button
              type="button"
              disabled={removing}
              onClick={() => void handleDelete()}
              className="rounded-lg border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {removing ? 'Removendo…' : 'Excluir ponto'}
            </button>
          )}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
