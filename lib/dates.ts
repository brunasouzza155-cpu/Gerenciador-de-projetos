// Utilitários de data. Datas circulam como texto "AAAA-MM-DD" para evitar
// problemas de fuso horário; só viram Date na hora de calcular.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addMonths(iso: string, months: number): string {
  const d = fromISO(iso);
  d.setMonth(d.getMonth() + months);
  return toISO(d);
}

/** Diferença em dias (b - a). Positivo se b é depois de a. */
export function diffDays(a: string, b: string): number {
  const ms = fromISO(b).getTime() - fromISO(a).getTime();
  return Math.round(ms / 86400000);
}

/** Formata "AAAA-MM-DD" como "12/06" */
export function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** Formata "AAAA-MM-DD" como "12/06/26" */
export function fmtFull(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export const WEEKDAYS_PT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const MONTHS_PT_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Segunda-feira da semana em que `iso` cai. */
export function mondayOf(iso: string): string {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

/** Primeiro dia do mês de `iso`. */
export function monthStart(iso: string): string {
  return iso.slice(0, 8) + "01";
}

/** Quantos dias tem o mês de `iso`. */
export function daysInMonth(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Data longa por extenso: "quinta-feira, 12 de junho de 2026" */
export function fmtLong(iso: string): string {
  const d = fromISO(iso);
  const week = [
    "domingo", "segunda-feira", "terça-feira", "quarta-feira",
    "quinta-feira", "sexta-feira", "sábado",
  ];
  return `${week[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}
