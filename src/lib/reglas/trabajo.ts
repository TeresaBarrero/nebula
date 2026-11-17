import { CAPACIDAD } from '@/lib/catalogos/trabajo';
import type {
  Brief,
  CasoPortfolio,
  Colecciones,
  Contacto,
  Cronometro,
  Empresa,
  Entregable,
  Fecha,
  HoraTrabajada,
  Id,
  Iguala,
  LineaFactura,
  Marca,
  Proyecto,
  Tarea,
} from '@/lib/datos/entidades';
import { r2 } from './dinero';
import { emitidas, totales } from './facturas';
import { diasHasta, lunesDe, sumarDias } from './fechas';
import { mesDe } from './recurrentes';

// ───────── Valores que pueden faltar en datos antiguos ─────────

export const briefDe = (p: Pick<Proyecto, 'brief'>): Brief => ({ status: 'pendiente', sentDate: null, answers: {}, ...(p.brief ?? {}) });
export const portfolioDe = (p: Pick<Proyecto, 'portfolio'>): CasoPortfolio => ({ featured: false, permission: false, summary: '', results: '', link: '', ...(p.portfolio ?? {}) });
export const marcaDe = (e: Pick<Empresa, 'brand'>): Marca => ({ colors: '', fonts: '', tone: '', manual: '', ...(e.brand ?? {}) });
export const versionesDe = (v: Entregable) => v.versions ?? [];
export const rondasPedidas = (v: Entregable) => v.feedback ?? [];

/** Colores HEX que aparecen en el texto del kit de marca («#2F3E46, #84A98C»). */
export const coloresDe = (m: Pick<Marca, 'colors'>) => (m.colors.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) ?? []).map((x) => x.toUpperCase());

// ───────── Entregables y rondas de cambios (SPEC §7.7) ─────────

/** Rondas incluidas, usadas, extra y extra que aún no has cobrado. */
export function rondasDe(v: Entregable, p: Pick<Proyecto, 'roundsIncluded'> | undefined) {
  const incluidas = p?.roundsIncluded ?? 2;
  const usadas = rondasPedidas(v).length;
  const extra = Math.max(0, usadas - incluidas);
  return { incluidas, usadas, extra, porCobrar: Math.max(0, extra - (v.billedExtra || 0)) };
}

/** «Enviar versión N»: queda esperando al cliente. */
export function enviarVersion(v: Entregable, hoy: Fecha): Partial<Entregable> {
  const vs = versionesDe(v);
  return { versions: [...vs, { v: vs.length + 1, date: hoy }], status: 'enviado', sentAt: hoy, approvedAt: null };
}

/** «Pide cambios»: añade una ronda. */
export function pedirCambios(v: Entregable, texto: string, hoy: Fecha): Partial<Entregable> {
  return { feedback: [...rondasPedidas(v), { date: hoy, text: texto.trim().slice(0, 1000) || 'Cambios solicitados' }], status: 'cambios' };
}

export const aprobarEntregable = (hoy: Fecha): Partial<Entregable> => ({ status: 'aprobado', approvedAt: hoy });

/** Línea de factura por las rondas extra sin cobrar y el nuevo contador (para no cobrarlas dos veces). */
export function cobroDeRondas(v: Entregable, p: Pick<Proyecto, 'roundsIncluded'> | undefined, precioRonda: number): { linea: LineaFactura; billedExtra: number } | null {
  const r = rondasDe(v, p);
  if (r.porCobrar <= 0) return null;
  return { linea: { desc: `Ronda de cambios extra · ${v.name}`, qty: r.porCobrar, price: precioRonda }, billedExtra: r.extra };
}

/** Historial del entregable: versiones, rondas (las extra en rosa) y aprobación, por fecha. */
export function historiaEntregable(v: Entregable, p: Pick<Proyecto, 'roundsIncluded'> | undefined) {
  const inc = p?.roundsIncluded ?? 2;
  return [
    ...versionesDe(v).map((x) => ({ fecha: x.date, texto: `Enviada la versión ${x.v}`, cls: 'butter' })),
    ...rondasPedidas(v).map((f, k) => ({ fecha: f.date, texto: `Ronda ${k + 1}: ${f.text}`, cls: k >= inc ? 'rose' : 'peach' })),
    ...(v.status === 'aprobado' && v.approvedAt ? [{ fecha: v.approvedAt, texto: 'Aprobado por el cliente', cls: 'sage' }] : []),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ───────── Horas ─────────

/** «2,5 h» */
export const horas = (min: number) => `${(Math.round(((min || 0) / 60) * 10) / 10).toLocaleString('es-ES')} h`;
/** «1 h 30 min» o «45 min». */
export function duracion(min: number) {
  const m = Math.round(min || 0);
  const h = Math.floor(m / 60);
  return h ? `${h} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`;
}
export const minutos = (es: HoraTrabajada[], f: (e: HoraTrabajada) => boolean = () => true) => es.filter(f).reduce((a, e) => a + (e.minutes || 0), 0);

/** Horas, € por hora real y si se pasa de lo previsto en un proyecto. */
export function horasProyecto(c: Pick<Colecciones, 'timeEntries' | 'invoices'>, p: Pick<Proyecto, 'id' | 'hoursBudget'>) {
  const min = minutos(c.timeEntries, (e) => e.projectId === p.id);
  const facturado = emitidas(c.invoices).filter((f) => f.projectId === p.id).reduce((a, f) => a + totales(f).base, 0);
  return {
    min,
    pct: p.hoursBudget ? (min / 60 / p.hoursBudget) * 100 : 0,
    sePasa: Boolean(p.hoursBudget && min / 60 > p.hoursBudget),
    eurh: min && facturado ? r2(facturado / (min / 60)) : 0,
  };
}

/** € por hora real de los últimos 6 meses: lo facturado de proyectos e igualas entre las horas para clientes. */
export function eurHoraReal(c: Pick<Colecciones, 'timeEntries' | 'invoices'>, hoy: Fecha) {
  const desde = sumarDias(hoy, -180);
  const facturado = emitidas(c.invoices).filter((f) => f.date >= desde && (f.projectId || f.retainerId)).reduce((a, f) => a + totales(f).base, 0);
  const min = minutos(c.timeEntries, (e) => e.date >= desde && e.billable);
  return min ? r2(facturado / (min / 60)) : 0;
}

/** Minutos de una iguala en el mes de `hoy`. */
export const minutosIguala = (c: Pick<Colecciones, 'timeEntries'>, r: Pick<Iguala, 'id'>, hoy: Fecha) =>
  minutos(c.timeEntries, (e) => e.retainerId === r.id && mesDe(e.date) === mesDe(hoy));

/** Horas de más de una iguala este mes (redondeadas a 2 decimales) si aún no se han cobrado este mes (SPEC §7.14). */
export function horasDeMas(c: Pick<Colecciones, 'timeEntries'>, r: Iguala, hoy: Fecha): number {
  if (r.extraBilled === mesDe(hoy)) return 0;
  const extra = r2(minutosIguala(c, r, hoy) / 60 - r.hours);
  return extra > 0.05 ? extra : 0;
}

/** Nombre de a qué se dedicó el tiempo. */
export function destinoDe(c: Pick<Colecciones, 'projects' | 'retainers'>, x: { projectId: Id | null; retainerId: Id | null }) {
  if (x.projectId) return c.projects.find((p) => p.id === x.projectId)?.name ?? 'Proyecto';
  if (x.retainerId) return c.retainers.find((r) => r.id === x.retainerId)?.name ?? 'Iguala';
  return 'Trabajo interno';
}

/** Al parar el cronómetro: la entrada de horas (mínimo 1 minuto, máximo 24 h). */
export function entradaDeCronometro(t: Cronometro, ahora: Date, hoy: Fecha, tareas: Tarea[], id: Id): HoraTrabajada {
  const min = Math.min(1440, Math.max(1, Math.round((ahora.getTime() - new Date(t.start).getTime()) / 60000)));
  return {
    id,
    date: hoy,
    minutes: min,
    projectId: t.projectId,
    retainerId: t.projectId ? null : t.retainerId,
    taskId: t.taskId,
    note: (t.note || tareas.find((x) => x.id === t.taskId)?.title || '').slice(0, 300),
    billable: Boolean(t.projectId || t.retainerId),
    createdAt: ahora.toISOString(),
  };
}

/** «01:23:45» para el cronómetro de la barra superior. */
export function reloj(desde: string, ahora: Date) {
  const s = Math.max(0, Math.floor((ahora.getTime() - new Date(desde).getTime()) / 1000));
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
}

// ───────── Carga de trabajo (SPEC §7.8) ─────────

export type Semana = { a: Fecha; b: Fecha; i: number };

/** Las próximas n semanas desde el lunes de esta. */
export function semanas(hoy: Fecha, n = 4): Semana[] {
  const lunes = lunesDe(hoy);
  return Array.from({ length: n }, (_, i) => ({ a: sumarDias(lunes, i * 7), b: sumarDias(lunes, i * 7 + 6), i }));
}

/** Capacidad semanal: yo = la de mi perfil; colaboradores según su disponibilidad. */
export const capacidadDe = (x: Pick<Contacto, 'availability'> | null, miCapacidad: number) => (x ? CAPACIDAD[x.availability ?? 'disponible'] : miCapacidad);

/**
 * Carga de una persona (null = yo) en una semana: suma de horas estimadas de sus tareas abiertas con fecha esa semana
 * (las atrasadas cuentan en la actual). Para mí se suman las horas de igualas activas / 4,3.
 */
export function cargaDe(c: Pick<Colecciones, 'tasks' | 'retainers'>, persona: Id | null, s: Semana) {
  const tareas = c.tasks.filter((t) => !t.done && t.due && t.assigneeId === persona && ((t.due >= s.a && t.due <= s.b) || (s.i === 0 && t.due < s.a)));
  let h = tareas.reduce((a, t) => a + (Number(t.estimate) || 2), 0);
  if (persona === null) h += c.retainers.filter((r) => r.active).reduce((a, r) => a + r.hours, 0) / 4.3;
  return { h: Math.round(h * 10) / 10, tareas };
}

/** Color de la carga: ≤ 80 % verde, ≤ 100 % melocotón, > 100 % rojo. */
export function colorCarga(h: number, capacidad: number): 'ok' | 'casi' | 'pasa' {
  const r = capacidad ? h / capacidad : h ? 2 : 0;
  return r > 1 ? 'pasa' : r > 0.8 ? 'casi' : 'ok';
}

/** «¿Puedes aceptar un proyecto de X h/semana?»: primera semana con hueco y colaboradores con ≥ 4 h libres esta semana. */
export function hueco(c: Pick<Colecciones, 'tasks' | 'retainers' | 'contacts'>, horasSemana: number, hoy: Fecha, miCapacidad: number) {
  const ss = semanas(hoy);
  const libres = ss.map((s) => ({ s, libres: miCapacidad - cargaDe(c, null, s).h }));
  const primera = libres.find((x) => x.libres >= horasSemana) ?? null;
  const ayudantes = c.contacts
    .filter((x) => x.type === 'Colaborador' && x.availability !== 'ocupado')
    .map((x) => ({ x, libres: capacidadDe(x, miCapacidad) - cargaDe(c, x.id, ss[0]).h }))
    .filter((a) => a.libres >= 4);
  return { primera, ayudantes };
}

// ───────── Contenidos y portfolio ─────────

export function cifrasContenidos(c: Pick<Colecciones, 'posts'>, hoy: Fecha) {
  const d = (f: Fecha) => diasHasta(f, hoy);
  const semana = c.posts.filter((p) => d(p.date) >= 0 && d(p.date) < 7);
  return {
    semana: semana.length,
    programadas: semana.filter((p) => p.status === 'programado' || p.status === 'publicado').length,
    revision: c.posts.filter((p) => p.status === 'revision').length,
    sinProgramar: c.posts.filter((p) => d(p.date) >= 0 && d(p.date) <= 1 && p.status !== 'programado' && p.status !== 'publicado').length,
    ideas: c.posts.filter((p) => p.status === 'idea').length,
  };
}

/** Texto del caso de éxito para pegar en la web o en una propuesta. */
export function textoCaso(p: Proyecto, cliente: string, disciplina: string) {
  const pf = portfolioDe(p);
  return [`${p.name}${disciplina ? ` (${disciplina})` : ''}`, cliente && `Cliente: ${cliente}`, pf.summary, pf.results && `Resultado: ${pf.results}`, pf.link].filter(Boolean).join('\n');
}
