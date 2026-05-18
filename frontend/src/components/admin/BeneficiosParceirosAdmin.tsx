'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addBeneficioParceiro,
  deleteBeneficioParceiro,
  listBeneficiosParceiros,
  moveBeneficioParceiro,
  seedBeneficiosParceirosIfEmpty,
  updateBeneficioParceiro,
  type BeneficioParceiro,
} from '@/lib/firestore';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

async function uploadImageToImgbb(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('key', IMGBB_KEY || '');
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Falha no upload da imagem');
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Erro no upload');
  return json.data.url as string;
}

function NewPartnerForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function onPickImage(file?: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImageToImgbb(file);
      setPhoto(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!name.trim()) {
      setError('Informe o nome do parceiro.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addBeneficioParceiro({
        name,
        description,
        details,
        photo,
        active,
      });
      setName('');
      setDescription('');
      setDetails('');
      setPhoto(null);
      setActive(true);
      await onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-cdl-blue/40 bg-cdl-blue/[0.06] p-1.5 sm:p-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-800 sm:normal-case sm:text-xs sm:tracking-normal">
          Novo parceiro
        </h3>
        <label className="flex cursor-pointer items-center gap-1 text-[10px] text-gray-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-3 w-3 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
          />
          Ativo
        </label>
      </div>

      <div className="flex gap-2 sm:items-start">
        <div className="w-[72px] shrink-0 sm:w-20">
          {photo ? (
            <div className="relative">
              <img src={photo} alt="" className="aspect-square w-full rounded border border-gray-200 object-cover" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute right-0.5 top-0.5 rounded bg-red-600 px-1 py-px text-[9px] leading-none text-white"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-white text-[9px] text-gray-500">
              Img
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => onPickImage(e.target.files?.[0])}
              />
            </label>
          )}
          {uploading && <p className="mt-px text-center text-[9px] text-gray-500">…</p>}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="w-full rounded border border-gray-300 px-1.5 py-px text-[11px] leading-6 sm:text-xs"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (card)"
            rows={2}
            className="w-full resize-y rounded border border-gray-300 px-1.5 py-0.5 text-[11px] leading-snug sm:text-xs"
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Detalhes → modal"
            rows={2}
            className="w-full resize-y rounded border border-gray-300 px-1.5 py-0.5 text-[11px] leading-snug sm:text-xs"
          />
          {error && <p className="text-[10px] text-red-600">{error}</p>}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1 border-t border-gray-100 pt-1.5">
        <button
          type="button"
          disabled={saving}
          onClick={() => submit()}
          className="rounded bg-cdl-blue px-2 py-px text-[10px] font-semibold leading-5 text-white hover:bg-cdl-blue-dark disabled:opacity-50 sm:py-0.5 sm:text-[11px]"
        >
          {saving ? '…' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

export function BeneficiosParceirosAdmin() {
  const [partners, setPartners] = useState<BeneficioParceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedHint, setSeedHint] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const list = await listBeneficiosParceiros();
    setPartners(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const seeded = await seedBeneficiosParceirosIfEmpty();
        if (!cancelled && seeded) {
          setSeedHint('Lista inicial de parceiros foi criada no Firebase (equivalente ao conteúdo antigo do site).');
        }
        const list = await listBeneficiosParceiros();
        if (!cancelled) setPartners(list);
      } catch {
        if (!cancelled) setPartners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = partners.length;
    const ativos = partners.filter((p) => p.active).length;
    const inativos = total - ativos;
    return { total, ativos, inativos };
  }, [partners]);

  async function removePartner(p: BeneficioParceiro) {
    if (!confirm(`Excluir o parceiro "${p.name}"?`)) return;
    try {
      await deleteBeneficioParceiro(p.id);
      await reload();
    } catch {
      alert('Erro ao excluir parceiro.');
    }
  }

  async function toggleActive(p: BeneficioParceiro) {
    try {
      setTogglingId(p.id);
      await updateBeneficioParceiro(p.id, { active: !p.active });
      await reload();
    } catch {
      alert('Erro ao atualizar status.');
    } finally {
      setTogglingId(null);
    }
  }

  async function movePartner(p: BeneficioParceiro, dir: 'up' | 'down') {
    try {
      setMovingId(p.id);
      await moveBeneficioParceiro(p.id, dir);
      await reload();
    } catch {
      alert('Erro ao reordenar.');
    } finally {
      setMovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-500">Carregando parceiros…</div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Parceiros e Convênios</h2>
        <p className="mt-px text-[11px] leading-snug text-cdl-gray-text sm:text-xs">
          Lista de parceiros. Use <strong>Detalhes</strong> no editor para o texto de <strong>Saiba mais</strong> no site.
        </p>
        {seedHint && (
          <p className="mt-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">{seedHint}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cdl-gray-text">Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">Ativos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-green-800">{stats.ativos}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Inativos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-800">{stats.inativos}</p>
        </div>
      </div>

      <NewPartnerForm onCreated={reload} />

      <div className="space-y-2 md:hidden">
        {partners.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-cdl-gray-text">
            Nenhum parceiro cadastrado.
          </p>
        ) : (
          partners.map((p, index) => (
            <article
              key={p.id}
              className={`rounded-xl border bg-white p-3 ${p.active ? 'border-gray-200' : 'border-dashed border-slate-300 bg-slate-50/80'}`}
            >
              <div className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  {p.photo ? (
                    <img src={p.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{p.name}</h3>
                  {p.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-cdl-gray-text">{p.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="text-[11px] text-cdl-gray-text">Ordem {index + 1}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={togglingId === p.id}
                  onClick={() => void toggleActive(p)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    p.active ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {togglingId === p.id ? '…' : p.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  disabled={movingId === p.id || index === 0}
                  onClick={() => void movePartner(p, 'up')}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Subir
                </button>
                <button
                  type="button"
                  disabled={movingId === p.id || index >= partners.length - 1}
                  onClick={() => void movePartner(p, 'down')}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Descer
                </button>
                <Link
                  href={`/admin/beneficios-associados/parceiros/${p.id}`}
                  className="rounded-md bg-cdl-blue/10 px-2.5 py-1.5 text-xs font-medium text-cdl-blue ring-1 ring-cdl-blue/15"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => void removePartner(p)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-cdl-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Parceiro</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Ordem</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {partners.map((p, index) => (
              <tr key={p.id} className={p.active ? '' : 'bg-slate-50/80'}>
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                      {p.photo ? (
                        <img src={p.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">—</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.description ? (
                        <p className="line-clamp-1 max-w-md text-xs text-cdl-gray-text">{p.description}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {p.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-gray-700">{index + 1}</td>
                <td className="px-4 py-3 text-right text-sm">
                  <button
                    type="button"
                    disabled={togglingId === p.id}
                    onClick={() => void toggleActive(p)}
                    className={`mr-2 rounded px-2 py-1 text-xs font-medium transition-colors ${
                      p.active ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {togglingId === p.id ? '…' : p.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    disabled={movingId === p.id || index === 0}
                    onClick={() => void movePartner(p, 'up')}
                    className="mr-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={movingId === p.id || index >= partners.length - 1}
                    onClick={() => void movePartner(p, 'down')}
                    className="mr-3 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    title="Descer"
                  >
                    ↓
                  </button>
                  <Link href={`/admin/beneficios-associados/parceiros/${p.id}`} className="mr-3 text-cdl-blue hover:underline">
                    Editar
                  </Link>
                  <button type="button" onClick={() => void removePartner(p)} className="text-red-600 hover:underline">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {partners.length === 0 && (
          <p className="p-8 text-center text-cdl-gray-text">Nenhum parceiro cadastrado.</p>
        )}
      </div>
    </div>
  );
}
