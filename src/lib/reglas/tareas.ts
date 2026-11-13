import type { Cuadrante } from '@/lib/catalogos/crm';
import type { Fecha, Id, Repeticion, Tarea } from '@/lib/datos/entidades';
import { diasHasta, sumarDias, sumarMeses } from './fechas';

export const REPETICIONES: Record<Exclude<Repeticion, ''>, { label: string }> = {
  diaria: { label: 'Cada día' },
  semanal: { label: 'Cada semana' },
  mensual: { label: 'Cada mes' },
};

/** Cuadrante de la matriz (SPEC §5): urgente/importante. */
export function cuadranteDe(t: Pick<Tarea, 'urgent' | 'important'>): Cuadrante {
  return t.urgent && t.important ? 'q1' : t.important ? 'q2' : t.urgent ? 'q3' : 'q4';
}

/** Tarea que impide completar esta (si la de la que depende no está hecha). SPEC §7.13. */
export function bloqueante(t: Tarea, tareas: Tarea[]): Tarea | null {
  if (!t.blockedBy || t.done) return null;
  const b = tareas.find((x) => x.id === t.blockedBy);
  return b && !b.done ? b : null;
}

/** Fecha de la siguiente repetición: +1 día, +7 días o +1 mes desde su fecha (o desde hoy si ya pasó). */
export function siguienteFecha(t: Pick<Tarea, 'due' | 'repeat'>, hoy: Fecha): Fecha | null {
  if (!t.repeat) return null;
  const base = t.due && diasHasta(t.due, hoy) >= 0 ? t.due : hoy;
  if (t.repeat === 'mensual') return sumarMeses(base, 1);
  return sumarDias(base, t.repeat === 'diaria' ? 1 : 7);
}

export type ResultadoMarcar =
  | { ok: false; aviso: string }
  | {
      ok: true;
      /** Cambios a guardar en la tarea marcada. */
      cambios: Partial<Tarea>;
      /** Tarea nueva si se repite. */
      siguiente: Tarea | null;
      /** Tareas que quedan libres al terminar esta. */
      liberadas: Tarea[];
      mensaje: string;
    };

/**
 * Marcar o desmarcar una tarea como hecha (SPEC §7.13).
 * · Bloqueada → no se puede: «Primero hay que terminar «X»».
 * · Si se repite, crea la siguiente una sola vez (nextCreated).
 * · Al terminar la bloqueante: «Ya puedes empezar «Y»».
 */
export function marcarTarea(t: Tarea, tareas: Tarea[], hoy: Fecha, nuevoId: () => Id, formatearFecha: (f: Fecha) => string): ResultadoMarcar {
  if (t.done) return { ok: true, cambios: { done: false }, siguiente: null, liberadas: [], mensaje: 'Tarea pendiente otra vez' };
  const b = bloqueante(t, tareas);
  if (b) return { ok: false, aviso: `Primero hay que terminar «${b.title}»` };

  let siguiente: Tarea | null = null;
  const cambios: Partial<Tarea> = { done: true };
  if (t.repeat && !t.nextCreated) {
    const due = siguienteFecha(t, hoy);
    siguiente = { ...t, id: nuevoId(), done: false, due, nextCreated: false, createdAt: new Date().toISOString() };
    cambios.nextCreated = true;
  }
  const liberadas = tareas.filter((x) => x.blockedBy === t.id && !x.done);
  const mensaje = siguiente?.due
    ? `Hecha. La siguiente es el ${formatearFecha(siguiente.due)}`
    : liberadas.length
      ? `Hecha. Ya puedes empezar «${liberadas[0].title}»`
      : 'Tarea hecha';
  return { ok: true, cambios, siguiente, liberadas, mensaje };
}

/** Ordena tareas abiertas: primero las atrasadas y las de fecha más próxima; sin fecha al final. */
export function porFecha(a: Tarea, b: Tarea): number {
  return Number(a.done) - Number(b.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999');
}
