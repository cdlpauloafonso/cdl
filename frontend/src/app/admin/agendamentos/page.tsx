'use client';

import { useEffect, useState } from 'react';
import { listAgendamentos, createAgendamento, updateAgendamento, deleteAgendamento, type Agendamento, getCorPorStatus, listContratos, type Contrato } from '@/lib/firestore';
import Link from 'next/link';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { CalendarAgendamentos } from '@/components/admin/CalendarAgendamentos';

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para contrato
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<any>(null);
  const [contratoData, setContratoData] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit');

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
    loadAgendamentos();
  }, []);

  const loadAgendamentos = async () => {
    try {
      const data = await listAgendamentos();
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

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

      console.log('Submitting admin:', agendamentoData); // Debug
      console.log('Selected ID admin:', selectedAgendamento?.id); // Debug

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

  const handleContrato = async (agendamento: Agendamento) => {
    try {
      // Carregar contratos disponíveis
      const contratos = await listContratos();
      
      if (contratos.length === 0) {
        alert('Nenhum modelo de contrato encontrado. Crie um modelo primeiro.');
        return;
      }

      // Usar o primeiro contrato (futuramente pode haver seleção)
      const contrato = contratos[0];
      setSelectedContrato(contrato);
      setSelectedAgendamento(agendamento);
      
      // Preparar dados para substituição (dados do agendamento)
      const dadosAgendamento: Record<string, string> = {
        nome_cliente: agendamento.extendedProps.solicitante || 'Não informado',
        data_evento: formatDate(agendamento.start),
        titulo_evento: agendamento.title,
        telefone: agendamento.extendedProps.contato || 'Não informado',
        email: agendamento.extendedProps.email || 'Não informado',
        observacoes: agendamento.extendedProps.observacoes || 'Não informado'
      };

      // Preparar campos editáveis do contrato (placeholders)
      const camposEditaveis: Record<string, string> = {};
      if (contrato.campos) {
        contrato.campos.forEach(campo => {
          // Primeiro tenta usar os campos salvos no agendamento
          const valorSalvo = agendamento.extendedProps.camposContrato?.[campo];
          const valorPadrao = dadosAgendamento[campo] || '';
          camposEditaveis[campo] = valorSalvo || valorPadrao;
          
          // Log para debug
          console.log(`Campo ${campo}: salvo=${valorSalvo}, padrão=${valorPadrao}, final=${camposEditaveis[campo]}`);
        });
      }

      console.log('Dados do contrato carregados:', camposEditaveis);
      setContratoData(camposEditaveis);
      setViewMode('edit');
      setShowContratoModal(true);
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
      alert('Erro ao carregar modelo de contrato.');
    }
  };

  const handleVerContrato = () => {
    setViewMode('view');
  };

  const handleEditarContrato = () => {
    setViewMode('edit');
  };

  const handleSalvarContrato = async () => {
    if (!selectedAgendamento || !selectedContrato) return;

    try {
      console.log('Salvando contrato:', {
        agendamentoId: selectedAgendamento.id,
        contratoData: contratoData
      });

      // Salvar os campos do contrato no agendamento
      const agendamentoAtualizado = {
        ...selectedAgendamento,
        extendedProps: {
          ...selectedAgendamento.extendedProps,
          camposContrato: contratoData // Salvar campos específicos deste agendamento
        }
      };

      console.log('Agendamento atualizado:', agendamentoAtualizado);

      await updateAgendamento(selectedAgendamento.id!, agendamentoAtualizado);
      
      // Atualizar a lista local
      setAgendamentos(prev => 
        prev.map(agg => 
          agg.id === selectedAgendamento.id ? agendamentoAtualizado : agg
        )
      );

      console.log('Contrato salvo com sucesso!');
      
      // Mostrar sucesso sem mudar de modo
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
      
    } catch (error) {
      console.error('Erro ao salvar campos do contrato:', error);
      alert('Erro ao salvar campos do contrato. Tente novamente.');
    }
  };

  const handleCompartilhar = async () => {
    if (!selectedAgendamento || !selectedContrato) return;

    try {
      // Gerar conteúdo do contrato processado
      const contratoProcessado = processarContrato(
        selectedContrato.conteudo, 
        contratoData, 
        selectedAgendamento?.extendedProps.camposContrato
      );

      // Criar conteúdo para compartilhamento
      const conteudoCompartilhamento = `
CONTRATO - ${selectedAgendamento.title}
=====================================

${contratoProcessado}

---
Gerado em: ${new Date().toLocaleString('pt-BR')}
Sistema: CDL Paulo Afonso
      `.trim();

      // Copiar para área de transferência
      await navigator.clipboard.writeText(conteudoCompartilhamento);
      
      // Mostrar feedback
      alert('Contrato copiado para a área de transferência! Você pode colar em qualquer aplicativo.');
      
    } catch (error) {
      console.error('Erro ao compartilhar contrato:', error);
      alert('Erro ao compartilhar contrato. Tente novamente.');
    }
  };

  const handleImprimir = () => {
    if (!selectedAgendamento || !selectedContrato) return;

    try {
      // Gerar conteúdo do contrato processado
      const contratoProcessado = processarContrato(
        selectedContrato.conteudo, 
        contratoData, 
        selectedAgendamento?.extendedProps.camposContrato
      );

      // Criar conteúdo para impressão
      const conteudoImpressao = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${selectedContrato.nome || 'Contrato'} - ${selectedAgendamento.title}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      line-height: 1.6; 
      font-size: 12pt;
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .title { font-size: 18pt; font-weight: bold; margin-bottom: 10px; }
    .subtitle { font-size: 14pt; color: #666; margin-bottom: 5px; }
    .content { 
      white-space: pre-wrap; 
      text-align: justify;
      margin-bottom: 40px;
    }
    .footer { 
      margin-top: 40px; 
      text-align: center; 
      font-size: 10pt; 
      color: #666; 
      border-top: 1px solid #ccc;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${selectedContrato.nome || 'CONTRATO DE USO DO AUDITÓRIO'}</div>
    <div class="subtitle">${selectedAgendamento.title}</div>
    <div class="subtitle">Data: ${formatDate(selectedAgendamento.start)}</div>
  </div>
  <div class="content">
${contratoProcessado}
  </div>
  <div class="footer">
    <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    <p>Sistema: CDL Paulo Afonso</p>
  </div>
</body>
</html>
      `;

      // Abrir janela de impressão
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(conteudoImpressao);
        printWindow.document.close();
        printWindow.focus();
        
        // Aguardar carregamento e disparar impressão
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
      
    } catch (error) {
      console.error('Erro ao preparar impressão:', error);
      alert('Erro ao preparar impressão. Tente novamente.');
    }
  };

  const handleExportarPDF = async () => {
    if (!selectedAgendamento || !selectedContrato) return;

    try {
      // Gerar conteúdo do contrato processado
      const contratoProcessado = processarContrato(
        selectedContrato.conteudo, 
        contratoData, 
        selectedAgendamento?.extendedProps.camposContrato
      );

      // Carregar jsPDF dinamicamente
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Configurar fontes e margens
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      let yPosition = margin;

      // Função para adicionar texto com quebra automática
      const addText = (text: string, fontSize: number = 12, fontStyle: string = 'normal') => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        
        return yPosition;
      };

      // Adicionar cabeçalho
      addText(selectedContrato.nome || 'CONTRATO DE USO DO AUDITÓRIO', 16, 'bold');
      yPosition += 5;
      
      addText(`Evento: ${selectedAgendamento.title}`, 12, 'bold');
      addText(`Data: ${formatDate(selectedAgendamento.start)}`, 12, 'bold');
      addText(`Solicitante: ${selectedAgendamento.extendedProps.solicitante}`, 12, 'bold');
      yPosition += 10;

      // Adicionar conteúdo do contrato
      addText(contratoProcessado, 12, 'normal');
      yPosition += 20;

      // Adicionar espaço para assinaturas
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      addText('_________________________', 12, 'normal');
      addText('Assinatura do Solicitante', 10, 'normal');
      yPosition += 20;

      addText('_________________________', 12, 'normal');
      addText('Assinatura do Responsável', 10, 'normal');
      yPosition += 20;

      // Adicionar rodapé
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }
      
      addText(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, 10, 'italic');
      addText('Sistema CDL Paulo Afonso - (73) 3231-4144', 10, 'italic');

      // Gerar nome do arquivo
      const fileName = `Contrato_${selectedAgendamento.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Salvar o PDF diretamente
      doc.save(fileName);
      
      // Mostrar feedback de sucesso
      alert('PDF salvo com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const processarContrato = (conteudo: string, dados: any, camposSalvos?: Record<string, string>) => {
    let processado = conteudo;
    
    // Substituir placeholders - primeiro usa campos salvos, depois os dados atuais
    Object.keys(dados).forEach(key => {
      const placeholder = `{${key}}`;
      // Prioridade: campos salvos > dados atuais > vazio
      const valor = camposSalvos?.[key] || dados[key] || '';
      processado = processado.replace(new RegExp(placeholder, 'g'), valor);
    });

    return processado;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cdl-blue"></div>
        <p className="mt-2 text-gray-600">Carregando agendamentos...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
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
        </div>
      </div>

      {/* Calendário Visual */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendário de Agendamentos</h2>
        <CalendarAgendamentos
          agendamentos={agendamentos}
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
          <h2 className="text-lg font-semibold text-gray-900">Agendamentos</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {agendamentos.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum agendamento encontrado. Crie seu primeiro agendamento.
            </div>
          ) : (
            agendamentos.map((agendamento) => (
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
                      onClick={() => handleContrato(agendamento)}
                      className="px-3 py-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      Contrato
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

      {/* Modal de Contrato */}
      {showContratoModal && selectedContrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Contrato - {selectedAgendamento?.title}
              </h2>
              <div className="flex gap-2">
                {viewMode === 'view' && (
                  <>
                    <button
                      onClick={handleCompartilhar}
                      className="px-3 py-1 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors text-sm"
                    >
                      Compartilhar
                    </button>
                    <button
                      onClick={handleExportarPDF}
                      className="px-3 py-1 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors text-sm"
                    >
                      Exportar PDF
                    </button>
                    <button
                      onClick={handleImprimir}
                      className="px-3 py-1 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors text-sm"
                    >
                      Imprimir
                    </button>
                    <button
                      onClick={handleEditarContrato}
                      className="px-3 py-1 bg-cdl-blue text-white rounded-lg hover:bg-cdl-blue-dark transition-colors text-sm"
                    >
                      Editar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowContratoModal(false)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>

            {viewMode === 'edit' ? (
              // Modo de Edição - Campos Editáveis do Contrato
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Preencha os campos do contrato:</h3>
                  <div className="text-sm text-blue-700 mb-4">
                    Campos definidos no modelo: {selectedContrato?.campos?.join(', ') || 'Nenhum campo definido'}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedContrato?.campos?.map((campo: string) => (
                      <div key={campo}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {campo.replace('_', ' ').charAt(0).toUpperCase() + campo.replace('_', ' ').slice(1)}
                        </label>
                        <input
                          type="text"
                          value={contratoData[campo] || ''}
                          onChange={(e) => setContratoData({ ...contratoData, [campo]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cdl-blue focus:border-cdl-blue"
                          placeholder={`Digite o valor para {${campo}}`}
                        />
                      </div>
                    ))}
                    {(!selectedContrato?.campos || selectedContrato.campos.length === 0) && (
                      <div className="col-span-2 text-center text-gray-500 py-4">
                        Nenhum campo editável definido no modelo de contrato.
                        <br />
                        <a 
                          href="/admin/contratos" 
                          className="text-cdl-blue hover:underline"
                        >
                          Editar modelo para adicionar campos
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={handleSalvarContrato}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={handleVerContrato}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Ver Contrato
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Modo de Visualização - Contrato Processado
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  {/* Título do Contrato */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedContrato?.nome || 'Contrato'}
                    </h3>
                  </div>

                  {/* Conteúdo do Contrato */}
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: processarContrato(
                        selectedContrato.conteudo, 
                        contratoData, 
                        selectedAgendamento?.extendedProps.camposContrato
                      ).replace(/\n/g, '<br>') 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Salvo com sucesso!"
      />
    </div>
  );
}
