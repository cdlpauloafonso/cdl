'use client';

import { useEffect, useState } from 'react';
import { deleteVaga, listVagasAdmin, updateVaga, updateVagaStatus, type Vaga, type VagaStatus } from '@/lib/firestore-vagas';

function statusClasses(status: VagaStatus) {
  if (status === 'aprovada') return 'bg-green-100 text-green-800';
  if (status === 'reprovada') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-800';
}

export default function AdminVagasPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingVaga, setEditingVaga] = useState<Vaga | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    listVagasAdmin()
      .then(setVagas)
      .catch(() => setVagas([]))
      .finally(() => setLoading(false));
  }, []);

  const atualizarStatus = async (id: string, status: VagaStatus) => {
    setUpdatingId(id);
    try {
      await updateVagaStatus(id, status);
      setVagas((prev) => prev.map((vaga) => (vaga.id === id ? { ...vaga, status } : vaga)));
    } finally {
      setUpdatingId(null);
    }
  };

  const excluirVaga = async (id: string) => {
    if (!confirm('Deseja excluir esta vaga?')) return;
    setUpdatingId(id);
    try {
      await deleteVaga(id);
      setVagas((prev) => prev.filter((vaga) => vaga.id !== id));
    } finally {
      setUpdatingId(null);
    }
  };

  const editarVaga = (vaga: Vaga) => {
    setEditingVaga(vaga);
  };

  const salvarEdicao = async () => {
    if (!editingVaga) return;
    setSavingEdit(true);
    try {
      await updateVaga(editingVaga.id, {
        tituloVaga: editingVaga.tituloVaga,
        empresa: editingVaga.empresa,
        cidade: editingVaga.cidade,
        tipoVaga: editingVaga.tipoVaga,
        tipoContrato: editingVaga.tipoContrato,
        quantidadeVagas: editingVaga.quantidadeVagas,
        salario: editingVaga.salario,
        salarioACombinar: editingVaga.salarioACombinar,
        descricaoVaga: editingVaga.descricaoVaga,
        requisitos: editingVaga.requisitos,
        diferenciais: editingVaga.diferenciais,
        cargaHoraria: editingVaga.cargaHoraria,
        prazoCandidatura: editingVaga.prazoCandidatura,
        recrutadorNome: editingVaga.recrutadorNome,
        recrutadorEmail: editingVaga.recrutadorEmail,
        recrutadorTelefone: editingVaga.recrutadorTelefone,
      });
      setVagas((prev) => prev.map((item) => (item.id === editingVaga.id ? editingVaga : item)));
      setEditingVaga(null);
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Vagas</h1>
      <p className="mt-1 text-cdl-gray-text">Gerencie as vagas de emprego enviadas para aprovação.</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-cdl-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Título</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vagas.map((vaga) => (
              <tr key={vaga.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{vaga.tituloVaga}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{vaga.empresa}</td>
                <td className="px-4 py-3 text-sm text-cdl-gray-text">
                  {new Date(vaga.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(vaga.status)}`}>
                    {vaga.status === 'aprovada' ? 'Aprovada' : vaga.status === 'reprovada' ? 'Reprovada' : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => atualizarStatus(vaga.id, 'aprovada')}
                      disabled={updatingId === vaga.id}
                      className="text-green-700 hover:underline disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => atualizarStatus(vaga.id, 'reprovada')}
                      disabled={updatingId === vaga.id}
                      className="text-amber-700 hover:underline disabled:opacity-50"
                    >
                      Reprovar
                    </button>
                    <button type="button" onClick={() => editarVaga(vaga)} className="text-cdl-blue hover:underline">
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void excluirVaga(vaga.id)}
                      disabled={updatingId === vaga.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vagas.length === 0 && (
          <p className="p-8 text-center text-cdl-gray-text">Nenhuma vaga cadastrada.</p>
        )}
      </div>

      {editingVaga && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900">Editar vaga</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Titulo</label>
                <input
                  type="text"
                  value={editingVaga.tituloVaga}
                  onChange={(e) => setEditingVaga((prev) => (prev ? { ...prev, tituloVaga: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Empresa</label>
                <input
                  type="text"
                  value={editingVaga.empresa}
                  onChange={(e) => setEditingVaga((prev) => (prev ? { ...prev, empresa: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cidade</label>
                <input
                  type="text"
                  value={editingVaga.cidade}
                  onChange={(e) => setEditingVaga((prev) => (prev ? { ...prev, cidade: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantidade de vagas</label>
                <input
                  type="number"
                  min={1}
                  value={editingVaga.quantidadeVagas}
                  onChange={(e) => setEditingVaga((prev) => (prev ? { ...prev, quantidadeVagas: Number(e.target.value) || 1 } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prazo da candidatura</label>
                <input
                  type="date"
                  value={editingVaga.prazoCandidatura}
                  onChange={(e) => setEditingVaga((prev) => (prev ? { ...prev, prazoCandidatura: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Descricao da vaga</label>
                <textarea
                  rows={4}
                  value={editingVaga.descricaoVaga}
                  onChange={(e) => setEditingVaga((prev) => (prev ? { ...prev, descricaoVaga: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingVaga(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvarEdicao()}
                disabled={savingEdit}
                className="rounded-lg bg-cdl-blue px-4 py-2 text-sm text-white hover:bg-cdl-blue-dark disabled:opacity-50"
              >
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
