'use client';

import { useEffect, useState } from 'react';
import { deleteCurriculo, listCurriculosAdmin, updateCurriculo, updateCurriculoStatus, type Curriculo, type CurriculoStatus } from '@/lib/firestore-curriculos';

function statusClasses(status: CurriculoStatus) {
  if (status === 'aprovado') return 'bg-green-100 text-green-800';
  if (status === 'reprovado') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-800';
}

export default function AdminCurriculosPage() {
  const [curriculos, setCurriculos] = useState<Curriculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingCurriculo, setEditingCurriculo] = useState<Curriculo | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    listCurriculosAdmin()
      .then(setCurriculos)
      .catch(() => setCurriculos([]))
      .finally(() => setLoading(false));
  }, []);

  const atualizarStatus = async (id: string, status: CurriculoStatus) => {
    setUpdatingId(id);
    try {
      await updateCurriculoStatus(id, status);
      setCurriculos((prev) => prev.map((curriculo) => (curriculo.id === id ? { ...curriculo, status } : curriculo)));
    } finally {
      setUpdatingId(null);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm('Deseja excluir este currículo?')) return;
    setUpdatingId(id);
    try {
      await deleteCurriculo(id);
      setCurriculos((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setUpdatingId(null);
    }
  };

  const editarCurriculo = (curriculo: Curriculo) => {
    setEditingCurriculo(curriculo);
  };

  const salvarEdicao = async () => {
    if (!editingCurriculo) return;
    setSavingEdit(true);
    try {
      await updateCurriculo(editingCurriculo.id, {
        nomeCompleto: editingCurriculo.nomeCompleto,
        telefoneWhatsapp: editingCurriculo.telefoneWhatsapp,
        email: editingCurriculo.email,
        cidade: editingCurriculo.cidade,
        bairro: editingCurriculo.bairro,
        areaInteresse: editingCurriculo.areaInteresse,
        cargoDesejado: editingCurriculo.cargoDesejado,
        resumoProfissional: editingCurriculo.resumoProfissional,
        escolaridade: editingCurriculo.escolaridade,
        experienciaProfissional: editingCurriculo.experienciaProfissional,
        habilidades: editingCurriculo.habilidades,
        linkedIn: editingCurriculo.linkedIn,
      });
      setCurriculos((prev) => prev.map((item) => (item.id === editingCurriculo.id ? editingCurriculo : item)));
      setEditingCurriculo(null);
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Currículos</h1>
      <p className="mt-1 text-cdl-gray-text">Gerencie os currículos enviados por candidatos.</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-cdl-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nome do candidato</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cidade</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Área de interesse</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {curriculos.map((curriculo) => (
              <tr key={curriculo.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{curriculo.nomeCompleto}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{curriculo.cidade}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{curriculo.areaInteresse}</td>
                <td className="px-4 py-3 text-sm text-cdl-gray-text">
                  {new Date(curriculo.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(curriculo.status)}`}>
                    {curriculo.status === 'aprovado' ? 'Aprovado' : curriculo.status === 'reprovado' ? 'Reprovado' : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => atualizarStatus(curriculo.id, 'aprovado')}
                      disabled={updatingId === curriculo.id}
                      className="text-green-700 hover:underline disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => atualizarStatus(curriculo.id, 'reprovado')}
                      disabled={updatingId === curriculo.id}
                      className="text-amber-700 hover:underline disabled:opacity-50"
                    >
                      Reprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => editarCurriculo(curriculo)}
                      className="text-cdl-blue hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void excluir(curriculo.id)}
                      disabled={updatingId === curriculo.id}
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
        {curriculos.length === 0 && (
          <p className="p-8 text-center text-cdl-gray-text">Nenhum currículo cadastrado.</p>
        )}
      </div>

      {editingCurriculo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900">Editar currículo</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Nome completo</label>
                <input
                  type="text"
                  value={editingCurriculo.nomeCompleto}
                  onChange={(e) => setEditingCurriculo((prev) => (prev ? { ...prev, nomeCompleto: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefone/WhatsApp</label>
                <input
                  type="text"
                  value={editingCurriculo.telefoneWhatsapp}
                  onChange={(e) => setEditingCurriculo((prev) => (prev ? { ...prev, telefoneWhatsapp: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                <input
                  type="email"
                  value={editingCurriculo.email}
                  onChange={(e) => setEditingCurriculo((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cidade</label>
                <input
                  type="text"
                  value={editingCurriculo.cidade}
                  onChange={(e) => setEditingCurriculo((prev) => (prev ? { ...prev, cidade: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Área de interesse</label>
                <input
                  type="text"
                  value={editingCurriculo.areaInteresse}
                  onChange={(e) => setEditingCurriculo((prev) => (prev ? { ...prev, areaInteresse: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cargo desejado</label>
                <input
                  type="text"
                  value={editingCurriculo.cargoDesejado}
                  onChange={(e) => setEditingCurriculo((prev) => (prev ? { ...prev, cargoDesejado: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Escolaridade</label>
                <input
                  type="text"
                  value={editingCurriculo.escolaridade}
                  onChange={(e) => setEditingCurriculo((prev) => (prev ? { ...prev, escolaridade: e.target.value } : prev))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCurriculo(null)}
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
