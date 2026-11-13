import type { Disciplina } from '@/lib/catalogos/disciplinas';

/** Fecha sin hora, «YYYY-MM-DD». */
export type Fecha = string;
export type Id = string;

// ───────── Modelo de datos de la Fase 1 (SPEC §4). Nombres como en el prototipo. ─────────

export type Empresa = {
  id: Id;
  name: string;
  nif: string;
  sector: string;
  address: string;
  email: string;
  phone: string;
  web: string;
  notes: string;
  /** Particular → sin retención de IRPF (SPEC §7.4). */
  isPrivate: boolean;
  createdAt: string;
};

export type TipoContacto = 'Cliente' | 'Proveedor' | 'Colaborador' | 'Otro';
export type EstadoContacto = 'activo' | 'potencial' | 'inactivo';
export type Disponibilidad = 'disponible' | 'parcial' | 'ocupado';
export type ViaPermiso = 'Contrato' | 'Formulario web' | 'Email' | 'Presencial' | 'Teléfono';

export type Contacto = {
  id: Id;
  name: string;
  companyId: Id | null;
  role: string;
  nif: string;
  email: string;
  phone: string;
  type: TipoContacto;
  status: EstadoContacto;
  tags: string[];
  notes: string;
  specialty: Disciplina | null;
  rate: number | null;
  availability: Disponibilidad | null;
  consent: boolean;
  consentDate: Fecha | null;
  consentVia: ViaPermiso | null;
  createdAt: string;
};

export type FaseOportunidad = 'nuevo' | 'contactado' | 'propuesta' | 'negociacion' | 'ganado' | 'perdido';

export type Oportunidad = {
  id: Id;
  title: string;
  discipline: Disciplina | null;
  companyId: Id | null;
  contactId: Id | null;
  value: number;
  prob: number;
  stage: FaseOportunidad;
  expected: Fecha | null;
  source: string;
  notes: string;
  lostReason: string;
  projectId: Id | null;
  closedAt: Fecha | null;
  createdAt: string;
};

export type FaseProyecto = 'briefing' | 'investigacion' | 'concepto' | 'produccion' | 'revisiones' | 'entregado' | 'pausa';
export type Prioridad = 'baja' | 'media' | 'alta' | 'urgente';

export type Proyecto = {
  id: Id;
  name: string;
  contactId: Id | null;
  discipline: Disciplina | null;
  start: Fecha | null;
  end: Fecha | null;
  status: FaseProyecto;
  prevStatus: FaseProyecto | null;
  priority: Prioridad;
  budget: number;
  hoursBudget: number;
  roundsIncluded: number;
  description: string;
  tags: string[];
  /** Ids de contactos colaboradores (tabla puente project_collaborators). */
  collaborators: Id[];
  createdAt: string;
};

export type EstadoEntregable = 'en_curso' | 'enviado' | 'cambios' | 'aprobado';

export type Entregable = {
  id: Id;
  projectId: Id;
  name: string;
  status: EstadoEntregable;
  sentAt: Fecha | null;
  approvedAt: Fecha | null;
  billedExtra: number;
  createdAt: string;
};

export type Repeticion = '' | 'diaria' | 'semanal' | 'mensual';

export type Tarea = {
  id: Id;
  title: string;
  due: Fecha | null;
  urgent: boolean;
  important: boolean;
  done: boolean;
  projectId: Id | null;
  contactId: Id | null;
  /** null = yo; si no, un colaborador. */
  assigneeId: Id | null;
  estimate: number;
  repeat: Repeticion;
  blockedBy: Id | null;
  nextCreated: boolean;
  phase: FaseProyecto | null;
  createdAt: string;
};

export type Reunion = {
  id: Id;
  title: string;
  date: Fecha;
  time: string;
  contactId: Id | null;
  projectId: Id | null;
  source: 'google' | 'reserva' | null;
  createdAt: string;
};

export type ColorNota = 'butter' | 'peach' | 'lilac' | 'sage' | 'sand';

export type Nota = {
  id: Id;
  text: string;
  color: ColorNota;
  pinned: boolean;
  contactId: Id | null;
  projectId: Id | null;
  date: Fecha;
  createdAt: string;
};

export type TipoApunte = 'nota' | 'llamada' | 'email' | 'reunion';

/** Apunte manual del historial (tabla `activities`). */
export type Apunte = {
  id: Id;
  type: TipoApunte;
  text: string;
  date: Fecha;
  contactId: Id | null;
  projectId: Id | null;
  createdAt: string;
};

export type Documento = {
  id: Id;
  name: string;
  size: number;
  mime: string;
  /** Dónde está el archivo (Supabase Storage o, en la demo, el navegador). Vacío = solo ficha, sin archivo. */
  storagePath: string;
  contactId: Id | null;
  companyId: Id | null;
  projectId: Id | null;
  date: Fecha;
  createdAt: string;
};

export type Colecciones = {
  companies: Empresa[];
  contacts: Contacto[];
  deals: Oportunidad[];
  projects: Proyecto[];
  deliverables: Entregable[];
  tasks: Tarea[];
  events: Reunion[];
  notes: Nota[];
  activities: Apunte[];
  files: Documento[];
  /** Claves de avisos ya leídos (SPEC §7.9). */
  notificationReads: string[];
};

export type NombreColeccion = Exclude<keyof Colecciones, 'notificationReads'>;
export type FilaDe<K extends NombreColeccion> = Colecciones[K][number];

export const NOMBRES_COLECCION: NombreColeccion[] = [
  'companies',
  'contacts',
  'deals',
  'projects',
  'deliverables',
  'tasks',
  'events',
  'notes',
  'activities',
  'files',
];

export function coleccionesVacias(): Colecciones {
  return {
    companies: [],
    contacts: [],
    deals: [],
    projects: [],
    deliverables: [],
    tasks: [],
    events: [],
    notes: [],
    activities: [],
    files: [],
    notificationReads: [],
  };
}
