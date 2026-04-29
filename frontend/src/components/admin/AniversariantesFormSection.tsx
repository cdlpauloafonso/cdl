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
  const [draftNome, setDraftNome] = useState('');
  const [draftData, setDraftData] = useState('');

  const confirmar = () => {
    const nome = draftNome.trim();
    const data = draftData.trim();
    if (!nome || !data) {
      alert('Informe o nome e a data de nascimento e depois toque em OK.');
      return;
    }
    onChange([...value, { nome, data }]);
    setDraftNome('');
    setDraftData('');
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
