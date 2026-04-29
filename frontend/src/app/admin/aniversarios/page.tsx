'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAssociados, type Associado } from '@/lib/firestore';

type BirthdayRow = {
  associado: Associado;
  aniversarianteNome: string;
  data: string;
};

function extractMonthDay(dateValue: string): { month: number; day: number } {
  if (!dateValue) return { month: 99, day: 99 };
  const normalized = dateValue.trim();
  const matchIso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    return { month: Number(matchIso[2]), day: Number(matchIso[3]) };
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return { month: 99, day: 99 };
  return { month: parsed.getMonth() + 1, day: parsed.getDate() };
}

function formatBirthday(dateValue: string): string {
  if (!dateValue) return '—';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('pt-BR');
}

function labelStatus(status?: string): string {
  if (status === 'desativado') return 'Desativado';
  if (status === 'em_negociacao') return 'Em negociação';
  return 'Ativo';
}

export default function AniversariosPage() {
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssociado, setSelectedAssociado] = useState<Associado | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await getAssociados();
        setAssociados(list);
      } catch (error) {
        console.error('Erro ao carregar aniversariantes:', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const rows = useMemo(() => {
    const flattened: BirthdayRow[] = [];
    associados.forEach((associado) => {
      (associado.aniversariantes ?? []).forEach((aniversariante) => {
        if (!aniversariante.nome?.trim() && !aniversariante.data?.trim()) return;
        flattened.push({
          associado,
          aniversarianteNome: aniversariante.nome?.trim() || '—',
          data: aniversariante.data?.trim() || '',
        });
      });
    });

    return flattened.sort((a, b) => {
      const aMd = extractMonthDay(a.data);
      const bMd = extractMonthDay(b.data);
      if (aMd.month !== bMd.month) return aMd.month - bMd.month;
      if (aMd.day !== bMd.day) return aMd.day - bMd.day;

      const byName = a.aniversarianteNome.localeCompare(b.aniversarianteNome, 'pt-BR');
      if (byName !== 0) return byName;

      return (a.associado.empresa || '').localeCompare(b.associado.empresa || '', 'pt-BR');
    });
  }, [associados]);

  return (
    <div className="w-full max-w-full overflow-x-hidden p-2.5 sm:p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Aniversários</h1>
          <p className="mt-0.5 text-xs text-gray-600 sm:mt-1 sm:text-sm">Aniversariantes cadastrados nos associados</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando aniversariantes...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum aniversariante cadastrado nos associados.
          </div>
        ) : (
          <>
          <div className="space-y-1.5 p-2 md:hidden">
            {rows.map((row, index) => (
              <article key={`${row.associado.id}-${row.aniversarianteNome}-${row.data}-${index}`} className="rounded-lg border border-gray-200 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 break-words">{row.aniversarianteNome}</p>
                    <p className="text-[11px] text-gray-500">{formatBirthday(row.data)}</p>
                    <p className="mt-0.5 text-[11px] text-gray-700 break-words">{row.associado.empresa || '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAssociado(row.associado)}
                    className="rounded-md border border-cdl-blue/30 bg-cdl-blue/5 px-2 py-1 text-[10px] font-medium text-cdl-blue hover:bg-cdl-blue/10"
                  >
                    Ver
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-cdl-gray">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <tr key={`${row.associado.id}-${row.aniversarianteNome}-${row.data}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatBirthday(row.data)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.aniversarianteNome}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.associado.empresa || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAssociado(row.associado)}
                        className="rounded-lg border border-cdl-blue/30 bg-cdl-blue/5 px-3 py-1.5 text-xs font-medium text-cdl-blue hover:bg-cdl-blue/10"
                      >
                        Ver associado
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {selectedAssociado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-3 sm:p-6">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">Dados do Associado</h3>
                <p className="mt-0.5 text-xs text-cdl-gray-text sm:mt-1 sm:text-sm">
                  {selectedAssociado.nome || '—'} · {selectedAssociado.empresa || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssociado(null)}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 text-sm sm:gap-4 sm:p-6 md:grid-cols-2">
              {[
                ['Nome', selectedAssociado.nome],
                ['Empresa', selectedAssociado.empresa],
                ['Razão social', selectedAssociado.razao_social || '—'],
                ['CNPJ', selectedAssociado.cnpj || '—'],
                ['Telefone Empresa', selectedAssociado.telefone || '—'],
                ['Telefone do responsável', selectedAssociado.telefone_responsavel || '—'],
                ['Email', selectedAssociado.email || '—'],
                ['Status', labelStatus(selectedAssociado.status)],
                ['Plano', selectedAssociado.plano || '—'],
                ['Código SPC', selectedAssociado.codigo_spc || '—'],
                ['CEP', selectedAssociado.cep || '—'],
                ['Endereço', selectedAssociado.endereco || '—'],
                ['Cidade', selectedAssociado.cidade || '—'],
                ['Estado', selectedAssociado.estado || '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 break-words text-gray-900">{value as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
