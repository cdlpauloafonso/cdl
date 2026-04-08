'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { listNews, listCarouselSlides, listAgendamentos, type Agendamento } from '@/lib/firestore';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{ pages: number; directors: number; services: number; news: number; messages: number; associates: number } | null>(null);
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Agendamento[]>([]);
  
  // Dados mock para próximos aniversários
  const proximosAniversarios = [
    { nome: 'João Silva', empresa: 'Tech Solutions', data: '15/03/2026' },
    { nome: 'Maria Santos', empresa: 'Comércio Local', data: '18/03/2026' },
    { nome: 'Pedro Costa', empresa: 'Serviços Gerais', data: '22/03/2026' },
  ];

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

    Promise.all([apiPromise, pagesPromise, newsPromise, agendamentosPromise])
      .then(([apiStats, pagesCount, newsCount, agendamentos]) => {
        setStats({
          ...apiStats,
          pages: pagesCount,
          news: newsCount,
          associates: 200, // Valor estático baseado na estatística da homepage
        });
        setProximosAgendamentos(agendamentos);
      })
      .catch(() => {
        setStats({ pages: 0, directors: 0, services: 0, news: 0, messages: 0, associates: 0 });
        setProximosAgendamentos([]);
      });
  }, []);

  const cards = [
    { label: 'Páginas', value: stats?.pages ?? '—', href: '/admin/paginas' },
    { label: 'Diretoria', value: stats?.directors ?? '—', href: '/admin/diretoria' },
    { label: 'Serviços', value: stats?.services ?? '—', href: '/admin/servicos' },
    { label: 'Notícias', value: stats?.news ?? '—', href: '/admin/noticias' },
    { label: 'Mensagens', value: stats?.messages ?? '—', href: '/admin/contato' },
  ];

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-cdl-gray-text">Visão geral do conteúdo do site</p>
      
      {/* Card de Associados em Destaque */}
      <div className="mt-8 mb-6">
        <Link
          href="/admin/associados"
          className="block p-8 rounded-xl bg-gradient-to-r from-cdl-blue to-cdl-blue-dark text-white hover:shadow-lg transition-all border-2 border-transparent hover:border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Associados</p>
              <p className="mt-2 text-4xl font-bold">{stats?.associates ?? '—'}</p>
              <p className="mt-1 text-sm text-blue-100">Empresas associadas</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Outros Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block p-6 rounded-xl bg-white border border-gray-200 hover:border-cdl-blue/30 hover:shadow-md transition-all"
          >
            <p className="text-sm font-medium text-cdl-gray-text">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{c.value}</p>
          </Link>
        ))}
      </div>

      {/* Próximos Agendamentos do Auditório */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Próximos Agendamentos do Auditório</h2>
          <Link
            href="/admin/agendamentos"
            className="text-sm text-cdl-blue hover:text-cdl-blue-dark font-medium"
          >
            Ver todos
          </Link>
        </div>
        
        {proximosAgendamentos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div key={agendamento.id} className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full text-white flex-shrink-0"
                        style={{ backgroundColor: agendamento.backgroundColor }}
                      >
                        {getStatusLabel(agendamento.extendedProps.status)}
                      </span>
                      <h3 className="font-medium text-gray-900 truncate">{agendamento.title}</h3>
                      <span className="text-xs text-gray-600 flex-shrink-0">{formatDate(agendamento.start)}</span>
                      {agendamento.extendedProps.solicitante && (
                        <span className="text-xs text-gray-600 truncate">{agendamento.extendedProps.solicitante}</span>
                      )}
                    </div>
                    <Link
                      href={`/admin/agendamentos?id=${agendamento.id}`}
                      className="ml-3 px-2 py-1 text-xs bg-cdl-blue text-white rounded hover:bg-cdl-blue-dark transition-colors flex-shrink-0"
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
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Próximos Aniversários</h2>
          <Link
            href="/admin/aniversarios"
            className="text-sm text-cdl-blue hover:text-cdl-blue-dark font-medium"
          >
            Ver todos
          </Link>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {proximosAniversarios.map((aniversariante, index) => (
              <div key={index} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{aniversariante.nome}</h3>
                      <span className="text-xs text-gray-600">{aniversariante.empresa}</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full flex-shrink-0">
                      {aniversariante.data}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
