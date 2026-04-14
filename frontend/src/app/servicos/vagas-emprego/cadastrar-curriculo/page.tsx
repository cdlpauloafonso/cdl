'use client';

import { FormEvent, useState } from 'react';
import { createCurriculoPublic } from '@/lib/firestore-curriculos';

type CurriculoForm = {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  telefoneWhatsapp: string;
  email: string;
  cidade: string;
  bairro: string;
  areaInteresse: string;
  cargoDesejado: string;
  resumoProfissional: string;
  escolaridade: string;
  experienciaProfissional: string;
  habilidades: string;
  linkedIn: string;
};

const initialForm: CurriculoForm = {
  nomeCompleto: '',
  cpf: '',
  dataNascimento: '',
  telefoneWhatsapp: '',
  email: '',
  cidade: '',
  bairro: '',
  areaInteresse: '',
  cargoDesejado: '',
  resumoProfissional: '',
  escolaridade: '',
  experienciaProfissional: '',
  habilidades: '',
  linkedIn: '',
};

export default function CadastrarCurriculoPage() {
  const [form, setForm] = useState<CurriculoForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createCurriculoPublic(form);
      setSent(true);
      setForm(initialForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar currículo.';
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
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Currículo enviado com sucesso</h1>
          <p className="mt-2 text-cdl-gray-text">Recebemos seus dados e entraremos em contato quando houver oportunidade.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900">Cadastrar currículo</h1>
        <p className="mt-4 text-cdl-gray-text">
          Preencha os dados abaixo para participar do banco de currículos da CDL Paulo Afonso.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-gray-200 bg-white p-6 sm:p-8 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="nomeCompleto" className="block text-sm font-medium text-gray-700">Nome completo *</label>
              <input
                id="nomeCompleto"
                type="text"
                required
                value={form.nomeCompleto}
                onChange={(e) => setForm((f) => ({ ...f, nomeCompleto: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">CPF (opcional)</label>
              <input
                id="cpf"
                type="text"
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="dataNascimento" className="block text-sm font-medium text-gray-700">Data de nascimento (opcional)</label>
              <input
                id="dataNascimento"
                type="date"
                value={form.dataNascimento}
                onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="telefoneWhatsapp" className="block text-sm font-medium text-gray-700">Telefone / WhatsApp *</label>
              <input
                id="telefoneWhatsapp"
                type="tel"
                required
                value={form.telefoneWhatsapp}
                onChange={(e) => setForm((f) => ({ ...f, telefoneWhatsapp: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-mail *</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
              <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">Bairro (opcional)</label>
              <input
                id="bairro"
                type="text"
                value={form.bairro}
                onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="areaInteresse" className="block text-sm font-medium text-gray-700">Área de interesse *</label>
              <input
                id="areaInteresse"
                type="text"
                required
                value={form.areaInteresse}
                onChange={(e) => setForm((f) => ({ ...f, areaInteresse: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="cargoDesejado" className="block text-sm font-medium text-gray-700">Cargo desejado *</label>
              <input
                id="cargoDesejado"
                type="text"
                required
                value={form.cargoDesejado}
                onChange={(e) => setForm((f) => ({ ...f, cargoDesejado: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="escolaridade" className="block text-sm font-medium text-gray-700">Escolaridade *</label>
              <input
                id="escolaridade"
                type="text"
                required
                value={form.escolaridade}
                onChange={(e) => setForm((f) => ({ ...f, escolaridade: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="linkedIn" className="block text-sm font-medium text-gray-700">Link do LinkedIn (opcional)</label>
              <input
                id="linkedIn"
                type="url"
                value={form.linkedIn}
                onChange={(e) => setForm((f) => ({ ...f, linkedIn: e.target.value }))}
                placeholder="https://www.linkedin.com/in/..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>
          </div>

          <div>
            <label htmlFor="resumoProfissional" className="block text-sm font-medium text-gray-700">Resumo profissional *</label>
            <textarea
              id="resumoProfissional"
              rows={4}
              required
              value={form.resumoProfissional}
              onChange={(e) => setForm((f) => ({ ...f, resumoProfissional: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
            />
          </div>

          <div>
            <label htmlFor="experienciaProfissional" className="block text-sm font-medium text-gray-700">Experiência profissional *</label>
            <textarea
              id="experienciaProfissional"
              rows={5}
              required
              value={form.experienciaProfissional}
              onChange={(e) => setForm((f) => ({ ...f, experienciaProfissional: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
            />
          </div>

          <div>
            <label htmlFor="habilidades" className="block text-sm font-medium text-gray-700">Habilidades *</label>
            <textarea
              id="habilidades"
              rows={4}
              required
              value={form.habilidades}
              onChange={(e) => setForm((f) => ({ ...f, habilidades: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading ? 'Enviando currículo...' : 'Enviar currículo'}
          </button>
        </form>
      </div>
    </div>
  );
}
