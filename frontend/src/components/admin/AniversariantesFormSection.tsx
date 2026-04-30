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
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoUploadError, setFotoUploadError] = useState('');

  const uploadDraftFoto = async (file: File) => {
    if (!IMGBB_KEY) {
      setFotoUploadError('Chave ImgBB não configurada (NEXT_PUBLIC_IMGBB_KEY).');
      return;
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
      setDraftFoto(url);
    } catch (error) {
      console.error('Erro ao enviar foto do aniversariante:', error);
      setFotoUploadError('Não foi possível enviar a foto para o ImgBB.');
    } finally {
      setUploadingFoto(false);
    }
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
        <ul className="mb-4 space-y-2" aria-label="Aniversariantes já incluídos">
          {value.map((a, index) => (
            <li
              key={`${idPrefix}-${index}-${a.data}-${a.nome.slice(0, 12)}`}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{a.nome}</p>
                <p className="text-sm text-gray-600">{formatDataNascimentoPt(a.data)}</p>
                {a.foto && (
                  <img
                    src={a.foto}
                    alt={`Foto de ${a.nome}`}
                    className="mt-2 h-12 w-12 rounded-full border border-gray-200 object-cover"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="shrink-0 self-start rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 sm:self-center"
              >
                Remover
              </button>
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
