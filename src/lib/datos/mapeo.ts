import type { NombreColeccion } from './entidades';

/** Nombre de la tabla en la base de datos para cada colección. */
export const TABLA: Record<NombreColeccion, string> = {
  companies: 'companies',
  contacts: 'contacts',
  deals: 'deals',
  projects: 'projects',
  deliverables: 'deliverables',
  tasks: 'tasks',
  events: 'events',
  notes: 'notes',
  activities: 'activities',
  files: 'files',
};

const aSnake = (k: string) => k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
const aCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Columnas de la base de datos que la app aún no usa (se dejan en paz). */
const IGNORAR = new Set(['workspace_id', 'updated_at', 'brand', 'brief', 'portfolio']);
/** Campos de la app que no son columnas (se guardan aparte). */
const NO_COLUMNA = new Set(['collaborators']);

/** Fila de la base de datos → objeto de la app. */
export function deFila(fila: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fila)) {
    if (IGNORAR.has(k)) continue;
    o[aCamel(k)] = v;
  }
  return o;
}

/** Objeto (o cambios) de la app → columnas de la base de datos. */
export function aFila(obj: Record<string, unknown>): Record<string, unknown> {
  const f: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (NO_COLUMNA.has(k) || v === undefined) continue;
    f[aSnake(k)] = v;
  }
  return f;
}
