'use client';

import { useEffect, useState } from 'react';

/** Início das atividades — 11/06/2026, 17h30 (horário de Brasília). */
const EVENT_START = new Date('2026-06-11T17:30:00-03:00');

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calcTimeLeft(): TimeLeft | null {
  const diff = EVENT_START.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-sky-400/20 bg-slate-900/50 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
      <span className="tabular-nums text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-300/80 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export function EventCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeLeft(calcTimeLeft());
    const id = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-4 gap-3 sm:gap-6">
        {['Dias', 'Horas', 'Minutos', 'Segundos'].map((label) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-xl border border-sky-400/10 bg-slate-900/30 px-3 py-4 sm:px-5 sm:py-5"
          >
            <span className="text-3xl font-semibold text-white/30 sm:text-4xl">--</span>
            <span className="mt-1 text-[10px] uppercase tracking-widest text-sky-300/40">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <p className="text-center text-lg font-medium text-sky-200 sm:text-xl">
        O evento está em andamento — nos vemos no Auditório da UNIRIOS!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-6">
      <Unit value={timeLeft.days} label="Dias" />
      <Unit value={timeLeft.hours} label="Horas" />
      <Unit value={timeLeft.minutes} label="Minutos" />
      <Unit value={timeLeft.seconds} label="Segundos" />
    </div>
  );
}
