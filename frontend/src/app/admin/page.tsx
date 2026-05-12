'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import {
  listNews,
  listCarouselSlides,
  listAgendamentos,
  getAssociados,
  type Agendamento,
  type Associado,
} from '@/lib/firestore';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{ pages: number; directors: number; services: number; news: number; messages: number; associates: number; emNegociacao: number } | null>(null);
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Agendamento[]>([]);
  const [proximosAniversarios, setProximosAniversarios] = useState<{ nome: string; empresa: string; data: string; foto?: string }[]>([]);
  const [associadosBusca, setAssociadosBusca] = useState<Associado[]>([]);
  const [buscaAssociado, setBuscaAssociado] = useState('');
  const [selectedAssociado, setSelectedAssociado] = useState<Associado | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('cdl_admin_token');
    if (!token) return;

    // Páginas (carrossel) e notícias usam Firestore
    const pagesPromise = listCarouselSlides().then((items) => items.length).catch(() => 0);
    const newsPromise = listNews(false, 500).then((items) => items.length).catch(() => 0);

    // Próximos agendamentos do auditório
    const agendamentosPromise = listAgendamentos()
      .then((agendamentos) => {
        // Filtrar apenas agendamentos futuros e ordenar por data
        const agora = new Date();
        const futuros = agendamentos
          .filter(agg => new Date(agg.start) > agora)
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          .slice(0, 5); // Pegar os 5 próximos
        return futuros;
      })
      .catch(() => []);

    // Mesma regra da lista de associados (statusResumo): sem campo status conta como ativo
    const associadosPromise = getAssociados()
      .then((associados) => {
        setAssociadosBusca(associados);
        let ativos = 0;
        let emNegociacao = 0;
        let desativados = 0;
        associados.forEach((a) => {
          const status = a.status ?? 'ativo';
          if (status === 'desativado') desativados += 1;
          else if (status === 'em_negociacao') emNegociacao += 1;
          else ativos += 1;
        });
        const hoje = new Date();
        const proximos: { nome: string; empresa: string; data: string; diasAte: number; foto?: string }[] = [];

        associados.forEach((associado) => {
          (associado.aniversariantes ?? []).forEach((aniversariante) => {
            const dataStr = aniversariante.data?.trim();
            if (!dataStr) return;

            let dataAniversario: Date;
            if (dataStr.includes('/')) {
              const partes = dataStr.split('/');
              const dia = parseInt(partes[0], 10);
              const mes = parseInt(partes[1], 10) - 1;
              const ano = partes[2] ? parseInt(partes[2], 10) : hoje.getFullYear();
              dataAniversario = new Date(ano, mes, dia);
            } else if (dataStr.includes('-')) {
              dataAniversario = new Date(dataStr);
            } else {
              dataAniversario = new Date(dataStr);
            }
            if (Number.isNaN(dataAniversario.getTime())) return;

            if (dataStr.split('/').length === 2) {
              dataAniversario.setFullYear(hoje.getFullYear());
            }
            if (dataAniversario < hoje) {
              dataAniversario.setFullYear(hoje.getFullYear() + 1);
            }

            const diasAte = Math.ceil((dataAniversario.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
            if (diasAte < 0 || diasAte > 90) return;

            proximos.push({
              nome: aniversariante.nome || '—',
              empresa: associado.razao_social || associado.nome_fantasia || associado.empresa || 'Empresa',
              data: dataAniversario.toLocaleDateString('pt-BR'),
              diasAte,
              foto: aniversariante.foto,
            });
          });
        });

        proximos.sort((a, b) => a.diasAte - b.diasAte);
        return {
          ativos,
          emNegociacao,
          desativados,
          total: associados.length,
          proximosAniversarios: proximos.slice(0, 6).map(({ diasAte, ...rest }) => rest),
        };
      })
      .catch(() => ({ ativos: 0, emNegociacao: 0, desativados: 0, total: 0, proximosAniversarios: [] as { nome: string; empresa: string; data: string; foto?: string }[] }));

    // API para diretoria, serviços, mensagens
    const apiPromise = Promise.all([
      apiGet<unknown[]>('/directors', token).catch(() => []),
      apiGet<unknown[]>('/services', token).catch(() => []),
      apiGet<unknown[]>('/contact', token).catch(() => []),
    ]).then(([directors, services, messages]) => ({
      directors: (directors as unknown[]).length,
      services: (services as unknown[]).length,
      messages: (messages as unknown[]).length,
    }));

    Promise.all([apiPromise, pagesPromise, newsPromise, agendamentosPromise, associadosPromise])
      .then(([apiStats, pagesCount, newsCount, agendamentos, associadosCount]) => {
        setStats({
          ...apiStats,
          pages: pagesCount,
          news: newsCount,
          associates: associadosCount.ativos,
          emNegociacao: associadosCount.emNegociacao,
        });
        setProximosAgendamentos(agendamentos);
        setProximosAniversarios(associadosCount.proximosAniversarios);
      })
      .catch(() => {
        setStats({ pages: 0, directors: 0, services: 0, news: 0, messages: 0, associates: 0, emNegociacao: 0 });
        setProximosAgendamentos([]);
        setProximosAniversarios([]);
      });
  }, []);

  const cards = [
    { label: 'Páginas', value: stats?.pages ?? '—', href: '/admin/paginas' },
    { label: 'Diretoria', value: stats?.directors ?? '—', href: '/admin/diretoria' },
    { label: 'Serviços', value: stats?.services ?? '—', href: '/admin/servicos' },
    { label: 'Benefícios', value: 'Editar', href: '/admin/beneficios-associados' },
    { label: 'Notícias', value: stats?.news ?? '—', href: '/admin/noticias' },
    { label: 'Mensagens', value: stats?.messages ?? '—', href: '/admin/contato' },
  ];

  const resultadosBuscaAssociado = useMemo(() => {
    const termo = buscaAssociado.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return [];

    const soDigitos = termo.replace(/\D/g, '');
    return associadosBusca
      .filter((assoc) => {
        const nome = (assoc.nome || '').toLocaleLowerCase('pt-BR');
        const empresa = (assoc.empresa || '').toLocaleLowerCase('pt-BR');
        const cnpj = (assoc.cnpj || '').replace(/\D/g, '');
        return (
          nome.includes(termo) ||
          empresa.includes(termo) ||
          (soDigitos.length > 0 && cnpj.includes(soDigitos))
        );
      })
      .slice(0, 8);
  }, [associadosBusca, buscaAssociado]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'cancelado': return 'Cancelado';
      case 'pendente': return 'Pendente';
      default: return status;
    }
  };

  const labelStatusAssociado = (status?: Associado['status']) => {
    if (status === 'desativado') return 'Desativado';
    if (status === 'em_negociacao') return 'Em negociação';
    return 'Ativo';
  };

  async function compartilharAniversariante(item: { nome: string; empresa: string; data: string }) {
    const texto = `🎉 Parabéns a ${item.nome} da ${item.empresa} por mais um ano de vida! (${item.data})`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `Aniversariante CDL - ${item.nome}`,
          text: texto,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        alert('Texto de aniversário copiado para a área de transferência.');
        return;
      }
      window.prompt('Copie o texto:', texto);
    } catch {
      alert('Não foi possível compartilhar agora.');
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-cdl-gray-text">Visão geral do conteúdo do site</p>
      
      {/* Card de Associados em Destaque */}
      <div className="mb-4 mt-4 grid grid-cols-2 gap-2.5 sm:mb-6 sm:mt-8 sm:gap-4">
        <Link
          href="/admin/associados?status=ativo"
          className="block rounded-xl border-2 border-transparent bg-gradient-to-r from-cdl-blue to-cdl-blue-dark p-4 text-white transition-all hover:border-white/20 hover:shadow-lg sm:p-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-100 sm:text-sm">Associados ativos</p>
              <p className="mt-1 text-3xl font-bold sm:mt-2 sm:text-4xl">{stats?.associates ?? '—'}</p>
              <p className="mt-0.5 text-xs text-blue-100 sm:mt-1 sm:text-sm">Somente cadastro com status ativo</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 sm:h-16 sm:w-16">
              <svg
                className="h-5 w-5 text-white sm:h-8 sm:w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/associados?status=em_negociacao"
          className="block rounded-xl border-2 border-transparent bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white transition-all hover:border-white/20 hover:shadow-lg sm:p-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-100 sm:text-sm">Em Negociação</p>
              <p className="mt-1 text-3xl font-bold sm:mt-2 sm:text-4xl">{stats?.emNegociacao ?? '—'}</p>
              <p className="mt-0.5 text-xs text-amber-100 sm:mt-1 sm:text-sm">Processos em andamento</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 sm:h-16 sm:w-16">
              <svg
                className="h-5 w-5 text-white sm:h-8 sm:w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 sm:mb-6 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Busca rápida de associado</h2>
          <Link
            href="/admin/associados"
            className="text-xs font-medium text-cdl-blue hover:text-cdl-blue-dark"
          >
            Ver lista completa
          </Link>
        </div>
        <input
          type="text"
          value={buscaAssociado}
          onChange={(e) => setBuscaAssociado(e.target.value)}
          placeholder="Buscar por nome, empresa ou CNPJ..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
        />
        {buscaAssociado.trim() && (
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
            {resultadosBuscaAssociado.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">Nenhum associado encontrado.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {resultadosBuscaAssociado.map((assoc) => (
                  <li key={assoc.id} className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{assoc.nome || '—'}</p>
                        <p className="truncate text-xs text-gray-600">{assoc.empresa || '—'}</p>
                        <p className="text-xs text-gray-500">{assoc.cnpj || 'CNPJ não informado'}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedAssociado(assoc)}
                          className="rounded-md border border-cdl-blue/30 bg-cdl-blue/5 px-2.5 py-1.5 text-xs font-medium text-cdl-blue hover:bg-cdl-blue/10"
                        >
                          Ver
                        </button>
                        <Link
                          href={`/admin/associados/editar?id=${encodeURIComponent(assoc.id)}`}
                          className="rounded-md bg-cdl-blue px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cdl-blue-dark"
                        >
                          Abrir
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Outros Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block rounded-xl border border-gray-200 bg-white p-3 transition-all hover:border-cdl-blue/30 hover:shadow-md sm:p-6"
          >
            <p className="text-xs font-medium text-cdl-gray-text sm:text-sm">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900 sm:mt-2 sm:text-2xl">{c.value}</p>
          </Link>
        ))}
      </div>

      {/* Próximos Agendamentos do Auditório */}
      <div className="mt-5 sm:mt-8">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Próximos Agendamentos do Auditório</h2>
          <Link
            href="/admin/agendamentos"
            className="text-xs font-medium text-cdl-blue hover:text-cdl-blue-dark sm:text-sm"
          >
            Ver todos
          </Link>
        </div>
        
        {proximosAgendamentos.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-center sm:p-8">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 sm:mb-4 sm:h-12 sm:w-12">
              <svg className="h-5 w-5 text-gray-400 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500">Nenhum agendamento futuro encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Os próximos agendamentos aparecerão aqui</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {proximosAgendamentos.map((agendamento) => (
                <div key={agendamento.id} className="p-2.5 transition-colors hover:bg-gray-50 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white sm:text-xs"
                        style={{ backgroundColor: agendamento.backgroundColor }}
                      >
                        {getStatusLabel(agendamento.extendedProps.status)}
                      </span>
                      <h3 className="truncate text-sm font-medium text-gray-900">{agendamento.title}</h3>
                      <span className="flex-shrink-0 text-[11px] text-gray-600 sm:text-xs">{formatDate(agendamento.start)}</span>
                      {agendamento.extendedProps.solicitante && (
                        <span className="truncate text-[11px] text-gray-600 sm:text-xs">{agendamento.extendedProps.solicitante}</span>
                      )}
                    </div>
                    <Link
                      href={`/admin/agendamentos?id=${agendamento.id}`}
                      className="ml-2 flex-shrink-0 rounded bg-cdl-blue px-2 py-1 text-[11px] text-white transition-colors hover:bg-cdl-blue-dark sm:ml-3 sm:text-xs"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Próximos Aniversários */}
      <div className="mt-5 sm:mt-8">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Próximos Aniversários</h2>
          <Link
            href="/admin/aniversarios"
            className="text-xs font-medium text-cdl-blue hover:text-cdl-blue-dark sm:text-sm"
          >
            Ver todos
          </Link>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {proximosAniversarios.length === 0 ? (
              <div className="p-5 text-center sm:p-8">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 sm:mb-4 sm:h-12 sm:w-12">
                  <svg className="h-5 w-5 text-pink-400 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">Nenhum aniversário encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Os próximos aniversários aparecerão aqui</p>
              </div>
            ) : (
              proximosAniversarios.map((aniversariante, index) => (
                <div key={index} className="p-2.5 transition-colors hover:bg-gray-50 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-pink-400 to-purple-400 sm:h-8 sm:w-8">
                        {aniversariante.foto ? (
                          <img
                            src={aniversariante.foto}
                            alt={`Foto de ${aniversariante.nome}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <svg className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate text-sm font-medium text-gray-900">{aniversariante.nome}</h3>
                        <span className="text-[11px] text-gray-600 sm:text-xs">{aniversariante.empresa}</span>
                      </div>
                      <span className="flex-shrink-0 rounded-full bg-pink-100 px-2 py-1 text-[11px] font-medium text-pink-800 sm:text-xs">
                        {aniversariante.data}
                      </span>
                      <div className="ml-2 flex shrink-0 items-center gap-1">
                        <Link
                          href="/admin/aniversarios"
                          title="Ver aniversariantes"
                          aria-label="Ver aniversariantes"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cdl-blue/10 text-cdl-blue ring-1 ring-cdl-blue/15 hover:bg-cdl-blue/15"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>
                        <Link
                          href="/admin/aniversarios"
                          title="Abrir card de aniversário"
                          aria-label="Abrir card de aniversário"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-purple-50 text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 7h18M7 3h10l1 4H6l1-4zm-2 4h14v14H5V7zm8 4v6m-3-3h6"
                            />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => void compartilharAniversariante(aniversariante)}
                          title="Compartilhar aniversariante"
                          aria-label="Compartilhar aniversariante"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.684 13.342C9.113 12.458 10 11.833 11 11.833c1 0 1.887.625 2.316 1.509M15 8a3 3 0 11-6 0 3 3 0 016 0zM19 21H5a2 2 0 01-2-2v-1a4 4 0 014-4h10a4 4 0 014 4v1a2 2 0 01-2 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedAssociado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="w-full max-w-4xl max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl bg-white shadow-xl sm:max-h-[calc(100vh-2rem)]">
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
                ['Status', labelStatusAssociado(selectedAssociado.status)],
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
