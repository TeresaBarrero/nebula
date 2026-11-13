// Catálogos del CRM, copiados del prototipo (constantes PH, FLOW, QUADS, PRI, CST, ACT, STG, DLV, AVAIL, SOURCES, LOST, VIAS, MAILTPL).
import type {
  ColorNota,
  Disponibilidad,
  EstadoContacto,
  EstadoEntregable,
  FaseOportunidad,
  FaseProyecto,
  Prioridad,
  TipoApunte,
  TipoContacto,
  ViaPermiso,
} from '@/lib/datos/entidades';
import type { NombreIcono } from './iconos';

export type Pastel = 'peach' | 'butter' | 'sand' | 'lilac' | 'mist' | 'sage' | 'rose';
type Etiqueta = { label: string; cls: Pastel };

export const FASES_PROYECTO: Record<FaseProyecto, Etiqueta> = {
  briefing: { label: 'Briefing', cls: 'mist' },
  investigacion: { label: 'Investigación', cls: 'lilac' },
  concepto: { label: 'Concepto', cls: 'butter' },
  produccion: { label: 'Diseño y desarrollo', cls: 'peach' },
  revisiones: { label: 'Revisiones', cls: 'sand' },
  entregado: { label: 'Entregado', cls: 'sage' },
  pausa: { label: 'En pausa', cls: 'rose' },
};
export const FLUJO: FaseProyecto[] = ['briefing', 'investigacion', 'concepto', 'produccion', 'revisiones', 'entregado'];

export const CUADRANTES = {
  q1: { label: 'Urgente e importante', hint: 'Hazlo ya', cls: 'peach', dot: 'var(--peach-strong)' },
  q2: { label: 'Importante, no urgente', hint: 'Planifícalo', cls: 'butter', dot: 'var(--butter-ink)' },
  q3: { label: 'Urgente, no importante', hint: 'Resuélvelo rápido o delega', cls: 'sand', dot: 'var(--sand-ink)' },
  q4: { label: 'Ni urgente ni importante', hint: 'Cuando tengas hueco', cls: 'lilac', dot: 'var(--lilac-ink)' },
} as const;
export type Cuadrante = keyof typeof CUADRANTES;

export const PRIORIDADES: Record<Prioridad, Etiqueta> = {
  baja: { label: 'Baja', cls: 'mist' },
  media: { label: 'Media', cls: 'butter' },
  alta: { label: 'Alta', cls: 'peach' },
  urgente: { label: 'Urgente', cls: 'rose' },
};

export const ESTADOS_CONTACTO: Record<EstadoContacto, Etiqueta & { dot: string }> = {
  activo: { label: 'Activo', cls: 'sage', dot: 'var(--ok)' },
  potencial: { label: 'Potencial', cls: 'butter', dot: 'var(--peach-strong)' },
  inactivo: { label: 'Inactivo', cls: 'rose', dot: 'var(--danger)' },
};

export const TIPOS_CONTACTO: TipoContacto[] = ['Cliente', 'Proveedor', 'Colaborador', 'Otro'];

export const APUNTES: Record<TipoApunte, Etiqueta & { icon: NombreIcono }> = {
  nota: { label: 'Nota', icon: 'note', cls: 'butter' },
  llamada: { label: 'Llamada', icon: 'phone', cls: 'sage' },
  email: { label: 'Email', icon: 'mail', cls: 'lilac' },
  reunion: { label: 'Reunión', icon: 'talk', cls: 'peach' },
};

export const FASES_OPORTUNIDAD: Record<FaseOportunidad, Etiqueta & { p: number }> = {
  nuevo: { label: 'Nuevo', cls: 'mist', p: 10 },
  contactado: { label: 'Contactado', cls: 'lilac', p: 20 },
  propuesta: { label: 'Propuesta enviada', cls: 'butter', p: 40 },
  negociacion: { label: 'Negociando', cls: 'peach', p: 70 },
  ganado: { label: 'Ganado', cls: 'sage', p: 100 },
  perdido: { label: 'Perdido', cls: 'rose', p: 0 },
};
export const FASES_ABIERTAS: FaseOportunidad[] = ['nuevo', 'contactado', 'propuesta', 'negociacion'];

export const ESTADOS_ENTREGABLE: Record<EstadoEntregable, Etiqueta> = {
  en_curso: { label: 'En preparación', cls: 'mist' },
  enviado: { label: 'Esperando al cliente', cls: 'butter' },
  cambios: { label: 'Pide cambios', cls: 'peach' },
  aprobado: { label: 'Aprobado', cls: 'sage' },
};

export const DISPONIBILIDAD: Record<Disponibilidad, Etiqueta> = {
  disponible: { label: 'Disponible', cls: 'sage' },
  parcial: { label: 'Ocupación parcial', cls: 'butter' },
  ocupado: { label: 'No disponible', cls: 'rose' },
};

export const FUENTES = ['Web', 'Formulario web', 'Recomendación', 'Cliente actual', 'Redes sociales', 'Evento o feria', 'Contacto directo', 'Otro'];
export const MOTIVOS_PERDIDA = ['Precio', 'Plazo', 'Eligió otro proveedor', 'Sin presupuesto', 'Sin respuesta', 'Otro'];
export const VIAS_PERMISO: ViaPermiso[] = ['Contrato', 'Formulario web', 'Email', 'Presencial', 'Teléfono'];
export const COLORES_NOTA: ColorNota[] = ['butter', 'peach', 'lilac', 'sage', 'sand'];
export const NOMBRE_COLOR: Record<ColorNota, string> = { butter: 'mantequilla', peach: 'melocotón', lilac: 'lila', sage: 'salvia', sand: 'arena' };

/** Plantillas de correo (MAILTPL del prototipo). {nombre} = nombre del contacto, {yo} = cómo te saludamos. */
export const PLANTILLAS_CORREO = {
  libre: { label: 'En blanco', s: '', b: '' },
  seguimiento: {
    label: 'Seguimiento de presupuesto',
    s: '¿Qué te ha parecido la propuesta?',
    b: 'Hola {nombre}:\n\nTe escribo para saber si has podido revisar el presupuesto que te envié. Si quieres, lo comentamos en una llamada corta esta semana.\n\nUn saludo,\n{yo}',
  },
  entrega: {
    label: 'Envío de entregable',
    s: 'Ya tienes la nueva versión para revisar',
    b: 'Hola {nombre}:\n\nYa tienes disponible la nueva versión en tu portal. Cuando puedas, revísala y apruébala o déjame tus comentarios allí mismo.\n\nGracias,\n{yo}',
  },
  pago: {
    label: 'Recordatorio de pago',
    s: 'Recordatorio de pago',
    b: 'Hola {nombre}:\n\nTe recuerdo que tienes una factura pendiente. Puedes pagarla con tarjeta o Bizum desde tu portal.\n\nGracias,\n{yo}',
  },
} as const;
export type PlantillaCorreo = keyof typeof PLANTILLAS_CORREO;

/** Color de avatar estable según el id (avCls del prototipo). */
const AV: Pastel[] = ['peach', 'butter', 'lilac', 'sage', 'sand'];
export function colorAvatar(id: string): Pastel {
  return AV[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
}
