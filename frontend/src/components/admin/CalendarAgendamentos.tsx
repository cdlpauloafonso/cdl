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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        initialView="dayGridMonth"
        locale="pt-br"
        events={events}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="auto"
        aspectRatio={1.35}
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
        dayHeaderFormat={{ weekday: 'short' }}
        titleFormat={{ 
          month: 'long', 
          year: 'numeric',
          day: 'numeric'
        }}
        buttonText={{
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia',
          list: 'Lista'
        }}
      />
    </div>
  );
}
