'use client';

import { useEffect, useState } from 'react';
import { decodeEventDateTime, encodeEventDateTime } from '@/lib/event-datetime';

type EventDateTimeFieldsProps = {
  value: string;
  onChange: (next: string) => void;
  idPrefix?: string;
};

export function EventDateTimeFields({ value, onChange, idPrefix = 'event' }: EventDateTimeFieldsProps) {
  const [datePart, setDatePart] = useState('');
  const [timePart, setTimePart] = useState('');

  useEffect(() => {
    const d = decodeEventDateTime(value);
    setDatePart(d.date);
    setTimePart(d.time);
  }, [value]);

  function commit(nextDate: string, nextTime: string) {
    setDatePart(nextDate);
    setTimePart(nextTime);
    onChange(encodeEventDateTime(nextDate, nextTime));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full max-w-[11rem] shrink-0">
          <label htmlFor={`${idPrefix}-date`} className="block text-sm font-medium text-gray-700">
            Data
          </label>
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={datePart}
            onChange={(e) => commit(e.target.value, timePart)}
            className="mt-1 block w-full max-w-[11rem] rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="w-full max-w-[9rem] shrink-0 sm:w-auto">
          <label htmlFor={`${idPrefix}-time`} className="block text-sm font-medium text-gray-700">
            Hora
          </label>
          <input
            id={`${idPrefix}-time`}
            type="time"
            value={timePart}
            onChange={(e) => commit(datePart, e.target.value)}
            className="mt-1 block w-full max-w-[9rem] rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-cdl-gray-text">A hora é opcional.</p>
    </div>
  );
}
