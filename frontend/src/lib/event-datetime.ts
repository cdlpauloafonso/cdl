/** Campo único `Campaign.date`: ISO local `YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm`. */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function normalizeTimeForInput(h: string, m: string): string {
  const hh = Math.min(23, Math.max(0, parseInt(h, 10) || 0));
  const mm = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
  return `${pad2(hh)}:${pad2(mm)}`;
}

export function decodeEventDateTime(raw: string | undefined): { date: string; time: string } {
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
  if (isoDateOnly) {
    return { date: isoDateOnly[1], time: '' };
  }

  const br = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (br) {
    let y = parseInt(br[3], 10);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    const day = pad2(parseInt(br[1], 10));
    const month = pad2(parseInt(br[2], 10));
    const date = `${y}-${month}-${day}`;
    const time =
      br[4] != null && br[5] != null ? normalizeTimeForInput(br[4], br[5]) : '';
    return { date, time };
  }

  return { date: '', time: '' };
}

export function encodeEventDateTime(dateYmd: string, timeHm: string): string {
  const d = dateYmd.trim();
  const t = timeHm.trim();
  if (!d) return '';
  if (!t) return d;
  return `${d}T${t}`;
}

/** Exibição amigável em pt-BR; texto livre não reconhecido é devolvido como está. */
export function formatEventDateForDisplay(raw?: string): string {
  const s = (raw ?? '').trim();
  if (!s) return '';

  const isoDt = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})/);
  if (isoDt) {
    const y = parseInt(isoDt[1].slice(0, 4), 10);
    const mo = parseInt(isoDt[1].slice(5, 7), 10) - 1;
    const day = parseInt(isoDt[1].slice(8, 10), 10);
    const hh = parseInt(isoDt[2], 10);
    const mm = parseInt(isoDt[3], 10);
    const dt = new Date(y, mo, day, hh, mm);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(dt);
  }

  const isoDate = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (isoDate) {
    const y = parseInt(isoDate[1].slice(0, 4), 10);
    const mo = parseInt(isoDate[1].slice(5, 7), 10) - 1;
    const day = parseInt(isoDate[1].slice(8, 10), 10);
    const dt = new Date(y, mo, day);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(dt);
  }

  return s;
}
