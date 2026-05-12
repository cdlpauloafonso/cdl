'use client';

import { useCallback, useEffect, useState } from 'react';
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

function PartnerEditor({
  partner,
  onReload,
}: {
  partner: BeneficioParceiro;
  onReload: () => Promise<void>;
}) {
  const [name, setName] = useState(partner.name);
  const [description, setDescription] = useState(partner.description);
  const [details, setDetails] = useState(partner.details);
  const [photo, setPhoto] = useState<string | null>(partner.photo);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [activeUpdating, setActiveUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(partner.name);
    setDescription(partner.description);
    setDetails(partner.details);
    setPhoto(partner.photo);
  }, [partner.id, partner.name, partner.description, partner.details, partner.photo]);

  const dirty =
    name !== partner.name ||
    description !== partner.description ||
    details !== partner.details ||
    photo !== partner.photo;

  async function save() {
    setSaving(true);
    setError('');
    try {
      await updateBeneficioParceiro(partner.id, {
        name,
        description,
        details,
        photo,
      });
      await onReload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Remover o parceiro "${partner.name}"?`)) return;
    setRemoving(true);
    setError('');
    try {
      await deleteBeneficioParceiro(partner.id);
      await onReload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
    } finally {
      setRemoving(false);
    }
  }

  async function move(dir: 'up' | 'down') {
    setMoving(true);
    setError('');
    try {
      await moveBeneficioParceiro(partner.id, dir);
      await onReload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao reordenar');
    } finally {
      setMoving(false);
    }
  }

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

  return (
    <div
      className={`rounded-md border bg-white p-1.5 shadow-sm sm:p-2 ${
        partner.active ? 'border-gray-200' : 'border-dashed border-slate-400 bg-slate-50'
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <label className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-gray-800">
          <input
            type="checkbox"
            checked={partner.active}
            disabled={activeUpdating}
            onChange={async (e) => {
              const v = e.target.checked;
              setActiveUpdating(true);
              setError('');
              try {
                await updateBeneficioParceiro(partner.id, { active: v });
                await onReload();
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
              } finally {
                setActiveUpdating(false);
              }
            }}
            className="h-3 w-3 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
          />
          Ativo
        </label>
        <div className="flex flex-wrap items-center gap-0.5">
          {!partner.active && (
            <span className="mr-1 rounded px-1 py-px text-[9px] font-semibold uppercase text-slate-600 ring-1 ring-slate-300">
              Off
            </span>
          )}
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => save()}
            className="rounded bg-cdl-blue px-2 py-px text-[10px] font-semibold leading-5 text-white hover:bg-cdl-blue-dark disabled:opacity-50 sm:py-0.5 sm:text-[11px]"
          >
            {saving ? '…' : 'Salvar'}
          </button>
          <button
            type="button"
            disabled={removing}
            onClick={() => remove()}
            className="rounded border border-red-200 px-2 py-px text-[10px] font-medium leading-5 text-red-700 hover:bg-red-50 sm:py-0.5 sm:text-[11px]"
          >
            Excluir
          </button>
          <span className="mx-0.5 hidden h-4 w-px bg-gray-200 sm:inline" aria-hidden />
          <div className="flex overflow-hidden rounded border border-gray-300">
            <button
              type="button"
              disabled={moving}
              onClick={() => move('up')}
              className="bg-white px-1.5 py-px text-[11px] leading-5 hover:bg-gray-50 disabled:opacity-40"
              title="Subir"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={moving}
              onClick={() => move('down')}
              className="border-l border-gray-300 bg-white px-1.5 py-px text-[11px] leading-5 hover:bg-gray-50 disabled:opacity-40"
              title="Descer"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 sm:items-start">
        <div className="mx-auto w-[72px] shrink-0 sm:mx-0 sm:w-20">
          {photo ? (
            <div className="relative">
              <img src={photo} alt="" className="aspect-square w-full rounded border border-gray-200 object-cover" />
              <div className="absolute bottom-0.5 left-0.5 right-0.5 flex gap-px">
                <label className="flex-1 cursor-pointer truncate rounded bg-white/95 px-px py-px text-center text-[9px] font-medium text-gray-800 shadow">
                  Alt.
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => onPickImage(e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="rounded bg-red-600 px-1 py-px text-[9px] font-bold leading-none text-white hover:bg-red-700"
                  title="Remover foto"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-[9px] leading-tight text-gray-500">
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
          <div>
            <label className="mb-px block text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:normal-case sm:tracking-normal">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-1.5 py-px text-[11px] leading-6 sm:py-0.5 sm:text-xs"
            />
          </div>
          <div>
            <label className="mb-px block text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:normal-case sm:tracking-normal">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-y rounded border border-gray-300 px-1.5 py-0.5 text-[11px] leading-snug sm:text-xs"
            />
          </div>
          <div>
            <label className="mb-px block text-[10px] font-medium text-gray-500">
              Detalhes{' '}
              <span className="hidden font-normal text-gray-400 sm:inline">(→ Saiba mais)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              placeholder="Modal…"
              className="w-full resize-y rounded border border-gray-300 px-1.5 py-0.5 text-[11px] leading-snug sm:text-xs"
            />
          </div>

          {error && <p className="text-[10px] text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
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
        <div className="flex items-center gap-1">
          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-gray-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-3 w-3 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
            />
            Ativo
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit()}
            className="rounded bg-cdl-blue px-2 py-px text-[10px] font-semibold leading-5 text-white hover:bg-cdl-blue-dark disabled:opacity-50 sm:text-[11px]"
          >
            {saving ? '…' : 'Adicionar'}
          </button>
        </div>
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
    </div>
  );
}

export function BeneficiosParceirosAdmin() {
  const [partners, setPartners] = useState<BeneficioParceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedHint, setSeedHint] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-500">Carregando parceiros…</div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Parceiros e Convênios</h2>
        <p className="mt-px text-[11px] leading-snug text-cdl-gray-text sm:text-xs">
          Lista compacta. <strong>Detalhes</strong> geram <strong>Saiba mais</strong> no site.
        </p>
        {seedHint && (
          <p className="mt-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">{seedHint}</p>
        )}
      </div>

      <div className="space-y-1.5">
        {partners.map((p) => (
          <PartnerEditor key={p.id} partner={p} onReload={reload} />
        ))}
      </div>

      <NewPartnerForm onCreated={reload} />
    </div>
  );
}
