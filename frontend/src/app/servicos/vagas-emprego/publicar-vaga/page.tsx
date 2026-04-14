'use client';

import { FormEvent, useState } from 'react';
import { createVagaPublic, type TipoContrato, type TipoVaga } from '@/lib/firestore-vagas';

type VagaForm = {
  tituloVaga: string;
  empresa: string;
  cidade: string;
  tipoVaga: TipoVaga | '';
  tipoContrato: TipoContrato | '';
  quantidadeVagas: string;
  salario: string;
  salarioACombinar: boolean;
  descricaoVaga: string;
  requisitos: string;
  diferenciais: string;
  cargaHoraria: string;
  prazoCandidatura: string;
  recrutadorNome: string;
  recrutadorEmail: string;
  recrutadorTelefone: string;
};

const initialForm: VagaForm = {
  tituloVaga: '',
  empresa: '',
  cidade: '',
  tipoVaga: '',
  tipoContrato: '',
  quantidadeVagas: '1',
  salario: '',
  salarioACombinar: false,
  descricaoVaga: '',
  requisitos: '',
  diferenciais: '',
  cargaHoraria: '',
  prazoCandidatura: '',
  recrutadorNome: '',
  recrutadorEmail: '',
  recrutadorTelefone: '',
};

export default function PublicarVagaPage() {
  const [form, setForm] = useState<VagaForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createVagaPublic({
        ...form,
        tipoVaga: form.tipoVaga as TipoVaga,
        tipoContrato: form.tipoContrato as TipoContrato,
        quantidadeVagas: Number(form.quantidadeVagas),
      });
      setSent(true);
      setForm(initialForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar vaga.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="py-12 sm:py-16">
        <div className="container-cdl max-w-xl text-center">
          <div className="rounded-full bg-green-100 w-16 h-16 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Vaga enviada com sucesso</h1>
          <p className="mt-2 text-cdl-gray-text">Recebemos os dados da vaga e faremos a análise para publicação.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900">Cadastrar vaga</h1>
        <p className="mt-4 text-cdl-gray-text">
          Preencha os dados da oportunidade para enviar ao painel de vagas da CDL Paulo Afonso.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-gray-200 bg-white p-6 sm:p-8 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="tituloVaga" className="block text-sm font-medium text-gray-700">Título da vaga *</label>
              <input
                id="tituloVaga"
                type="text"
                required
                value={form.tituloVaga}
                onChange={(e) => setForm((f) => ({ ...f, tituloVaga: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="empresa" className="block text-sm font-medium text-gray-700">Empresa *</label>
              <input
                id="empresa"
                type="text"
                required
                value={form.empresa}
                onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">Cidade *</label>
              <input
                id="cidade"
                type="text"
                required
                value={form.cidade}
                onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="tipoVaga" className="block text-sm font-medium text-gray-700">Tipo de vaga *</label>
              <select
                id="tipoVaga"
                required
                value={form.tipoVaga}
                onChange={(e) => setForm((f) => ({ ...f, tipoVaga: e.target.value as VagaForm['tipoVaga'] }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              >
                <option value="">Selecione</option>
                <option value="presencial">Presencial</option>
                <option value="hibrida">Híbrida</option>
                <option value="remota">Remota</option>
              </select>
            </div>

            <div>
              <label htmlFor="tipoContrato" className="block text-sm font-medium text-gray-700">Tipo de contrato *</label>
              <select
                id="tipoContrato"
                required
                value={form.tipoContrato}
                onChange={(e) => setForm((f) => ({ ...f, tipoContrato: e.target.value as VagaForm['tipoContrato'] }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              >
                <option value="">Selecione</option>
                <option value="clt">CLT</option>
                <option value="estagio">Estágio</option>
                <option value="temporario">Temporário</option>
                <option value="pj">PJ</option>
                <option value="jovem-aprendiz">Jovem aprendiz</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label htmlFor="quantidadeVagas" className="block text-sm font-medium text-gray-700">Quantidade de vagas *</label>
              <input
                id="quantidadeVagas"
                type="number"
                min={1}
                required
                value={form.quantidadeVagas}
                onChange={(e) => setForm((f) => ({ ...f, quantidadeVagas: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="salario" className="block text-sm font-medium text-gray-700">Salário (opcional)</label>
              <input
                id="salario"
                type="text"
                disabled={form.salarioACombinar}
                value={form.salario}
                onChange={(e) => setForm((f) => ({ ...f, salario: e.target.value }))}
                placeholder="Ex: R$ 2.500,00"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue disabled:bg-gray-100"
              />
              <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.salarioACombinar}
                  onChange={(e) => setForm((f) => ({ ...f, salarioACombinar: e.target.checked, salario: e.target.checked ? '' : f.salario }))}
                />
                Salário a combinar
              </label>
            </div>

            <div>
              <label htmlFor="cargaHoraria" className="block text-sm font-medium text-gray-700">Carga horária *</label>
              <input
                id="cargaHoraria"
                type="text"
                required
                value={form.cargaHoraria}
                onChange={(e) => setForm((f) => ({ ...f, cargaHoraria: e.target.value }))}
                placeholder="Ex: 44h semanais"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="prazoCandidatura" className="block text-sm font-medium text-gray-700">Prazo para candidatura *</label>
              <input
                id="prazoCandidatura"
                type="date"
                required
                value={form.prazoCandidatura}
                onChange={(e) => setForm((f) => ({ ...f, prazoCandidatura: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>
          </div>

          <div>
            <label htmlFor="descricaoVaga" className="block text-sm font-medium text-gray-700">Descrição da vaga *</label>
            <textarea
              id="descricaoVaga"
              rows={5}
              required
              value={form.descricaoVaga}
              onChange={(e) => setForm((f) => ({ ...f, descricaoVaga: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
            />
          </div>

          <div>
            <label htmlFor="requisitos" className="block text-sm font-medium text-gray-700">Requisitos *</label>
            <textarea
              id="requisitos"
              rows={4}
              required
              value={form.requisitos}
              onChange={(e) => setForm((f) => ({ ...f, requisitos: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
            />
          </div>

          <div>
            <label htmlFor="diferenciais" className="block text-sm font-medium text-gray-700">Diferenciais</label>
            <textarea
              id="diferenciais"
              rows={4}
              value={form.diferenciais}
              onChange={(e) => setForm((f) => ({ ...f, diferenciais: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Contato do recrutador</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="recrutadorNome" className="block text-sm font-medium text-gray-700">Nome *</label>
                <input
                  id="recrutadorNome"
                  type="text"
                  required
                  value={form.recrutadorNome}
                  onChange={(e) => setForm((f) => ({ ...f, recrutadorNome: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                />
              </div>
              <div>
                <label htmlFor="recrutadorEmail" className="block text-sm font-medium text-gray-700">E-mail *</label>
                <input
                  id="recrutadorEmail"
                  type="email"
                  required
                  value={form.recrutadorEmail}
                  onChange={(e) => setForm((f) => ({ ...f, recrutadorEmail: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="recrutadorTelefone" className="block text-sm font-medium text-gray-700">Telefone / WhatsApp *</label>
                <input
                  id="recrutadorTelefone"
                  type="tel"
                  required
                  value={form.recrutadorTelefone}
                  onChange={(e) => setForm((f) => ({ ...f, recrutadorTelefone: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading ? 'Enviando vaga...' : 'Enviar vaga'}
          </button>
        </form>
      </div>
    </div>
  );
}
