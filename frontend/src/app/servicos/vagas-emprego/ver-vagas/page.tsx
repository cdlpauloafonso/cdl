'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listVagasPublic, type Vaga } from '@/lib/firestore-vagas';

function formatoTipoVaga(tipo: Vaga['tipoVaga']) {
  if (tipo === 'hibrida') return 'Hibrida';
  if (tipo === 'presencial') return 'Presencial';
  return 'Remota';
}

function formatoTipoContrato(tipo: Vaga['tipoContrato']) {
  if (tipo === 'clt') return 'CLT';
  if (tipo === 'estagio') return 'Estagio';
  if (tipo === 'temporario') return 'Temporario';
  if (tipo === 'pj') return 'PJ';
  if (tipo === 'jovem-aprendiz') return 'Jovem aprendiz';
  return 'Outro';
}

export default function VerVagasPage() {
  const [busca, setBusca] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVagasPublic()
      .then(setVagas)
      .catch(() => setVagas([]))
      .finally(() => setLoading(false));
  }, []);

  const cidades = useMemo(
    () => ['todas', ...new Set(vagas.map((vaga) => vaga.cidade))],
    [vagas]
  );

  const vagasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return vagas.filter((vaga) => {
      const matchBusca =
        !termo ||
        vaga.tituloVaga.toLowerCase().includes(termo) ||
        vaga.empresa.toLowerCase().includes(termo) ||
        vaga.descricaoVaga.toLowerCase().includes(termo) ||
        vaga.requisitos.toLowerCase().includes(termo);
      const matchCidade = filtroCidade === 'todas' || vaga.cidade === filtroCidade;
      const matchTipo = filtroTipo === 'todos' || vaga.tipoVaga === filtroTipo;
      return matchBusca && matchCidade && matchTipo;
    });
  }, [busca, filtroCidade, filtroTipo, vagas]);

  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl max-w-5xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Ver vagas</h1>
        <p className="mt-4 text-lg text-cdl-gray-text">
          Confira as oportunidades abertas e candidate-se pelo canal de contato informado em cada vaga.
        </p>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label htmlFor="busca" className="block text-sm font-medium text-gray-700">Buscar vaga</label>
              <input
                id="busca"
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite cargo, empresa ou palavra-chave"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              />
            </div>

            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">Cidade</label>
              <select
                id="cidade"
                value={filtroCidade}
                onChange={(e) => setFiltroCidade(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              >
                {cidades.map((cidade) => (
                  <option key={cidade} value={cidade}>
                    {cidade === 'todas' ? 'Todas as cidades' : cidade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo de vaga</label>
              <select
                id="tipo"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue"
              >
                <option value="todos">Todos</option>
                <option value="presencial">Presencial</option>
                <option value="híbrida">Híbrida</option>
                <option value="remota">Remota</option>
              </select>
            </div>

            <div className="flex items-end">
              <Link href="/servicos/vagas-emprego/cadastrar-curriculo" className="btn-secondary w-full text-center">
                Cadastrar currículo
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {loading && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-cdl-gray-text">Carregando vagas...</p>
            </div>
          )}
          {!loading && vagasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-cdl-gray-text">Nenhuma vaga encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            vagasFiltradas.map((vaga) => (
              <article key={vaga.id} className="rounded-xl border border-gray-200 bg-white p-6 hover:border-cdl-blue/30 hover:shadow-md transition-all">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{vaga.tituloVaga}</h2>
                    <p className="text-cdl-gray-text">{vaga.empresa}</p>
                  </div>
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium bg-cdl-blue/10 text-cdl-blue">
                    Prazo: {new Date(vaga.prazoCandidatura).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700">{vaga.cidade}</span>
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700">{formatoTipoVaga(vaga.tipoVaga)}</span>
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700">{formatoTipoContrato(vaga.tipoContrato)}</span>
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-700">
                    {vaga.salarioACombinar ? 'A combinar' : vaga.salario || 'Nao informado'}
                  </span>
                </div>

                <p className="mt-4 text-cdl-gray-text">{vaga.descricaoVaga}</p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/atendimento" className="btn-primary">
                    Candidatar-se
                  </Link>
                  <Link href="/servicos/vagas-emprego/cadastrar-curriculo" className="btn-secondary">
                    Enviar currículo
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
