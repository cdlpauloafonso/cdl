'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listAgendamentos, createAgendamento, updateAgendamento, deleteAgendamento, type Agendamento, getCorPorStatus } from '@/lib/firestore';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { CalendarAgendamentos } from '@/components/admin/CalendarAgendamentos';

export default function AgendamentosPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Agendamentos state
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [filteredAgendamentos, setFilteredAgendamentos] = useState<Agendamento[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    solicitante: '',
    telefone: '',
    email: '',
    status: 'pendente' as Agendamento['extendedProps']['status'],
    observacoes: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAuth();
      
      // Listener para detectar mudanças no localStorage
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'cdl_admin_token' && !e.newValue) {
          // Token foi removido (sessão encerrada)
          setIsAuthenticated(false);
          router.push('/admin/login?redirect=/agendamentos');
        }
      };

      // Listener para detectar mudanças no Firebase Auth
      const handleAuthChange = () => {
        const token = localStorage.getItem('cdl_admin_token');
        if (!token) {
          setIsAuthenticated(false);
          router.push('/admin/login?redirect=/agendamentos');
        }
      };

      // Adiciona listeners
      window.addEventListener('storage', handleStorageChange);
      
      // Verificação periódica da sessão
      const sessionCheck = setInterval(() => {
        const token = localStorage.getItem('cdl_admin_token');
        if (!token && isAuthenticated) {
          handleAuthChange();
        }
      }, 5000); // Verifica a cada 5 segundos

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(sessionCheck);
      };
    }
  }, [mounted, isAuthenticated]);

  const checkAuth = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cdl_admin_token') : null;
    if (!token) {
      router.push('/admin/login?redirect=/agendamentos');
      return;
    }
    setIsAuthenticated(true);
    loadAgendamentos();
  };

  const loadAgendamentos = async () => {
    try {
      const agendamentosList = await listAgendamentos();
      setAgendamentos(agendamentosList);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      
      // Verifica se o erro é de autenticação
      if (error instanceof Error && 
          (error.message.includes('unauthorized') || 
           error.message.includes('permission-denied') ||
           error.message.includes('auth'))) {
        // Sessão expirada, redireciona para login
        localStorage.removeItem('cdl_admin_token');
        setIsAuthenticated(false);
        router.push('/admin/login?redirect=/agendamentos');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtra agendamentos por status
  useEffect(() => {
    if (statusFilter === 'todos') {
      setFilteredAgendamentos(agendamentos);
    } else {
      setFilteredAgendamentos(agendamentos.filter(agendamento => 
        agendamento.extendedProps.status === statusFilter
      ));
    }
  }, [agendamentos, statusFilter]);

  const handleCreate = () => {
    setSelectedAgendamento(null);
    setFormData({
      title: '',
      start: '',
      end: '',
      solicitante: '',
      telefone: '',
      email: '',
      status: 'pendente',
      observacoes: ''
    });
    setShowModal(true);
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value;
    setFormData({ ...formData, start: startDate, end: startDate });
  };

  const handleEdit = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    
    // Formata datas para o input datetime-local
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localDate.toISOString().slice(0, 16);
    };
    
    setFormData({
      title: agendamento.title,
      start: formatDateForInput(agendamento.start),
      end: formatDateForInput(agendamento.end),
      solicitante: agendamento.extendedProps.solicitante,
      telefone: agendamento.extendedProps.contato,
      email: agendamento.extendedProps.email,
      status: agendamento.extendedProps.status,
      observacoes: agendamento.extendedProps.observacoes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      await deleteAgendamento(id);
      await loadAgendamentos();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      
      // Verifica se o erro é de permissões (sessão expirada)
      if (error instanceof Error && 
          (error.message.includes('Missing or insufficient permissions') ||
           error.message.includes('permission-denied') ||
           error.message.includes('unauthorized') ||
           error.message.includes('auth'))) {
        // Sessão expirada, redireciona para login
        localStorage.removeItem('cdl_admin_token');
        setIsAuthenticated(false);
        router.push('/admin/login?redirect=/agendamentos');
      } else {
        alert('Erro ao excluir agendamento. Tente novamente.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const agendamentoData = {
        title: formData.title,
        start: formData.start,
        end: formData.end,
        extendedProps: {
          solicitante: formData.solicitante,
          contato: formData.telefone,
          email: formData.email,
          status: formData.status,
          observacoes: formData.observacoes
        },
        backgroundColor: getCorPorStatus(formData.status)
      };

      console.log('Submitting:', agendamentoData); // Debug
      console.log('Selected ID:', selectedAgendamento?.id); // Debug

      if (selectedAgendamento) {
        await updateAgendamento(selectedAgendamento.id!, agendamentoData);
      } else {
        await createAgendamento(agendamentoData);
      }

      // Atualiza o calendário em tempo real
      await loadAgendamentos();
      setShowModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      
      // Verifica se o erro é de permissões (sessão expirada)
      if (error instanceof Error && 
          (error.message.includes('Missing or insufficient permissions') ||
           error.message.includes('permission-denied') ||
           error.message.includes('unauthorized') ||
           error.message.includes('auth'))) {
        // Sessão expirada, redireciona para login
        localStorage.removeItem('cdl_admin_token');
        setIsAuthenticated(false);
        router.push('/admin/login?redirect=/agendamentos');
      } else {
        alert('Erro ao salvar agendamento. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (status: Agendamento['extendedProps']['status']) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'cancelado': return 'Cancelado';
      case 'pendente': return 'Pendente';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('cdl_admin_token');
    router.push('/admin/login?redirect=/agendamentos');
  };

  if (!mounted) return null;
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue"></div>
        <p className="mt-2 text-gray-600">Carregando agendamentos...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header Simplificado - Sem Top Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agendamentos do Auditório</h1>
              <p className="text-gray-600 mt-1">Gerencie os agendamentos do auditório</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors"
              >
                + Novo Agendamento
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro de Status */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'todos' 
                    ? 'bg-cdl-blue text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('pendente')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'pendente' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pendente
              </button>
              <button
                onClick={() => setStatusFilter('confirmado')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'confirmado' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Confirmado
              </button>
              <button
                onClick={() => setStatusFilter('cancelado')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'cancelado' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancelado
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Calendário Visual */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Calendário de Agendamentos 
            {statusFilter !== 'todos' && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Filtrando: {statusFilter})
              </span>
            )}
          </h2>
          <CalendarAgendamentos
            agendamentos={filteredAgendamentos}
            onEventClick={handleEdit}
            onDateClick={(date) => {
              // Pré-preencher data ao clicar no calendário
              const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
              const dateString = localDate.toISOString().slice(0, 16);
              handleCreate();
              setFormData(prev => ({ ...prev, start: dateString, end: dateString }));
            }}
          />
        </div>

        {/* Lista de Agendamentos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Agendamentos
              {statusFilter !== 'todos' && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Filtrando: {statusFilter})
                </span>
              )}
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredAgendamentos.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {statusFilter === 'todos' 
                  ? 'Nenhum agendamento encontrado. Crie seu primeiro agendamento.'
                  : `Nenhum agendamento com status "${statusFilter}" encontrado.`
                }
              </div>
            ) : (
              filteredAgendamentos.map((agendamento) => (
                <div key={agendamento.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{agendamento.title}</h3>
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-full text-white"
                          style={{ backgroundColor: agendamento.backgroundColor }}
                        >
                          {getStatusLabel(agendamento.extendedProps.status)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>Solicitante:</strong> {agendamento.extendedProps.solicitante || 'Não informado'}</p>
                        {agendamento.extendedProps.solicitante && (
                          <p><strong>Telefone:</strong> {agendamento.extendedProps.contato || 'Não informado'}</p>
                        )}
                        {agendamento.extendedProps.solicitante && (
                          <p><strong>Email:</strong> {agendamento.extendedProps.email || 'Não informado'}</p>
                        )}
                        <p><strong>Início:</strong> {formatDate(agendamento.start)}</p>
                        <p><strong>Término:</strong> {agendamento.end ? formatDate(agendamento.end) : 'Não informado'}</p>
                        {agendamento.extendedProps.observacoes && (
                          <p><strong>Observações:</strong> {agendamento.extendedProps.observacoes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(agendamento)}
                        className="px-3 py-1 text-cdl-blue hover:bg-cdl-blue/10 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(agendamento.id!)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Formulário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título do Evento
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Agendamento['extendedProps']['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data e Hora Início
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start}
                    onChange={handleStartDateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data e Hora Término
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end}
                    onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Solicitante
                  </label>
                  <input
                    type="text"
                    value={formData.solicitante}
                    onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : (selectedAgendamento ? 'Atualizar' : 'Criar')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Salvo com sucesso!"
      />
    </>
  );
}
