import type { Fecha } from '@/lib/datos/entidades';

const dos = (n: number) => String(n).padStart(2, '0');

/** Date → «YYYY-MM-DD» en hora local. */
export function iso(d: Date): Fecha {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** «YYYY-MM-DD» → Date a medianoche local. */
export function aFecha(s: Fecha): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function hoy(ahora: Date = new Date()): Fecha {
  return iso(ahora);
}

export function sumarDias(desde: Fecha, n: number): Fecha {
  const d = aFecha(desde);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Suma meses respetando fin de mes (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(desde: Fecha, n: number): Fecha {
  const d = aFecha(desde);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return iso(d);
}

/** Días desde `ref` hasta `f` (negativo si ya pasó). */
export function diasHasta(f: Fecha, ref: Fecha): number {
  return Math.round((aFecha(f).getTime() - aFecha(ref).getTime()) / 864e5);
}

/** Lunes de la semana de esa fecha (la semana empieza en lunes). */
export function lunesDe(f: Fecha): Fecha {
  const d = aFecha(f);
  return sumarDias(f, -((d.getDay() + 6) % 7));
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', o);
const fCorta = fmt({ day: 'numeric', month: 'short' });
const fDiaSemana = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const fLarga = fmt({ day: 'numeric', month: 'long', year: 'numeric' });

export const fechaCorta = (f: Fecha | null) => (f ? fCorta.format(aFecha(f)) : '—');
export const fechaLargaDe = (f: Fecha | null) => (f ? fLarga.format(aFecha(f)) : '—');

/** «Hoy», «Mañana», «Ayer», «vie 14 nov» (esta semana) o «14 nov». Como relD() del prototipo. */
export function relativa(f: Fecha | null, ref: Fecha = hoy()): string {
  if (!f) return '';
  const n = diasHasta(f, ref);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  if (n > 1 && n < 7) return fDiaSemana.format(aFecha(f));
  return fCorta.format(aFecha(f));
}
