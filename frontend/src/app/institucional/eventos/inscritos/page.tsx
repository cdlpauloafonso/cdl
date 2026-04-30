'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCampaign, listEventInscriptions, type Campaign, type EventInscriptionRecord } from '@/lib/firestore';
import {
  getEffectiveRegistration,
  labelForInscriptionField,
  sortInscriptionFieldKeys,
} from '@/lib/event-registration-fields';

function collectColumnKeys(
  reg: ReturnType<typeof getEffectiveRegistration>,
  rows: (EventInscriptionRecord & { id: string })[]
): string[] {
  if (reg.kind !== 'form') return [];
  const base = sortInscriptionFieldKeys(reg.keys);
  const seen = new Set(base);
  const extra: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row.fields || {})) {
      if (!seen.has(key) && key !== 'observacoes') {
        seen.add(key);
        extra.push(key);
      }
    }
  }
  extra.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...base.filter((x) => x !== 'observacoes'), ...extra];
}

function formatDateBr(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PublicEventInscriptionsPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') ?? '';

  const [campanha, setCampanha] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<(EventInscriptionRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!eventId) {
        setError('Nenhum evento informado.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const c = await getCampaign(eventId);
        setCampanha(c);
        if (!c) {
          setRows([]);
          setError('Evento não encontrado.');
          return;
        }
        const reg = getEffectiveRegistration(c, { ignoreRegistrationClosed: true });
        if (reg.kind !== 'form') {
          setRows([]);
          setError('Este evento não utiliza formulário de inscrição no site.');
          return;
        }
        const inscriptions = await listEventInscriptions(eventId);
        setRows(inscriptions);
      } catch {
        setRows([]);
        setError('Não foi possível carregar os inscritos.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [eventId]);

  const reg = campanha
    ? getEffectiveRegistration(campanha, { ignoreRegistrationClosed: true })
    : { kind: 'none' as const };

  const visibleColumns = useMemo(() => {
    if (!campanha) return [];
    return collectColumnKeys(reg, rows);
  }, [campanha, reg, rows]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="text-cdl-gray-text">Carregando inscritos...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/institucional/eventos" className="text-sm text-cdl-blue hover:underline">
          ← Voltar para eventos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Inscritos no evento</h1>
        <p className="mt-1 text-gray-700">{campanha?.title ?? '—'}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-cdl-gray-text">
          Nenhuma inscrição registrada até o momento.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-cdl-gray">
              <tr>
                {visibleColumns.map((key) => (
                  <th key={key} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    {labelForInscriptionField(key)}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  {visibleColumns.map((key) => (
                    <td key={key} className="px-3 py-2 text-gray-800">
                      {(row.fields?.[key] ?? '').toString().trim() || '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-gray-700">{formatDateBr(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
