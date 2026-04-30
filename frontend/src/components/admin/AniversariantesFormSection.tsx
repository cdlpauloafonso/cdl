'use client';

import { useState } from 'react';
import type { Aniversariante } from '@/lib/firestore';

function formatDataNascimentoPt(iso: string): string {
  const s = iso?.trim() ?? '';
  if (!s) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) {
      return new Date(y, mo - 1, d).toLocaleDateString('pt-BR');
    }
  }
  return s;
}

type AniversariantesFormSectionProps = {
  value: Aniversariante[];
  onChange: (next: Aniversariante[]) => void;
  idPrefix?: string;
};

export function AniversariantesFormSection({
  value,
  onChange,
  idPrefix = 'aniversariante',
}: AniversariantesFormSectionProps) {
  const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY ?? '';
  const [draftNome, setDraftNome] = useState('');
  const [draftData, setDraftData] = useState('');
  const [draftFoto, setDraftFoto] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [editingData, setEditingData] = useState('');
  const [editingFoto, setEditingFoto] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoUploadError, setFotoUploadError] = useState('');

  const uploadFotoToImgbb = async (file: File): Promise<string | null> => {
    if (!IMGBB_KEY) {
      setFotoUploadError('Chave ImgBB não configurada (NEXT_PUBLIC_IMGBB_KEY).');
      return null;
    }

    setUploadingFoto(true);
    setFotoUploadError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: 'POST',
        body: form,
      });
      const json = (await res.json()) as { data?: { url?: string } };
      const url = json?.data?.url ?? '';
      if (!res.ok || !url) {
        throw new Error('Falha no upload da foto.');
      }
      return url;
    } catch (error) {
      console.error('Erro ao enviar foto do aniversariante:', error);
      setFotoUploadError('Não foi possível enviar a foto para o ImgBB.');
      return null;
    } finally {
      setUploadingFoto(false);
    }
  };

  const uploadDraftFoto = async (file: File) => {
    const url = await uploadFotoToImgbb(file);
    if (url) setDraftFoto(url);
  };

  const uploadEditingFoto = async (file: File) => {
    const url = await uploadFotoToImgbb(file);
    if (url) setEditingFoto(url);
  };

  const confirmar = () => {
    const nome = draftNome.trim();
    const data = draftData.trim();
    if (!nome || !data) {
      alert('Informe o nome e a data de nascimento e depois toque em OK.');
      return;
    }
    onChange([...value, { nome, data, foto: draftFoto || undefined }]);
    setDraftNome('');
    setDraftData('');
    setDraftFoto('');
    setFotoUploadError('');
  };

  const iniciarEdicao = (index: number) => {
    const atual = value[index];
    if (!atual) return;
    setEditingIndex(index);
    setEditingNome(atual.nome || '');
    setEditingData(atual.data || '');
    setEditingFoto(atual.foto || '');
    setFotoUploadError('');
  };

  const cancelarEdicao = () => {
    setEditingIndex(null);
    setEditingNome('');
    setEditingData('');
    setEditingFoto('');
    setFotoUploadError('');
  };

  const salvarEdicao = () => {
    if (editingIndex === null) return;
    const nome = editingNome.trim();
    const data = editingData.trim();
    if (!nome || !data) {
      alert('Informe nome e data para salvar a edição.');
      return;
    }
    const next = [...value];
    next[editingIndex] = {
      ...next[editingIndex],
      nome,
      data,
      foto: editingFoto || undefined,
    };
    onChange(next);
    cancelarEdicao();
  };

  const onDraftKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmar();
    }
  };

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-1 block text-sm font-medium text-gray-700">Aniversariantes</legend>
      <p className="mb-3 text-xs leading-relaxed text-cdl-gray-text">
        Opcional. Digite o <strong className="font-medium text-gray-700">nome</strong> e a{' '}
        <strong className="font-medium text-gray-700">data de nascimento</strong>, confira e pressione{' '}
        <strong className="font-medium text-gray-700">OK</strong>. A pessoa só entra na lista depois disso — então
        aparece o botão <strong className="font-medium text-gray-700">Remover</strong> para cada item já confirmado.
      </p>

      {value.length > 0 && (
        <ul className="mb-4 space-y-1.5" aria-label="Aniversariantes já incluídos">
          {value.map((a, index) => (
            <li
              key={`${idPrefix}-${index}-${a.data}-${a.nome.slice(0, 12)}`}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
            >
              {editingIndex === index ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white">
                      {editingFoto ? (
                        <img src={editingFoto} alt="Foto em edição" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                          {editingNome.trim().charAt(0).toUpperCase() || 'A'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-0.5 block text-xs font-medium text-gray-600">Nome</label>
                        <input
                          type="text"
                          value={editingNome}
                          onChange={(e) => setEditingNome(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs font-medium text-gray-600">Data de nascimento</label>
                        <input
                          type="date"
                          value={editingData}
                          onChange={(e) => setEditingData(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-gray-600">Foto do aniversariante</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadEditingFoto(file);
                      }}
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-cdl-blue file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
                    />
                    {uploadingFoto && <p className="mt-1 text-xs text-cdl-gray-text">Enviando foto...</p>}
                    {fotoUploadError && <p className="mt-1 text-xs text-red-700">{fotoUploadError}</p>}
                    {editingFoto && (
                      <button
                        type="button"
                        onClick={() => setEditingFoto('')}
                        className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Remover foto
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelarEdicao}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={salvarEdicao}
                      className="rounded-md bg-cdl-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-cdl-blue-dark"
                    >
                      Salvar edição
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex flex-1 items-center gap-2.5">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white">
                      {a.foto ? (
                        <img
                          src={a.foto}
                          alt={`Foto de ${a.nome}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                          {(a.nome || 'A').trim().charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{a.nome}</p>
                      <p className="text-xs text-gray-600">{formatDataNascimentoPt(a.data)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(index)}
                      className="rounded-md border border-cdl-blue/30 bg-white px-2.5 py-1 text-xs font-medium text-cdl-blue transition-colors hover:bg-cdl-blue/5"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((_, i) => i !== index))}
                      className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3 sm:p-4">
        <p className="mb-3 text-sm font-medium text-gray-900">Incluir aniversariante</p>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${idPrefix}-draft-nome`} className="mb-1 block text-xs font-medium text-gray-600">
                Nome
              </label>
              <input
                id={`${idPrefix}-draft-nome`}
                type="text"
                value={draftNome}
                onChange={(e) => setDraftNome(e.target.value)}
                onKeyDown={onDraftKeyDown}
                placeholder="Nome completo"
                autoComplete="name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-draft-data`} className="mb-1 block text-xs font-medium text-gray-600">
                Data de nascimento
              </label>
              <input
                id={`${idPrefix}-draft-data`}
                type="date"
                value={draftData}
                onChange={(e) => setDraftData(e.target.value)}
                onKeyDown={onDraftKeyDown}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-draft-foto`} className="mb-1 block text-xs font-medium text-gray-600">
              Foto do aniversariante (opcional)
            </label>
            <input
              id={`${idPrefix}-draft-foto`}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadDraftFoto(file);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-cdl-blue file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
            />
            {uploadingFoto && <p className="mt-1 text-xs text-cdl-gray-text">Enviando foto...</p>}
            {fotoUploadError && <p className="mt-1 text-xs text-red-700">{fotoUploadError}</p>}
            {draftFoto && (
              <div className="mt-2 flex items-center gap-2">
                <img src={draftFoto} alt="Pré-visualização da foto" className="h-12 w-12 rounded-full border border-gray-200 object-cover" />
                <button
                  type="button"
                  onClick={() => setDraftFoto('')}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Remover foto
                </button>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={confirmar}
              className="rounded-lg bg-cdl-blue px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-cdl-blue-dark"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
