import type { DataISO } from './registro';

const DIA_MS = 86_400_000;

/** Data local de hoje no formato AAAA-MM-DD. */
export function hojeISO(agora: Date = new Date()): DataISO {
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function paraUTC(data: DataISO): number {
  const [y, m, d] = data.slice(0, 10).split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Dias corridos de `de` até `ate` (negativo se `ate` já passou). */
export function diasEntre(de: DataISO, ate: DataISO): number {
  return Math.round((paraUTC(ate) - paraUTC(de)) / DIA_MS);
}

export function somarDias(data: DataISO, dias: number): DataISO {
  return new Date(paraUTC(data) + dias * DIA_MS).toISOString().slice(0, 10);
}

export function somarMeses(data: DataISO, meses: number): DataISO {
  const [y, m, d] = data.slice(0, 10).split('-').map(Number);
  const alvo = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d ?? 1, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

export function formatarData(data: DataISO | null | undefined): string {
  if (!data) return '—';
  const [y, m, d] = data.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  return new Date(paraUTC(data)).toISOString().slice(0, 10) === data;
}

/** Data e hora de um instante ISO no horário local: "29/10/2026 18:05". */
export function formatarDataHora(instante: string): string {
  const d = new Date(instante);
  if (Number.isNaN(d.getTime())) return '';
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}
