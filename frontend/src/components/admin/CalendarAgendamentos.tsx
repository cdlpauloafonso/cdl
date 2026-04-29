'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { useEffect, useState } from 'react';
import { type Agendamento } from '@/lib/firestore';

interface CalendarAgendamentosProps {
  agendamentos: Agendamento[];
  onEventClick?: (agendamento: Agendamento) => void;
  onDateClick?: (date: Date) => void;
}

export function CalendarAgendamentos({ agendamentos, onEventClick, onDateClick }: CalendarAgendamentosProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const calendarEvents = agendamentos.map(agendamento => ({
      id: agendamento.id,
      title: agendamento.title,
      start: agendamento.start,
      end: agendamento.end,
      backgroundColor: agendamento.backgroundColor,
      borderColor: agendamento.backgroundColor,
      extendedProps: agendamento.extendedProps
    }));
    setEvents(calendarEvents);
  }, [agendamentos]);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 768);
    updateMobile();
    window.addEventListener('resize', updateMobile);
    return () => window.removeEventListener('resize', updateMobile);
  }, []);

  const handleEventClick = (clickInfo: any) => {
    if (onEventClick) {
      const agendamento: Agendamento = {
        id: clickInfo.event.id,
        title: clickInfo.event.title,
        start: clickInfo.event.start?.toISOString() || '',
        end: clickInfo.event.end?.toISOString() || '',
        backgroundColor: clickInfo.event.backgroundColor || '#3788d8',
        extendedProps: clickInfo.event.extendedProps || {}
      };
      onEventClick(agendamento);
    }
  };

  const handleDateClick = (clickInfo: any) => {
    if (onDateClick) {
      onDateClick(clickInfo.date);
    }
  };

  return (
    <div className="admin-calendar rounded-lg border border-gray-200 bg-white p-2 shadow-sm sm:p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        headerToolbar={
          isMobile
            ? {
                left: 'prev,next',
                center: 'title',
                right: 'dayGridMonth,listWeek',
              }
            : {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              }
        }
        initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
        locale="pt-br"
        events={events}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="auto"
        aspectRatio={isMobile ? 0.95 : 1.35}
        dayMaxEventRows={isMobile ? 2 : 4}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventMouseEnter={(mouseEnterInfo) => {
          const el = mouseEnterInfo.el;
          el.style.cursor = 'pointer';
        }}
        eventDisplay="block"
        displayEventTime={true}
        displayEventEnd={true}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        dayHeaderFormat={isMobile ? { weekday: 'narrow' } : { weekday: 'short' }}
        titleFormat={{ 
          month: 'long', 
          year: 'numeric',
          day: 'numeric'
        }}
        buttonText={{
          today: isMobile ? 'Hoje' : 'Hoje',
          month: isMobile ? 'Mês' : 'Mês',
          week: 'Semana',
          day: 'Dia',
          list: isMobile ? 'Lista' : 'Lista'
        }}
        moreLinkText={(n) => `+${n}`}
      />
    </div>
  );
}
