import { FASES_OPORTUNIDAD } from '@/lib/catalogos/crm';
import { esDisciplina } from '@/lib/catalogos/disciplinas';
import { PLANTILLAS, esPlantilla } from '@/lib/catalogos/plantillas';
import type { Colecciones, Entregable, FaseOportunidad, FaseProyecto, Fecha, Id, Oportunidad, Proyecto, Tarea } from '@/lib/datos/entidades';
import { sumarDias } from './fechas';

/** En marcha = ni entregado ni en pausa (isActiveP del prototipo). */
export const enMarcha = (p: Pick<Proyecto, 'status'>) => p.status !== 'entregado' && p.status !== 'pausa';

/** Tareas hechas / totales del proyecto (progressOf del prototipo). */
export function progreso(tareas: Tarea[], projectId: Id) {
  const ts = tareas.filter((t) => t.projectId === projectId);
  const hechas = ts.filter((t) => t.done).length;
  return { hechas, total: ts.length, pct: ts.length ? Math.round((hechas / ts.length) * 100) : 0 };
}

/** Cambios al pulsar una fase (o pausar / reanudar). Al pausar se recuerda la fase para volver a ella. */
export function cambiosDeFase(p: Pick<Proyecto, 'status' | 'prevStatus'>, fase: FaseProyecto): Partial<Proyecto> {
  if (fase === p.status) return {};
  if (fase === 'pausa') return { status: 'pausa', prevStatus: p.status };
  return { status: fase, prevStatus: null };
}

/** A qué fase vuelve un proyecto en pausa al reanudarlo. */
export const faseAlReanudar = (p: Pick<Proyecto, 'prevStatus'>): FaseProyecto =>
  p.prevStatus && p.prevStatus !== 'pausa' ? p.prevStatus : 'produccion';

type Creado = { tasks: Tarea[]; deliverables: Entregable[] };

/**
 * Tareas (con fecha desde el inicio del proyecto) y entregables de una plantilla (applyTemplate del prototipo).
 * Si la clave no es una plantilla, no crea nada.
 */
export function aplicarPlantilla(p: Pick<Proyecto, 'id' | 'start' | 'contactId'>, clave: string, hoy: Fecha, nuevoId: () => Id, ahora: string): Creado {
  if (!esPlantilla(clave)) return { tasks: [], deliverables: [] };
  const T = PLANTILLAS[clave];
  const inicio = p.start || hoy;
  return {
    tasks: T.tasks.map(([title, phase, dia]) => ({
      id: nuevoId(),
      title,
      due: sumarDias(inicio, dia),
      urgent: false,
      important: true,
      done: false,
      projectId: p.id,
      contactId: p.contactId,
      assigneeId: null,
      estimate: 2,
      repeat: '',
      blockedBy: null,
      nextCreated: false,
      phase,
      createdAt: ahora,
    })),
    deliverables: T.dlv.map((name) => ({
      id: nuevoId(),
      projectId: p.id,
      name,
      status: 'en_curso',
      sentAt: null,
      approvedAt: null,
      billedExtra: 0,
      createdAt: ahora,
    })),
  };
}

export type ResultadoFaseOportunidad = {
  cambios: Partial<Oportunidad>;
  /** Proyecto nuevo (con sus tareas y entregables) si se acaba de ganar y aún no tenía. */
  proyecto: (Creado & { project: Proyecto; plantilla: string | null }) | null;
};

/**
 * Mover una oportunidad de fase (setDealStage del prototipo, SPEC §6.3 y flujo de la Fase 1).
 * · Cambia la probabilidad a la de la fase (salvo que venga del formulario, donde la pone la persona).
 * · Ganado/Perdido guardan la fecha de cierre; volver a abrirla la quita.
 * · Ganada sin proyecto → crea el proyecto con la plantilla de su disciplina (tareas y entregables con fecha).
 */
export function moverOportunidad(
  d: Oportunidad,
  fase: FaseOportunidad,
  ctx: { c: Pick<Colecciones, 'contacts'>; hoy: Fecha; tarifa: number; nuevoId: () => Id; ahora: string; desdeFormulario?: boolean },
): ResultadoFaseOportunidad {
  const cerrada = fase === 'ganado' || fase === 'perdido';
  const cambios: Partial<Oportunidad> = { stage: fase };
  if (!ctx.desdeFormulario || cerrada) cambios.prob = FASES_OPORTUNIDAD[fase].p;
  cambios.closedAt = cerrada ? (d.stage === fase && d.closedAt ? d.closedAt : ctx.hoy) : null;
  if (fase !== 'perdido') cambios.lostReason = '';

  if (fase !== 'ganado' || d.projectId) return { cambios, proyecto: null };

  const clave = d.discipline && esPlantilla(d.discipline) ? d.discipline : null;
  const T = clave ? PLANTILLAS[clave] : null;
  const contactId = d.contactId ?? ctx.c.contacts.find((x) => d.companyId && x.companyId === d.companyId)?.id ?? null;
  const ultimoDia = T ? Math.max(...T.tasks.map((t) => t[2])) : 0;
  const project: Proyecto = {
    id: ctx.nuevoId(),
    name: d.title,
    contactId,
    discipline: d.discipline && esDisciplina(d.discipline) ? d.discipline : null,
    start: ctx.hoy,
    end: sumarDias(ctx.hoy, T ? Math.max(30, ultimoDia + 5) : 45),
    status: 'briefing',
    prevStatus: null,
    priority: 'media',
    budget: d.value,
    hoursBudget: T?.hours ?? (ctx.tarifa > 0 ? Math.round(d.value / ctx.tarifa) : 0),
    roundsIncluded: T?.rounds ?? 2,
    description: d.notes,
    tags: [],
    collaborators: [],
    createdAt: ctx.ahora,
  };
  cambios.projectId = project.id;
  const creado = clave ? aplicarPlantilla(project, clave, ctx.hoy, ctx.nuevoId, ctx.ahora) : { tasks: [], deliverables: [] };
  return { cambios, proyecto: { project, plantilla: T?.label ?? null, ...creado } };
}

/** Oportunidades visibles en el tablero: las abiertas y las cerradas en los últimos 90 días. */
export function enTablero(d: Oportunidad, hoy: Fecha): boolean {
  if (d.stage !== 'ganado' && d.stage !== 'perdido') return true;
  return !d.closedAt || d.closedAt >= sumarDias(hoy, -90);
}

/** Cifras de Oportunidades (SPEC §6.3). */
export function cifrasOportunidades(deals: Oportunidad[], hoy: Fecha) {
  const abiertas = deals.filter((d) => d.stage !== 'ganado' && d.stage !== 'perdido');
  const desde = sumarDias(hoy, -90);
  const cerradas = deals.filter((d) => d.closedAt && d.closedAt >= desde);
  const ganadas = cerradas.filter((d) => d.stage === 'ganado');
  const perdidas = cerradas.filter((d) => d.stage === 'perdido');
  const decididas = ganadas.length + perdidas.length;
  return {
    enJuego: abiertas.reduce((a, d) => a + d.value, 0),
    abiertas: abiertas.length,
    ponderado: Math.round(abiertas.reduce((a, d) => a + (d.value * d.prob) / 100, 0)),
    ganado90: ganadas.reduce((a, d) => a + d.value, 0),
    ganadas90: ganadas.length,
    tasa: decididas ? Math.round((ganadas.length / decididas) * 100) : 0,
  };
}
