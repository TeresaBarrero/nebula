import type { Disciplina } from '@/lib/catalogos/disciplinas';
import type { Colecciones, Fecha, Id } from '@/lib/datos/entidades';
import { r2 } from './dinero';
import { dineroProyecto, emitidas, totales } from './facturas';
import { aFecha, iso, sumarDias } from './fechas';

export type Mes = { clave: string; label: string; ingresos: number; gastos: number };

/** Ingresos (facturas emitidas, sin IVA) y gastos (sin IVA) de los últimos 6 meses, del más antiguo al actual. */
export function ingresosYGastos(c: Pick<Colecciones, 'invoices' | 'expenses'>, hoy: Fecha, n = 6): Mes[] {
  const d = aFecha(hoy);
  const meses: Mes[] = Array.from({ length: n }, (_, i) => {
    const m = new Date(d.getFullYear(), d.getMonth() - (n - 1 - i), 1);
    return { clave: iso(m).slice(0, 7), label: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(m).replace('.', ''), ingresos: 0, gastos: 0 };
  });
  const de = (f: Fecha) => meses.find((m) => m.clave === f.slice(0, 7));
  for (const f of emitidas(c.invoices)) {
    const m = de(f.date);
    if (m) m.ingresos = r2(m.ingresos + totales(f).base);
  }
  for (const g of c.expenses) {
    const m = de(g.date);
    if (m) m.gastos = r2(m.gastos + (Number(g.base) || 0));
  }
  return meses;
}

/** Disciplina de una factura: la de su proyecto o la de su iguala. */
function disciplinaDe(c: Pick<Colecciones, 'projects' | 'retainers'>, f: { projectId: Id | null; retainerId: Id | null }): Disciplina | null {
  return c.projects.find((p) => p.id === f.projectId)?.discipline ?? c.retainers.find((r) => r.id === f.retainerId)?.discipline ?? null;
}

/** Facturado, horas y € por hora real por disciplina en los últimos 180 días. */
export function porDisciplina(c: Pick<Colecciones, 'invoices' | 'projects' | 'retainers'> & Partial<Pick<Colecciones, 'timeEntries'>>, hoy: Fecha) {
  const desde = sumarDias(hoy, -180);
  const suma = new Map<Disciplina, { facturado: number; min: number }>();
  const de = (d: Disciplina) => suma.get(d) ?? suma.set(d, { facturado: 0, min: 0 }).get(d)!;
  for (const f of emitidas(c.invoices)) {
    if (f.date < desde) continue;
    const d = disciplinaDe(c, f);
    if (d) de(d).facturado = r2(de(d).facturado + totales(f).base);
  }
  for (const e of c.timeEntries ?? []) {
    if (e.date < desde) continue;
    const d = disciplinaDe(c, e);
    if (d) de(d).min += e.minutes;
  }
  return [...suma.entries()]
    .map(([k, x]) => ({ k, facturado: x.facturado, min: x.min, eurh: x.min ? r2(x.facturado / (x.min / 60)) : 0 }))
    .sort((a, b) => b.facturado - a.facturado);
}

/** Lo que te deja cada proyecto con facturas o gastos, de más a menos margen. */
export function porProyecto(c: Pick<Colecciones, 'invoices' | 'expenses' | 'projects'>) {
  return c.projects
    .map((p) => ({ p, ...dineroProyecto(c, p.id) }))
    .filter((x) => x.facturado || x.gastos)
    .sort((a, b) => b.margen - a.margen);
}

/** Las 5 empresas a las que más has facturado en 180 días. */
export function mejoresClientes(c: Pick<Colecciones, 'invoices' | 'companies'>, hoy: Fecha) {
  const desde = sumarDias(hoy, -180);
  return c.companies
    .map((e) => ({ e, facturado: r2(emitidas(c.invoices).filter((f) => f.companyId === e.id && f.date >= desde).reduce((a, f) => a + totales(f).base, 0)) }))
    .filter((x) => x.facturado > 0)
    .sort((a, b) => b.facturado - a.facturado)
    .slice(0, 5);
}
