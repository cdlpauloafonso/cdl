function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function normalizeTimeForInput(h: string, m: string): string {
  const hh = Math.min(23, Math.max(0, parseInt(h, 10) || 0));
  const mm = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
  return `${pad2(hh)}:${pad2(mm)}`;
}

function decodeEventDateTime(raw: string | undefined): { date: string; time: string } {
  const s = (raw ?? '').trim();
  if (!s) return { date: '', time: '' };

  const isoDt = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoDt) {
    return {
      date: isoDt[1],
      time: normalizeTimeForInput(isoDt[2], isoDt[3]),
    };
  }

  const isoDateOnly = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (isoDateOnly) return { date: isoDateOnly[1], time: '' };

  return { date: '', time: '' };
}

/** Data e horário separados para certificados PDF. */
export function formatCertificateEventSchedule(raw?: string): {
  dateLine: string;
  timeLine: string | null;
} {
  const s = (raw ?? '').trim();
  if (!s) return { dateLine: '', timeLine: null };

  const { date, time } = decodeEventDateTime(s);
  if (date) {
    const y = parseInt(date.slice(0, 4), 10);
    const mo = parseInt(date.slice(5, 7), 10) - 1;
    const day = parseInt(date.slice(8, 10), 10);
    const dt = new Date(y, mo, day);
    const rawDateLine = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dt);
    const dateLine = rawDateLine.charAt(0).toUpperCase() + rawDateLine.slice(1);
    const timeLine = time ? time.replace(':', 'h') : null;
    return { dateLine, timeLine };
  }

  return { dateLine: s, timeLine: null };
}
