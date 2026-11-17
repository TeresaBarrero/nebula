// Plantillas de proyecto (constante TPL del prototipo, SPEC §5): tarea, fase y día desde el inicio.
import type { Disciplina } from './disciplinas';
import type { FaseProyecto } from '@/lib/datos/entidades';

export type Plantilla = {
  label: string;
  discipline: Disciplina;
  rounds: number;
  hours: number;
  dlv: string[];
  tasks: [titulo: string, fase: FaseProyecto, dia: number][];
};

export const PLANTILLAS = {
  web: {
    label: 'Web corporativa',
    discipline: 'web',
    rounds: 2,
    hours: 60,
    dlv: ['Wireframes', 'Diseño UI', 'Web en pruebas'],
    tasks: [
      ['Reunión de briefing', 'briefing', 0],
      ['Revisar web actual y competencia', 'investigacion', 4],
      ['Arquitectura de contenidos', 'investigacion', 7],
      ['Wireframes', 'concepto', 12],
      ['Diseño UI de home e interiores', 'produccion', 20],
      ['Maquetación y desarrollo', 'produccion', 32],
      ['Carga de contenidos y SEO básico', 'produccion', 38],
      ['Pruebas en móvil y navegadores', 'revisiones', 42],
      ['Lanzamiento y formación al cliente', 'entregado', 45],
    ],
  },
  branding: {
    label: 'Identidad de marca',
    discipline: 'branding',
    rounds: 3,
    hours: 35,
    dlv: ['Moodboard', 'Propuestas de logotipo', 'Manual de marca'],
    tasks: [
      ['Reunión de briefing', 'briefing', 0],
      ['Investigación y moodboard', 'investigacion', 5],
      ['Bocetos de logotipo', 'concepto', 10],
      ['Desarrollo de la propuesta elegida', 'produccion', 18],
      ['Colores, tipografías y aplicaciones', 'produccion', 24],
      ['Manual de marca', 'revisiones', 30],
      ['Entrega de archivos finales', 'entregado', 35],
    ],
  },
  social: {
    label: 'Plan de redes sociales',
    discipline: 'social',
    rounds: 2,
    hours: 20,
    dlv: ['Estrategia', 'Calendario editorial', 'Piezas del mes'],
    tasks: [
      ['Reunión de briefing', 'briefing', 0],
      ['Análisis de cuentas y competencia', 'investigacion', 3],
      ['Estrategia y líneas de contenido', 'concepto', 7],
      ['Calendario editorial del mes', 'produccion', 10],
      ['Diseño de piezas', 'produccion', 15],
      ['Informe de resultados', 'entregado', 30],
    ],
  },
  grafico: {
    label: 'Pieza gráfica o editorial',
    discipline: 'grafico',
    rounds: 2,
    hours: 25,
    dlv: ['Maqueta', 'Arte final'],
    tasks: [
      ['Reunión de briefing', 'briefing', 0],
      ['Recopilar textos e imágenes', 'investigacion', 3],
      ['Maqueta y propuesta', 'concepto', 7],
      ['Diseño final', 'produccion', 14],
      ['Pruebas de imprenta', 'revisiones', 18],
      ['Envío a imprenta', 'entregado', 20],
    ],
  },
  desarrollo: {
    label: 'Desarrollo a medida',
    discipline: 'desarrollo',
    rounds: 2,
    hours: 80,
    dlv: ['Prototipo', 'Versión de pruebas', 'Versión final'],
    tasks: [
      ['Toma de requisitos', 'briefing', 0],
      ['Análisis técnico y estimación', 'investigacion', 5],
      ['Prototipo navegable', 'concepto', 12],
      ['Desarrollo por fases', 'produccion', 40],
      ['Pruebas y corrección de errores', 'revisiones', 55],
      ['Puesta en marcha y documentación', 'entregado', 60],
    ],
  },
  seo: {
    label: 'Campaña SEO y anuncios',
    discipline: 'seo',
    rounds: 2,
    hours: 25,
    dlv: ['Auditoría', 'Creatividades', 'Informe de resultados'],
    tasks: [
      ['Briefing y objetivos', 'briefing', 0],
      ['Auditoría SEO y palabras clave', 'investigacion', 4],
      ['Estructura de campañas', 'concepto', 8],
      ['Creatividades y anuncios', 'produccion', 12],
      ['Lanzamiento y optimización', 'revisiones', 16],
      ['Informe de resultados', 'entregado', 30],
    ],
  },
  cint: {
    label: 'Plan de comunicación interna',
    discipline: 'cint',
    rounds: 2,
    hours: 20,
    dlv: ['Diagnóstico', 'Plan de comunicación', 'Piezas internas'],
    tasks: [
      ['Briefing con dirección', 'briefing', 0],
      ['Encuesta al equipo', 'investigacion', 5],
      ['Plan y canales', 'concepto', 10],
      ['Newsletter, cartelería e intranet', 'produccion', 18],
      ['Lanzamiento interno', 'revisiones', 22],
      ['Medición y ajustes', 'entregado', 30],
    ],
  },
  cext: {
    label: 'Campaña de prensa',
    discipline: 'cext',
    rounds: 2,
    hours: 18,
    dlv: ['Nota de prensa', 'Dossier', 'Recopilación de apariciones'],
    tasks: [
      ['Briefing y mensajes clave', 'briefing', 0],
      ['Lista de medios', 'investigacion', 3],
      ['Nota de prensa y dossier', 'produccion', 7],
      ['Envío a medios y seguimiento', 'revisiones', 10],
      ['Informe de apariciones', 'entregado', 25],
    ],
  },
} satisfies Record<string, Plantilla>;

export type ClavePlantilla = keyof typeof PLANTILLAS;

export function esPlantilla(k: unknown): k is ClavePlantilla {
  return typeof k === 'string' && Object.hasOwn(PLANTILLAS, k);
}
