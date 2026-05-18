'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deleteBeneficioParceiro,
  getBeneficioParceiro,
  moveBeneficioParceiro,
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

export default function AdminBeneficioParceiroEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [partner, setPartner] = useState<BeneficioParceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await getBeneficioParceiro(id);
        if (cancelled) return;
        setPartner(p);
        if (p) {
          setName(p.name);
          setDescription(p.description);
          setDetails(p.details);
          setPhoto(p.photo);
          setActive(p.active);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const dirty =
    partner &&
    (name !== partner.name ||
      description !== partner.description ||
      details !== partner.details ||
      photo !== partner.photo ||
      active !== partner.active);

  async function save() {
    if (!partner) return;
    setSaving(true);
    setError('');
    try {
      await updateBeneficioParceiro(partner.id, {
        name,
        description,
        details,
        photo,
        active,
      });
      router.push('/admin/beneficios-associados');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!partner) return;
    if (!confirm(`Remover o parceiro "${partner.name}"?`)) return;
    setRemoving(true);
    setError('');
    try {
      await deleteBeneficioParceiro(partner.id);
      router.push('/admin/beneficios-associados');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
    } finally {
      setRemoving(false);
    }
  }

  async function move(dir: 'up' | 'down') {
    if (!partner) return;
    setMoving(true);
    setError('');
    try {
      await moveBeneficioParceiro(partner.id, dir);
      const refreshed = await getBeneficioParceiro(partner.id);
      if (refreshed) setPartner(refreshed);
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

  if (loading) {
    return <p className="text-cdl-gray-text">Carregando parceiro…</p>;
  }

  if (!partner) {
    return (
      <div>
        <Link href="/admin/beneficios-associados" className="mb-4 inline-block text-sm text-cdl-blue hover:underline">
          ← Voltar a Benefícios para Associados
        </Link>
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-cdl-gray-text">Parceiro não encontrado.</p>
        </div>
      </div>
    );
  }

  const label = 'mb-1 block text-sm font-medium text-gray-700';

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Link href="/admin/beneficios-associados" className="mb-4 inline-block text-sm text-cdl-blue hover:underline">
        ← Voltar a Benefícios para Associados
      </Link>

      <div className="mt-2">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Editar parceiro</h1>
        <p className="mb-6 text-cdl-gray-text">Altere os dados do convênio e salve para atualizar o site.</p>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Informações do parceiro</h2>

            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">Ativo no site</span>
                  <span className="mt-1 block text-xs text-cdl-gray-text">
                    Desmarque para ocultar este parceiro da lista pública (mantém o cadastro).
                  </span>
                </span>
              </label>
            </div>

            <div className="grid gap-6 lg:grid-cols-[140px_1fr] lg:items-start">
              <div>
                <span className={label}>Logo / foto</span>
                {photo ? (
                  <div className="relative mt-2">
                    <img src={photo} alt="" className="aspect-square w-full max-w-[140px] rounded-lg border border-gray-200 object-cover" />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        Alterar
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
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="mt-2 flex aspect-square w-full max-w-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500">
                    Enviar imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => onPickImage(e.target.files?.[0])}
                    />
                  </label>
                )}
                {uploading && <p className="mt-1 text-xs text-cdl-gray-text">Enviando…</p>}
              </div>

              <div className="min-w-0 space-y-4">
                <div>
                  <label htmlFor="bp-name" className={label}>
                    Nome
                  </label>
                  <input
                    id="bp-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cdl-blue"
                  />
                </div>
                <div>
                  <label htmlFor="bp-desc" className={label}>
                    Descrição (texto do card)
                  </label>
                  <textarea
                    id="bp-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cdl-blue"
                  />
                </div>
                <div>
                  <label htmlFor="bp-details" className={label}>
                    Detalhes (modal “Saiba mais”)
                  </label>
                  <textarea
                    id="bp-details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={5}
                    placeholder="Condições, observações, telefone…"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cdl-blue"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Ordem na lista</h2>
            <p className="mb-4 text-sm text-cdl-gray-text">
              Posição atual: <strong className="text-gray-800">{partner.order + 1}</strong> de entre os parceiros (ordenados no admin).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={moving}
                onClick={() => move('up')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Subir
              </button>
              <button
                type="button"
                disabled={moving}
                onClick={() => move('down')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Descer
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void save()}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <Link
              href="/servicos/beneficios-associados"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Ver no site
            </Link>
            <button
              type="button"
              disabled={removing}
              onClick={() => void remove()}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {removing ? 'Removendo…' : 'Excluir parceiro'}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
