'use client';

import { useEffect, useState } from 'react';
import { listAgendamentos, createAgendamento, updateAgendamento, deleteAgendamento, type Agendamento, getCorPorStatus, listContratos, type Contrato } from '@/lib/firestore';
import Link from 'next/link';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { CalendarAgendamentos } from '@/components/admin/CalendarAgendamentos';
import { getAuth } from 'firebase/auth';

/** Inputs compactos no mobile + min-w-0 evita estourar largura no iOS Safari */
const FIELD_INPUT_CLASS =
  'box-border min-w-0 w-full max-w-full rounded-md border border-gray-300 px-2 py-1.5 text-base leading-normal focus:border-cdl-blue focus:outline-none focus:ring-2 focus:ring-cdl-blue sm:rounded-lg sm:py-2 sm:text-sm';

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModalSuccess, setShowModalSuccess] = useState(false);

  // Estados para contrato
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<any>(null);
  const [contratoData, setContratoData] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit');
  const [showContratoSuccess, setShowContratoSuccess] = useState(false);

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

  /** Separa valor tipo datetime-local / ISO em data + hora (melhor no iOS que um único campo). */
  function splitDateTime(localIsoLike: string): { date: string; time: string } {
    if (!localIsoLike?.trim()) return { date: '', time: '' };
    const s = localIsoLike.trim();
    const m = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/.exec(s);
    if (m) {
      return { date: m[1], time: `${m[2]}:${m[3]}` };
    }
    const tIndex = s.indexOf('T');
    if (tIndex === -1) return { date: s.slice(0, 10), time: '' };
    const date = s.slice(0, 10);
    const time = s.slice(tIndex + 1, tIndex + 6);
    return { date, time: /^\d{2}:\d{2}$/.test(time) ? time : '' };
  }

  function mergeDateTime(date: string, time: string): string {
    if (!date) return '';
    const t = time && /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
    return `${date}T${t}`;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, telefone: formatted });
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
    if (!confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) return;

    // Verificar se usuário está autenticado
    const auth = getAuth();
    if (!auth.currentUser) {
      alert('Você não está autenticado. Por favor, faça login novamente.');
      return;
    }

    try {
      console.log('Tentando excluir agendamento:', id);
      console.log('Usuário autenticado:', auth.currentUser.uid);
      await deleteAgendamento(id);
      console.log('Agendamento excluído com sucesso');
      await loadAgendamentos();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      alert('Erro ao excluir agendamento. Verifique se você está logado como administrador e tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const agendamentoData = {
        title: formData.title,
        start: formData.start,
        end: formData.end || formData.start,
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
        // Ao editar, fecha modal, recarrega lista e mostra sucesso global
        setShowModal(false);
        await loadAgendamentos(); // Recarregar lista após edição
        setShowSuccessModal(true);
      } else {
        // Criar novo agendamento
        const newAgendamento = await createAgendamento(agendamentoData);
        
        // Transformar em modo edição com o novo agendamento criado
        setSelectedAgendamento(newAgendamento);
        
        // Mostrar sucesso interno
        setShowModalSuccess(true);
        setTimeout(() => setShowModalSuccess(false), 3000);
        
        // Atualiza o calendário em tempo real
        await loadAgendamentos();
      }
      
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

  const handleSalvarContrato = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      
      // Mostrar sucesso interno (3 segundos)
      setShowContratoSuccess(true);
      setTimeout(() => setShowContratoSuccess(false), 3000);
      
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
    @page {
      margin: 20mm;
      size: A4;
    }
    body { 
      font-family: Arial, sans-serif; 
      margin: 0; 
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

      // Criar iframe oculto para impressão
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(conteudoImpressao);
        iframeDoc.close();
        
        // Aguardar carregamento e disparar impressão diretamente
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Remover iframe após impressão
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
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
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos do Auditório</h1>
          <p className="text-gray-600 mt-1">Gerencie os agendamentos do auditório</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            onClick={handleCreate}
            className="w-full rounded-lg bg-cdl-blue px-3 py-2 text-sm text-white transition-colors hover:bg-cdl-blue-dark sm:w-auto sm:px-4"
          >
            + Novo Agendamento
          </button>
        </div>
      </div>

      {/* Calendário Visual */}
      <div className="mb-4 sm:mb-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900 sm:mb-4 sm:text-lg">Calendário de Agendamentos</h2>
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
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-2.5 sm:p-4">
          <h2 className="text-sm font-semibold text-gray-900 sm:text-lg">Agendamentos</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {agendamentos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum agendamento encontrado. Crie seu primeiro agendamento.
            </div>
          ) : (
            agendamentos.map((agendamento) => (
              <div key={agendamento.id} className="p-2 transition-colors hover:bg-gray-50 sm:p-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="mb-0.5 flex items-center gap-1.5 sm:gap-2">
                      <h3 className="truncate text-sm font-medium text-gray-900 sm:text-base">{agendamento.title}</h3>
                      <span
                        className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white sm:text-xs"
                        style={{ backgroundColor: agendamento.backgroundColor }}
                      >
                        {getStatusLabel(agendamento.extendedProps.status)}
                      </span>
                    </div>
                    <div className="space-y-0 text-xs text-gray-600 sm:text-sm">
                      <p><strong>Solicitante:</strong> {agendamento.extendedProps.solicitante || 'Não informado'}</p>
                      <div className="flex flex-col gap-0 sm:flex-row sm:gap-3">
                        {agendamento.extendedProps.solicitante && (
                          <p><strong>Telefone:</strong> {agendamento.extendedProps.contato || 'Não informado'}</p>
                        )}
                        {agendamento.extendedProps.solicitante && (
                          <p><strong>Email:</strong> {agendamento.extendedProps.email || 'Não informado'}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-0 sm:flex-row sm:gap-3">
                        <p><strong>Início:</strong> {formatDate(agendamento.start)}</p>
                        <p><strong>Término:</strong> {agendamento.end ? formatDate(agendamento.end) : 'Não informado'}</p>
                      </div>
                      {agendamento.extendedProps.observacoes && (
                        <p><strong>Observações:</strong> {agendamento.extendedProps.observacoes}</p>
                      )}
                    </div>
                  </div>
                  <div className="ml-2 flex shrink-0 flex-col gap-0.5 sm:ml-3 sm:flex-row sm:gap-1">
                    <button
                      onClick={() => handleEdit(agendamento)}
                      className="rounded bg-cdl-blue px-2 py-0.5 text-[10px] text-white transition-colors hover:bg-cdl-blue-dark sm:px-2 sm:py-1 sm:text-xs"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleContrato(agendamento)}
                      className="rounded bg-cdl-blue px-2 py-0.5 text-[10px] text-white transition-colors hover:bg-cdl-blue-dark sm:px-2 sm:py-1 sm:text-xs"
                    >
                      Contrato
                    </button>
                    <button
                      onClick={() => handleDelete(agendamento.id!)}
                      className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-red-600 transition-colors hover:bg-gray-200 sm:px-2 sm:py-1 sm:text-xs"
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:items-center sm:p-4">
          <div className="my-2 box-border flex max-h-[min(92dvh,calc(100dvh-0.75rem))] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-lg sm:my-4 sm:max-h-[90vh]">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-900 sm:mb-4 sm:text-lg">
              {selectedAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
            
            {/* Mensagem de Sucesso */}
            {showModalSuccess && (
              <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2 sm:mt-4 sm:p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Salvo com sucesso!
                    </p>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                <div className="min-w-0">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">
                    Título do Evento
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={FIELD_INPUT_CLASS}
                    required
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Agendamento['extendedProps']['status'] })}
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 sm:gap-3">
                <div className="min-w-0 space-y-1.5">
                  <span className="block text-xs font-medium text-gray-800 sm:text-sm">Início</span>
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    <div className="min-w-0">
                      <label htmlFor="ag-inicio-data" className="mb-0.5 block text-[11px] text-gray-500 sm:text-xs">
                        Data
                      </label>
                      <input
                        id="ag-inicio-data"
                        type="date"
                        value={splitDateTime(formData.start).date}
                        onChange={(e) => {
                          const time = splitDateTime(formData.start).time || '09:00';
                          const merged = mergeDateTime(e.target.value, time);
                          setFormData((prev) => ({ ...prev, start: merged, end: merged }));
                        }}
                        className={FIELD_INPUT_CLASS}
                        required
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="ag-inicio-hora" className="mb-0.5 block text-[11px] text-gray-500 sm:text-xs">
                        Hora
                      </label>
                      <input
                        id="ag-inicio-hora"
                        type="time"
                        value={splitDateTime(formData.start).time || '09:00'}
                        onChange={(e) => {
                          const date = splitDateTime(formData.start).date;
                          const merged = mergeDateTime(date, e.target.value);
                          setFormData((prev) => ({ ...prev, start: merged, end: merged }));
                        }}
                        className={FIELD_INPUT_CLASS}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <span className="block text-xs font-medium text-gray-800 sm:text-sm">Término</span>
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    <div className="min-w-0">
                      <label htmlFor="ag-term-data" className="mb-0.5 block text-[11px] text-gray-500 sm:text-xs">
                        Data
                      </label>
                      <input
                        id="ag-term-data"
                        type="date"
                        value={splitDateTime(formData.end || formData.start).date}
                        onChange={(e) => {
                          const base = formData.end || formData.start;
                          const time = splitDateTime(base).time || '10:00';
                          setFormData((prev) => ({
                            ...prev,
                            end: mergeDateTime(e.target.value, time),
                          }));
                        }}
                        className={FIELD_INPUT_CLASS}
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="ag-term-hora" className="mb-0.5 block text-[11px] text-gray-500 sm:text-xs">
                        Hora
                      </label>
                      <input
                        id="ag-term-hora"
                        type="time"
                        value={splitDateTime(formData.end || formData.start).time || '10:00'}
                        onChange={(e) => {
                          const date = splitDateTime(formData.end || formData.start).date;
                          setFormData((prev) => ({
                            ...prev,
                            end: mergeDateTime(date, e.target.value),
                          }));
                        }}
                        className={FIELD_INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                <div className="min-w-0">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">
                    Solicitante
                  </label>
                  <input
                    type="text"
                    value={formData.solicitante}
                    onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={FIELD_INPUT_CLASS}
                />
              </div>

              <div className="min-w-0">
                <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={2}
                  className={`${FIELD_INPUT_CLASS} resize-y sm:min-h-[5rem]`}
                />
              </div>

              <div className="flex flex-col gap-1.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-cdl-blue px-3 py-2 text-xs text-white transition-colors hover:bg-cdl-blue-dark disabled:opacity-50 sm:w-auto sm:px-4 sm:text-sm"
                >
                  {isSubmitting ? 'Salvando...' : (selectedAgendamento ? 'Atualizar' : 'Criar')}
                </button>
                {selectedAgendamento && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        handleContrato(selectedAgendamento);
                      }}
                      className="w-full rounded-lg bg-cdl-blue px-3 py-2 text-xs text-white transition-colors hover:bg-cdl-blue-dark sm:w-auto sm:px-4 sm:text-sm"
                    >
                      Contrato
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este agendamento?')) {
                          handleDelete(selectedAgendamento.id!);
                          setShowModal(false);
                        }
                      }}
                      className="w-full rounded-lg bg-red-600 px-3 py-2 text-xs text-white transition-colors hover:bg-red-700 sm:w-auto sm:px-4 sm:text-sm"
                    >
                      Excluir
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-200 sm:w-auto sm:px-4 sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contrato */}
      {showContratoModal && selectedContrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-2.5 shadow-lg sm:p-6">
            <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                Contrato - {selectedAgendamento?.title}
              </h2>
              
              {/* Mensagem de Sucesso */}
              {showContratoSuccess && (
                <div className="mx-1 mt-1 rounded-lg border border-green-200 bg-green-50 p-2 sm:mx-6 sm:mt-4 sm:p-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Salvo com sucesso!
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2">
                {viewMode === 'view' && (
                  <>
                    <button
                      onClick={handleExportarPDF}
                      className="rounded-lg bg-cdl-blue px-3 py-2 text-xs text-white transition-colors hover:bg-cdl-blue-dark sm:px-4 sm:text-sm"
                    >
                      Exportar PDF
                    </button>
                    <button
                      onClick={handleImprimir}
                      className="rounded-lg bg-cdl-blue px-3 py-2 text-xs text-white transition-colors hover:bg-cdl-blue-dark sm:px-4 sm:text-sm"
                    >
                      Imprimir
                    </button>
                    <button
                      onClick={handleEditarContrato}
                      className="rounded-lg bg-cdl-blue px-3 py-2 text-xs text-white transition-colors hover:bg-cdl-blue-dark sm:px-4 sm:text-sm"
                    >
                      Editar
                    </button>
                  </>
                )}
                <button
                  onClick={viewMode === 'view' ? handleEditarContrato : () => setShowContratoModal(false)}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-200 sm:px-4 sm:text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>

            {viewMode === 'edit' ? (
              // Modo de Edição - Campos Editáveis do Contrato
              <form onSubmit={handleSalvarContrato} className="space-y-3 sm:space-y-4">
                <div className="mb-3 text-xs text-gray-600 sm:mb-4 sm:text-sm">
                  Campos definidos no modelo: {selectedContrato?.campos?.join(', ') || 'Nenhum campo definido'}
                </div>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-4">
                  {selectedContrato?.campos?.map((campo: string) => (
                    <div key={campo}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {campo.replace('_', ' ').charAt(0).toUpperCase() + campo.replace('_', ' ').slice(1)}
                      </label>
                      <input
                        type="text"
                        value={contratoData[campo] || ''}
                        onChange={(e) => setContratoData({ ...contratoData, [campo]: e.target.value })}
                        className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cdl-blue focus:ring-2 focus:ring-cdl-blue"
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
                <div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-cdl-blue px-3 py-2 text-xs text-white transition-colors hover:bg-cdl-blue-dark sm:px-4 sm:text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={handleVerContrato}
                    className="rounded-lg bg-cdl-blue px-3 py-2 text-xs text-white transition-colors hover:bg-cdl-blue-dark sm:px-4 sm:text-sm"
                  >
                    Ver Contrato
                  </button>
                </div>
              </form>
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
