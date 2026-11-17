import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import {
  COLORES_NOTA,
  DISPONIBILIDAD,
  ESTADOS_CONTACTO,
  FASES_OPORTUNIDAD,
  FASES_PROYECTO,
  FUENTES,
  MOTIVOS_PERDIDA,
  NOMBRE_COLOR,
  PRIORIDADES,
  TIPOS_CONTACTO,
  VIAS_PERMISO,
  type Pastel,
} from '@/lib/catalogos/crm';
import type { Colecciones, NombreColeccion } from '@/lib/datos/entidades';
import { CATEGORIAS_GASTO, TIPOS_IVA, TIPOS_RENOVACION } from '@/lib/catalogos/dinero';
import { PLANTILLAS } from '@/lib/catalogos/plantillas';
import { CANALES, ESTADOS_PUBLICACION } from '@/lib/catalogos/trabajo';
import { REPETICIONES } from '@/lib/reglas/tareas';

export type TipoForm =
  | 'contact' | 'company' | 'deal' | 'project' | 'task' | 'event' | 'note' | 'retainer' | 'renewal' | 'expense'
  | 'time' | 'post' | 'access' | 'brand' | 'case';

export type Valores = Record<string, string | boolean>;

type Opcion = { v: string; label: string; cls?: Pastel };

export type Campo =
  | { tipo: 'seccion'; label: string; visible?: (v: Valores) => boolean }
  | {
      tipo: 'text' | 'email' | 'tel' | 'number' | 'date' | 'time' | 'textarea' | 'check' | 'flags' | 'archivo' | 'clave';
      k: string;
      label: string;
      req?: boolean;
      full?: boolean;
      avanzado?: boolean;
      /** Solo al crear (p. ej. el comentario inicial). */
      soloNuevo?: boolean;
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
      soloNuevo?: boolean;
      visible?: (v: Valores) => boolean;
    }
  | {
      tipo: 'select';
      k: string;
      label: string;
      /** De qué lista salen las opciones. */
      de: Extract<NombreColeccion, 'contacts' | 'companies' | 'projects' | 'tasks' | 'retainers'>;
      vacio?: string;
      filtro?: (fila: Record<string, unknown>, v: Valores) => boolean;
      full?: boolean;
      avanzado?: boolean;
      visible?: (v: Valores) => boolean;
    };

export type Definicion = {
  col: NombreColeccion;
  nuevo: string;
  editar: string;
  guardado: string;
  borrado: string;
  campos: Campo[];
  /** Edita una parte de otra cosa (el kit de marca de una empresa…): no se puede eliminar desde aquí. */
  sinBorrar?: boolean;
  /** Texto bajo el título. */
  ayuda?: string;
};

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
  project: {
    col: 'projects',
    nuevo: 'Nuevo proyecto',
    editar: 'Editar proyecto',
    guardado: 'Proyecto guardado',
    borrado: 'Proyecto eliminado',
    campos: [
      { tipo: 'seccion', label: 'Lo básico' },
      { tipo: 'text', k: 'name', label: 'Nombre del proyecto', req: true, full: true, max: 200 },
      { tipo: 'select', k: 'contactId', label: 'Cliente', de: 'contacts', filtro: (c) => c.type !== 'Colaborador' },
      { tipo: 'selectv', k: 'discipline', label: 'Disciplina', opciones: disciplinas('Sin disciplina') },
      {
        tipo: 'selectv',
        k: 'template',
        label: 'Plantilla (crea fases, tareas y entregables)',
        full: true,
        soloNuevo: true,
        opciones: [{ v: '', label: 'Sin plantilla' }, ...Object.entries(PLANTILLAS).map(([v, t]) => ({ v, label: `${t.label} · ${t.tasks.length} tareas, ${t.hours} h` }))],
      },
      { tipo: 'date', k: 'start', label: 'Empieza' },
      { tipo: 'date', k: 'end', label: 'Entrega' },
      { tipo: 'pills', k: 'status', label: 'Fase', opciones: op(FASES_PROYECTO), full: true },
      { tipo: 'pills', k: 'priority', label: 'Prioridad', opciones: op(PRIORIDADES), full: true },
      { tipo: 'textarea', k: 'description', label: 'Descripción', full: true, max: 5000 },
      { tipo: 'seccion', label: 'Presupuesto y límites' },
      { tipo: 'number', k: 'budget', label: 'Presupuesto (€, sin IVA)' },
      { tipo: 'number', k: 'hoursBudget', label: 'Horas previstas' },
      { tipo: 'number', k: 'roundsIncluded', label: 'Rondas de cambios incluidas' },
      { tipo: 'text', k: 'tags', label: 'Etiquetas (separadas por comas)', max: 300 },
      { tipo: 'textarea', k: 'comment', label: 'Comentario inicial (va al historial)', full: true, soloNuevo: true, max: 5000 },
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
  retainer: {
    col: 'retainers',
    nuevo: 'Nueva iguala',
    editar: 'Editar iguala',
    guardado: 'Iguala guardada',
    borrado: 'Iguala eliminada',
    campos: [
      { tipo: 'text', k: 'name', label: 'Servicio', req: true, full: true, max: 200 },
      { tipo: 'select', k: 'companyId', label: 'Cliente', de: 'companies' },
      { tipo: 'select', k: 'contactId', label: 'Persona de contacto', de: 'contacts', filtro: (c, v) => c.type !== 'Colaborador' && (!v.companyId || c.companyId === v.companyId) },
      { tipo: 'selectv', k: 'discipline', label: 'Disciplina', opciones: disciplinas('Sin disciplina') },
      { tipo: 'number', k: 'fee', label: 'Cuota al mes (€, sin IVA)', req: true },
      { tipo: 'number', k: 'hours', label: 'Horas incluidas al mes' },
      { tipo: 'number', k: 'billingDay', label: 'Día del mes en que la facturas' },
      { tipo: 'date', k: 'start', label: 'Desde' },
      { tipo: 'textarea', k: 'services', label: '¿Qué incluye?', full: true, max: 5000 },
      { tipo: 'check', k: 'active', label: 'Activa', full: true },
    ],
  },
  renewal: {
    col: 'renewals',
    nuevo: 'Nueva renovación',
    editar: 'Editar renovación',
    guardado: 'Renovación guardada',
    borrado: 'Renovación eliminada',
    campos: [
      { tipo: 'text', k: 'name', label: 'Servicio (p. ej. dominio.es)', req: true, full: true, max: 200 },
      { tipo: 'select', k: 'companyId', label: 'Cliente', de: 'companies' },
      { tipo: 'selectv', k: 'type', label: 'Tipo', opciones: op(TIPOS_RENOVACION) },
      { tipo: 'text', k: 'provider', label: 'Proveedor', max: 120 },
      { tipo: 'date', k: 'renewDate', label: 'Fecha de renovación', req: true },
      { tipo: 'number', k: 'cost', label: 'Te cuesta al año (€)' },
      { tipo: 'number', k: 'price', label: 'Le cobras al año (€)' },
    ],
  },
  expense: {
    col: 'expenses',
    nuevo: 'Nuevo gasto',
    editar: 'Editar gasto',
    guardado: 'Gasto apuntado',
    borrado: 'Gasto eliminado',
    campos: [
      { tipo: 'date', k: 'date', label: 'Fecha', req: true },
      { tipo: 'text', k: 'supplier', label: 'Proveedor', req: true, max: 200 },
      { tipo: 'text', k: 'concept', label: 'Concepto', req: true, full: true, max: 300 },
      { tipo: 'selectv', k: 'category', label: 'Categoría', opciones: lista(CATEGORIAS_GASTO) },
      { tipo: 'select', k: 'projectId', label: 'Proyecto (opcional)', de: 'projects' },
      { tipo: 'number', k: 'base', label: 'Importe sin IVA (€)', req: true },
      { tipo: 'selectv', k: 'ivaPct', label: 'IVA del ticket', opciones: TIPOS_IVA.map((x) => ({ v: String(x), label: x ? `${x} %` : '0 % (sin IVA)' })) },
      { tipo: 'select', k: 'contactId', label: 'Colaborador o proveedor (opcional)', de: 'contacts', filtro: (c) => c.type === 'Colaborador' || c.type === 'Proveedor' },
      { tipo: 'check', k: 'deductible', label: 'Es un gasto de mi actividad (deducible)', full: true },
      { tipo: 'archivo', k: 'receipt', label: 'Ticket o factura del proveedor', full: true },
    ],
  },
  time: {
    col: 'timeEntries',
    nuevo: 'Apuntar horas',
    editar: 'Editar horas',
    guardado: 'Horas apuntadas',
    borrado: 'Horas eliminadas',
    campos: [
      { tipo: 'date', k: 'date', label: 'Día', req: true },
      { tipo: 'number', k: 'hours', label: 'Horas (1,5 = hora y media)', req: true },
      { tipo: 'select', k: 'projectId', label: 'Proyecto', de: 'projects', visible: (v) => !v.retainerId },
      { tipo: 'select', k: 'retainerId', label: '…o iguala', de: 'retainers', visible: (v) => !v.projectId },
      { tipo: 'text', k: 'note', label: '¿Qué has hecho?', full: true, max: 300 },
      { tipo: 'check', k: 'billable', label: 'Es trabajo para un cliente (no interno)', full: true },
    ],
  },
  post: {
    col: 'posts',
    nuevo: 'Nueva publicación',
    editar: 'Editar publicación',
    guardado: 'Publicación guardada',
    borrado: 'Publicación eliminada',
    campos: [
      { tipo: 'text', k: 'title', label: 'Título o idea', req: true, full: true, max: 200 },
      { tipo: 'select', k: 'companyId', label: '¿Para quién?', de: 'companies', vacio: 'Mi marca' },
      { tipo: 'selectv', k: 'channel', label: 'Canal', opciones: op(CANALES) },
      { tipo: 'date', k: 'date', label: 'Fecha', req: true },
      { tipo: 'time', k: 'time', label: 'Hora' },
      { tipo: 'pills', k: 'status', label: 'Estado', opciones: op(ESTADOS_PUBLICACION), full: true },
      { tipo: 'textarea', k: 'copy', label: 'Texto de la publicación', full: true, max: 5000 },
    ],
  },
  access: {
    col: 'accesses',
    nuevo: 'Nuevo acceso',
    editar: 'Editar acceso',
    guardado: 'Acceso guardado (la contraseña va cifrada)',
    borrado: 'Acceso eliminado',
    ayuda: 'La contraseña se guarda cifrada: solo tú puedes verla, pulsando el ojo.',
    campos: [
      { tipo: 'text', k: 'service', label: 'Servicio', req: true, full: true, max: 200 },
      { tipo: 'select', k: 'companyId', label: 'Cliente', de: 'companies' },
      { tipo: 'text', k: 'url', label: 'Dirección web', max: 300 },
      { tipo: 'text', k: 'username', label: 'Usuario', max: 200 },
      { tipo: 'clave', k: 'password', label: 'Contraseña', max: 500 },
    ],
  },
  brand: {
    col: 'companies',
    nuevo: 'Kit de marca',
    editar: 'Kit de marca',
    guardado: 'Kit de marca guardado',
    borrado: '',
    sinBorrar: true,
    campos: [
      { tipo: 'text', k: 'colors', label: 'Colores (códigos separados por comas, p. ej. #2F3E46, #84A98C)', full: true, max: 300 },
      { tipo: 'text', k: 'fonts', label: 'Tipografías', full: true, max: 200 },
      { tipo: 'textarea', k: 'tone', label: 'Tono de comunicación', full: true, max: 1000 },
      { tipo: 'text', k: 'manual', label: 'Manual de marca (nombre del archivo; súbelo en Documentos)', full: true, max: 200 },
    ],
  },
  case: {
    col: 'projects',
    nuevo: 'Caso de éxito',
    editar: 'Caso de éxito',
    guardado: 'Caso de éxito guardado',
    borrado: '',
    sinBorrar: true,
    campos: [
      { tipo: 'textarea', k: 'summary', label: 'Resumen del proyecto (2 líneas)', full: true, max: 600 },
      { tipo: 'text', k: 'results', label: 'Resultado medible (p. ej. +22 % de reservas)', full: true, max: 200 },
      { tipo: 'text', k: 'link', label: 'Enlace (web, Behance…)', full: true, max: 300 },
      { tipo: 'check', k: 'permission', label: 'El cliente me ha dado permiso para enseñarlo', full: true },
      { tipo: 'check', k: 'featured', label: 'Mostrar en mi portfolio', full: true },
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
  return String(col === 'tasks' ? f.title : (f.name ?? ''));
}

export function opcionesDe(c: Colecciones, campo: Extract<Campo, { tipo: 'select' }>, v: Valores) {
  const filas = (c[campo.de] as unknown as Record<string, unknown>[]).filter((f) => !campo.filtro || campo.filtro(f, v));
  return filas
    .map((f) => ({ v: String(f.id), label: etiquetaFila(campo.de, f) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
