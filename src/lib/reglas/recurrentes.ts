import type { Fecha, Iguala, Renovacion } from '@/lib/datos/entidades';
import { aFecha, diasHasta, sumarMeses } from './fechas';

/** Mes «YYYY-MM» de una fecha. */
export const mesDe = (f: Fecha) => f.slice(0, 7);
export const nombreMes = (f: Fecha) => new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(aFecha(f));

/** Ya tiene factura de este mes. */
export const igualaFacturada = (r: Pick<Iguala, 'lastBilled'>, hoy: Fecha) => r.lastBilled === mesDe(hoy);

/** «Por facturar» (SPEC §7.14): activa, sin factura este mes y hoy ≥ día de facturación (o fin de mes si el día no existe). */
export function igualaPorFacturar(r: Pick<Iguala, 'active' | 'lastBilled' | 'billingDay'>, hoy: Fecha): boolean {
  if (!r.active || igualaFacturada(r, hoy)) return false;
  const d = aFecha(hoy);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getDate() >= Math.min(r.billingDay, ultimoDia);
}

/** Ingresos fijos al mes: suma de las cuotas de igualas activas. */
export const ingresosFijos = (rs: Iguala[]) => rs.filter((r) => r.active).reduce((a, r) => a + r.fee, 0);

export type EstadoRenovacion = { k: 'vencida' | 'pronto' | 'ok'; label: string; cls: 'rose' | 'butter' | 'sage' };

/** Caducada / Renueva pronto (≤ 30 días) / Al día (rnState del prototipo). */
export function estadoRenovacion(n: Pick<Renovacion, 'renewDate'>, hoy: Fecha): EstadoRenovacion {
  const d = diasHasta(n.renewDate, hoy);
  if (d < 0) return { k: 'vencida', label: 'Caducada', cls: 'rose' };
  if (d <= 30) return { k: 'pronto', label: 'Renueva pronto', cls: 'butter' };
  return { k: 'ok', label: 'Al día', cls: 'sage' };
}

/** Nueva fecha al renovar (SPEC §7.15): +1 año desde la fecha de renovación, o desde hoy si ya había caducado. */
export function siguienteRenovacion(n: Pick<Renovacion, 'renewDate'>, hoy: Fecha): Fecha {
  return sumarMeses(diasHasta(n.renewDate, hoy) < 0 ? hoy : n.renewDate, 12);
}
