import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import {
  COLORES_NOTA,
  DISPONIBILIDAD,
  ESTADOS_CONTACTO,
  FASES_OPORTUNIDAD,
  FUENTES,
  MOTIVOS_PERDIDA,
  NOMBRE_COLOR,
  TIPOS_CONTACTO,
  VIAS_PERMISO,
  type Pastel,
} from '@/lib/catalogos/crm';
import type { Colecciones, NombreColeccion } from '@/lib/datos/entidades';
import { REPETICIONES } from '@/lib/reglas/tareas';

export type TipoForm = 'contact' | 'company' | 'deal' | 'task' | 'event' | 'note';

export type Valores = Record<string, string | boolean>;

type Opcion = { v: string; label: string; cls?: Pastel };

export type Campo =
  | { tipo: 'seccion'; label: string; visible?: (v: Valores) => boolean }
  | {
      tipo: 'text' | 'email' | 'tel' | 'number' | 'date' | 'time' | 'textarea' | 'check' | 'flags';
      k: string;
      label: string;
      req?: boolean;
      full?: boolean;
      avanzado?: boolean;
      visible?: (v: Valores) => boolean;
      max?: number;
    }
  | {
      tipo: 'selectv' | 'pills';
      k: string;
      label: string;
      opciones: Opcion[];
      full?: boolean;
      avanzado?: boolean;
      visible?: (v: Valores) => boolean;
    }
  | {
      tipo: 'select';
      k: string;
      label: string;
      /** De qué lista salen las opciones. */
      de: Extract<NombreColeccion, 'contacts' | 'companies' | 'projects' | 'tasks'>;
      vacio?: string;
      filtro?: (fila: Record<string, unknown>, v: Valores) => boolean;
      full?: boolean;
      avanzado?: boolean;
      visible?: (v: Valores) => boolean;
    };

export type Definicion = { col: NombreColeccion; nuevo: string; editar: string; guardado: string; borrado: string; campos: Campo[] };

const op = <T extends Record<string, { label: string; cls?: Pastel }>>(o: T): Opcion[] =>
  Object.entries(o).map(([v, x]) => ({ v, label: x.label, cls: x.cls }));
const lista = (xs: readonly string[], vacio?: string): Opcion[] => [...(vacio !== undefined ? [{ v: '', label: vacio }] : []), ...xs.map((v) => ({ v, label: v }))];
const disciplinas = (vacio = '—'): Opcion[] => [{ v: '', label: vacio }, ...op(DISCIPLINAS)];
const esColaborador = (v: Valores) => v.type === 'Colaborador';

export const DEFINICIONES: Record<TipoForm, Definicion> = {
  contact: {
    col: 'contacts',
    nuevo: 'Nuevo contacto',
    editar: 'Editar contacto',
    guardado: 'Contacto guardado',
    borrado: 'Contacto eliminado',
    campos: [
      { tipo: 'seccion', label: 'Datos personales' },
      { tipo: 'text', k: 'name', label: 'Nombre y apellidos', req: true, max: 160 },
      { tipo: 'select', k: 'companyId', label: 'Empresa', de: 'companies' },
      { tipo: 'text', k: 'role', label: 'Cargo o función', max: 160 },
      { tipo: 'text', k: 'nif', label: 'DNI / NIF', max: 20 },
      { tipo: 'selectv', k: 'type', label: '¿Qué es para ti?', opciones: lista(TIPOS_CONTACTO) },
      { tipo: 'pills', k: 'status', label: 'Estado', opciones: op(ESTADOS_CONTACTO), full: true },
      { tipo: 'seccion', label: 'Contacto' },
      { tipo: 'email', k: 'email', label: 'Correo electrónico', max: 200 },
      { tipo: 'tel', k: 'phone', label: 'Teléfono', max: 40 },
      { tipo: 'text', k: 'tags', label: 'Etiquetas (separadas por comas)', full: true, max: 300 },
      { tipo: 'textarea', k: 'notes', label: 'Observaciones', full: true, max: 5000 },
      { tipo: 'seccion', label: 'Colaborador/a', visible: esColaborador },
      { tipo: 'selectv', k: 'specialty', label: 'Especialidad', opciones: disciplinas(), visible: esColaborador },
      { tipo: 'number', k: 'rate', label: 'Tarifa (€/hora)', visible: esColaborador },
      { tipo: 'selectv', k: 'availability', label: 'Disponibilidad', opciones: op(DISPONIBILIDAD), visible: esColaborador },
      { tipo: 'seccion', label: 'Protección de datos' },
      { tipo: 'check', k: 'consent', label: 'Me ha dado permiso para guardar sus datos', full: true },
      { tipo: 'date', k: 'consentDate', label: 'Fecha del permiso', visible: (v) => v.consent === true },
      { tipo: 'selectv', k: 'consentVia', label: 'Cómo me lo dio', opciones: lista(VIAS_PERMISO, '—'), visible: (v) => v.consent === true },
    ],
  },
  company: {
    col: 'companies',
    nuevo: 'Nueva empresa',
    editar: 'Editar empresa',
    guardado: 'Empresa guardada',
    borrado: 'Empresa eliminada',
    campos: [
      { tipo: 'seccion', label: 'Datos para facturar' },
      { tipo: 'text', k: 'name', label: 'Nombre o razón social', req: true, full: true, max: 200 },
      { tipo: 'text', k: 'nif', label: 'NIF / CIF', max: 20 },
      { tipo: 'text', k: 'sector', label: 'Sector', max: 120 },
      { tipo: 'text', k: 'address', label: 'Dirección para las facturas', full: true, max: 300 },
      { tipo: 'check', k: 'isPrivate', label: 'Es un particular (sus facturas van sin retención de IRPF)', full: true },
      { tipo: 'seccion', label: 'Contacto' },
      { tipo: 'email', k: 'email', label: 'Email para facturas', max: 200 },
      { tipo: 'tel', k: 'phone', label: 'Teléfono', max: 40 },
      { tipo: 'text', k: 'web', label: 'Web', max: 200 },
      { tipo: 'textarea', k: 'notes', label: 'Observaciones', full: true, max: 5000 },
    ],
  },
  deal: {
    col: 'deals',
    nuevo: 'Nueva oportunidad',
    editar: 'Editar oportunidad',
    guardado: 'Oportunidad guardada',
    borrado: 'Oportunidad eliminada',
    campos: [
      { tipo: 'text', k: 'title', label: '¿Qué necesita el cliente?', req: true, full: true, max: 200 },
      { tipo: 'selectv', k: 'discipline', label: 'Disciplina', opciones: disciplinas('Sin disciplina') },
      { tipo: 'number', k: 'value', label: 'Valor aproximado (€, sin IVA)', req: true },
      { tipo: 'select', k: 'companyId', label: 'Empresa', de: 'companies' },
      { tipo: 'select', k: 'contactId', label: 'Persona de contacto', de: 'contacts', filtro: (c, v) => !v.companyId || c.companyId === v.companyId },
      { tipo: 'pills', k: 'stage', label: '¿En qué punto está?', opciones: op(FASES_OPORTUNIDAD), full: true },
      { tipo: 'number', k: 'prob', label: 'Probabilidad de conseguirlo (%)' },
      { tipo: 'date', k: 'expected', label: '¿Cuándo crees que se decidirá?' },
      { tipo: 'selectv', k: 'source', label: '¿Cómo te encontró?', opciones: lista(FUENTES, '—') },
      { tipo: 'selectv', k: 'lostReason', label: '¿Por qué se ha perdido?', opciones: lista(MOTIVOS_PERDIDA, '—'), visible: (v) => v.stage === 'perdido' },
      { tipo: 'textarea', k: 'notes', label: 'Notas', full: true, max: 5000 },
    ],
  },
  task: {
    col: 'tasks',
    nuevo: 'Nueva tarea',
    editar: 'Editar tarea',
    guardado: 'Tarea guardada',
    borrado: 'Tarea eliminada',
    campos: [
      { tipo: 'text', k: 'title', label: '¿Qué hay que hacer?', req: true, full: true, max: 300 },
      { tipo: 'date', k: 'due', label: 'Fecha límite' },
      { tipo: 'flags', k: 'flags', label: 'Prioridad' },
      { tipo: 'select', k: 'projectId', label: 'Proyecto', de: 'projects' },
      { tipo: 'select', k: 'contactId', label: 'Contacto', de: 'contacts' },
      { tipo: 'selectv', k: 'repeat', label: '¿Se repite?', avanzado: true, opciones: [{ v: '', label: 'No se repite' }, ...op(REPETICIONES)] },
      { tipo: 'select', k: 'blockedBy', label: 'Depende de otra tarea', avanzado: true, de: 'tasks', vacio: 'No depende de ninguna', filtro: (t, v) => !t.done && t.id !== v.id },
      { tipo: 'select', k: 'assigneeId', label: '¿Quién la hace?', avanzado: true, de: 'contacts', vacio: 'Yo', filtro: (c) => c.type === 'Colaborador' },
      { tipo: 'number', k: 'estimate', label: 'Horas estimadas', avanzado: true },
    ],
  },
  event: {
    col: 'events',
    nuevo: 'Nueva reunión',
    editar: 'Editar reunión',
    guardado: 'Reunión guardada en el calendario',
    borrado: 'Reunión eliminada',
    campos: [
      { tipo: 'text', k: 'title', label: 'Título', req: true, full: true, max: 200 },
      { tipo: 'date', k: 'date', label: 'Fecha', req: true },
      { tipo: 'time', k: 'time', label: 'Hora' },
      { tipo: 'select', k: 'contactId', label: 'Con quién', de: 'contacts' },
      { tipo: 'select', k: 'projectId', label: 'Proyecto', de: 'projects' },
    ],
  },
  note: {
    col: 'notes',
    nuevo: 'Nueva nota',
    editar: 'Editar nota',
    guardado: 'Nota guardada',
    borrado: 'Nota eliminada',
    campos: [
      { tipo: 'textarea', k: 'text', label: 'Nota', req: true, full: true, max: 10000 },
      { tipo: 'pills', k: 'color', label: 'Color', full: true, opciones: COLORES_NOTA.map((c) => ({ v: c, label: NOMBRE_COLOR[c], cls: c })) },
      { tipo: 'select', k: 'contactId', label: 'Contacto', de: 'contacts' },
      { tipo: 'select', k: 'projectId', label: 'Proyecto', de: 'projects' },
      { tipo: 'check', k: 'pinned', label: 'Fijarla en Inicio', full: true },
    ],
  },
};

/** Texto de cada opción de una lista. */
export function etiquetaFila(col: string, f: Record<string, unknown>): string {
  return String(col === 'tasks' ? f.title : f.name ?? '');
}

export function opcionesDe(c: Colecciones, campo: Extract<Campo, { tipo: 'select' }>, v: Valores) {
  const filas = (c[campo.de] as unknown as Record<string, unknown>[]).filter((f) => !campo.filtro || campo.filtro(f, v));
  return filas
    .map((f) => ({ v: String(f.id), label: etiquetaFila(campo.de, f) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
