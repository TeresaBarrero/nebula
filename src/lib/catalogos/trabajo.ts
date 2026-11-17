// Catálogos de la Fase 3, copiados del prototipo (CH, PST2, BST, BRIEF_BASE, BRIEF_EXTRA y capOf).
import type { Canal, Disponibilidad, EstadoBrief, EstadoPublicacion } from '@/lib/datos/entidades';
import type { Pastel } from './crm';
import type { Disciplina } from './disciplinas';

type Etiqueta = { label: string; cls: Pastel };

export const CANALES: Record<Canal, Etiqueta> = {
  instagram: { label: 'Instagram', cls: 'peach' },
  linkedin: { label: 'LinkedIn', cls: 'lilac' },
  tiktok: { label: 'TikTok', cls: 'mist' },
  facebook: { label: 'Facebook', cls: 'lilac' },
  blog: { label: 'Blog', cls: 'sage' },
  newsletter: { label: 'Newsletter', cls: 'butter' },
  prensa: { label: 'Nota de prensa', cls: 'sand' },
  interna: { label: 'Comunicación interna', cls: 'rose' },
};

export const ESTADOS_PUBLICACION: Record<EstadoPublicacion, Etiqueta> = {
  idea: { label: 'Idea', cls: 'mist' },
  borrador: { label: 'Borrador', cls: 'butter' },
  revision: { label: 'La revisa el cliente', cls: 'peach' },
  aprobado: { label: 'Aprobada', cls: 'lilac' },
  programado: { label: 'Programada', cls: 'sand' },
  publicado: { label: 'Publicada', cls: 'sage' },
};

export const ESTADOS_BRIEF: Record<EstadoBrief, Etiqueta> = {
  pendiente: { label: 'Sin rellenar', cls: 'mist' },
  enviado: { label: 'Enviado al cliente', cls: 'butter' },
  completado: { label: 'Completado', cls: 'sage' },
};

/** Preguntas comunes del briefing (BRIEF_BASE). */
export const PREGUNTAS_BRIEF: [string, string][] = [
  ['objective', '¿Qué quiere conseguir con este proyecto?'],
  ['audience', '¿A quién se dirige?'],
  ['tone', 'Tono y personalidad'],
  ['references', 'Referencias que le gustan (y las que no)'],
  ['competitors', 'Competencia'],
  ['deliverables', '¿Qué espera recibir?'],
  ['budgetRange', 'Presupuesto orientativo'],
  ['deadline', 'Fecha límite y motivo'],
];

/** Preguntas extra por disciplina (BRIEF_EXTRA). */
export const PREGUNTAS_EXTRA: Partial<Record<Disciplina, [string, string][]>> = {
  web: [['pages', 'Páginas y funcionalidades'], ['content', '¿Quién aporta textos e imágenes?']],
  branding: [['values', 'Valores de la marca'], ['applications', '¿Dónde se usará la marca?']],
  social: [['channels', 'Redes y frecuencia de publicación'], ['kpis', '¿Cómo mediremos el éxito?']],
  seo: [['keywords', 'Servicios o palabras clave prioritarias'], ['kpis', 'Objetivo: contactos, ventas o visitas']],
  cint: [['teams', 'Equipos y número de personas'], ['channels', 'Canales internos actuales']],
  cext: [['news', '¿Cuál es la noticia?'], ['media', 'Medios a los que queremos llegar']],
  grafico: [['format', 'Formato, medidas y tirada']],
  desarrollo: [['features', 'Funcionalidades imprescindibles'], ['integrations', 'Conexiones con otros programas']],
};

export const preguntasBrief = (d: Disciplina | null): [string, string][] => [...PREGUNTAS_BRIEF, ...((d && PREGUNTAS_EXTRA[d]) || [])];

/** Horas a la semana de un colaborador según su disponibilidad (SPEC §7.8). */
export const CAPACIDAD: Record<Disponibilidad, number> = { disponible: 25, parcial: 12, ocupado: 0 };
