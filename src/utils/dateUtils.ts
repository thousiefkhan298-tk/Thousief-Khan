import { format } from 'date-fns';

export function safeFormat(dateVal: any, formatStr: string, fallback: string = ''): string {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback || String(dateVal);
    return format(d, formatStr);
  } catch {
    return fallback || String(dateVal);
  }
}
