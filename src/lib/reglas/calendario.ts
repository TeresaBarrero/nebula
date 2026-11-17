import type { Pastel } from '@/lib/catalogos/crm';
import type { Colecciones, Fecha } from '@/lib/datos/entidades';
import { iso } from './fechas';
import { estadoDe } from './facturas';
import { cuadranteDe } from './tareas';

/** Días que se ven en la cuadrícula de un mes: de lunes a domingo, 5 o 6 semanas (monthGrid del prototipo). */
export function diasDelMes(anio: number, mes: number): { fecha: Fecha; delMes: boolean }[] {
  const primero = new Date(anio, mes, 1);
  const desfase = (primero.getDay() + 6) % 7;
  const celdas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(anio, mes, 1 - desfase + i);
    return { fecha: iso(d), delMes: d.getMonth() === mes };
  });
  return celdas.slice(35).every((x) => !x.delMes) ? celdas.slice(0, 35) : celdas;
}

export type ElementoDia = { clave: string; texto: string; cls: Pastel };

/**
 * Lo que aparece en un día del calendario (SPEC §6.10): reuniones y tareas abiertas que vencen
 * (las urgentes e importantes en rosa), facturas sin cobrar que vencen y renovaciones.
 */
export function elementosDelDia(c: Pick<Colecciones, 'events' | 'tasks' | 'invoices' | 'payments' | 'renewals'>, f: Fecha, hoy: Fecha = f): ElementoDia[] {
  return [
    ...c.events
      .filter((e) => e.date === f)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((e) => ({ clave: 'e' + e.id, texto: `${e.time ? e.time + ' ' : ''}${e.title}`, cls: 'peach' as Pastel })),
    ...c.tasks
      .filter((t) => t.due === f && !t.done)
      .map((t) => ({ clave: 't' + t.id, texto: t.title, cls: (cuadranteDe(t) === 'q1' ? 'rose' : 'butter') as Pastel })),
    ...facturasQueVencen(c, f, hoy).map((x) => ({ clave: 'f' + x.id, texto: `Vence ${x.number}`, cls: 'lilac' as Pastel })),
    ...c.renewals.filter((n) => n.renewDate === f).map((n) => ({ clave: 'n' + n.id, texto: `Renueva ${n.name}`, cls: 'sand' as Pastel })),
  ];
}

/** Facturas emitidas que vencen ese día y aún no están pagadas. */
export function facturasQueVencen(c: Pick<Colecciones, 'invoices' | 'payments'>, f: Fecha, hoy: Fecha) {
  return c.invoices.filter((x) => x.kind === 'factura' && x.due === f && ['pendiente', 'parcial', 'vencida'].includes(estadoDe(c, x, hoy)));
}

/** Mes siguiente o anterior. */
export function moverMes(anio: number, mes: number, n: number): { anio: number; mes: number } {
  const d = new Date(anio, mes + n, 1);
  return { anio: d.getFullYear(), mes: d.getMonth() };
}
