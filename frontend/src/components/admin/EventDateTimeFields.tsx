'use client';

import { useEffect, useState } from 'react';
import { decodeEventDateTime, encodeEventDateTime } from '@/lib/event-datetime';

type EventDateTimeFieldsProps = {
  value: string;
  onChange: (next: string) => void;
  idPrefix?: string;
  /** Layout mais compacto (ex.: card Apresentação no admin). */
  compact?: boolean;
};

export function EventDateTimeFields({
  value,
  onChange,
  idPrefix = 'event',
  compact = false,
}: EventDateTimeFieldsProps) {
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

  const labelClass = compact
    ? 'mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500'
    : 'block text-sm font-medium text-gray-700';
  const inputClass = compact
    ? 'mt-0 block w-full rounded-md border border-gray-200 px-2 py-1 text-sm shadow-sm focus:border-cdl-blue focus:ring-1 focus:ring-cdl-blue/20'
    : 'mt-1 block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm';

  return (
    <div className={compact ? 'space-y-0' : 'space-y-2'}>
      <div className={`flex flex-col ${compact ? 'gap-2 sm:flex-row sm:items-end' : 'gap-3 sm:flex-row sm:items-end'}`}>
        <div className={compact ? 'w-full sm:max-w-[10.5rem]' : 'w-full max-w-[11rem] shrink-0'}>
          <label htmlFor={`${idPrefix}-date`} className={labelClass}>
            Data
          </label>
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={datePart}
            onChange={(e) => commit(e.target.value, timePart)}
            className={`${inputClass} ${compact ? '' : 'max-w-[11rem]'}`}
          />
        </div>
        <div className={compact ? 'w-full sm:max-w-[8.5rem]' : 'w-full max-w-[9rem] shrink-0 sm:w-auto'}>
          <label htmlFor={`${idPrefix}-time`} className={labelClass}>
            Hora
          </label>
          <input
            id={`${idPrefix}-time`}
            type="time"
            value={timePart}
            onChange={(e) => commit(datePart, e.target.value)}
            className={`${inputClass} ${compact ? '' : 'max-w-[9rem]'}`}
          />
        </div>
      </div>
      {!compact && <p className="text-xs text-cdl-gray-text">A hora é opcional.</p>}
    </div>
  );
}
