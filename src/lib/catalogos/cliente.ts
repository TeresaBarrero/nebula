// Catálogos de la Fase 4, copiados del prototipo (KST, KTYPE, IP, AUTO, RKPI).
import type { ClaveAutomatizacion, Derechos, EstadoContrato, TipoContrato } from '@/lib/datos/entidades';
import type { Pastel } from './crm';
import type { Disciplina } from './disciplinas';
import type { NombreIcono } from './iconos';

export const ESTADOS_CONTRATO: Record<EstadoContrato, { label: string; cls: Pastel }> = {
  borrador: { label: 'Borrador', cls: 'mist' },
  enviado: { label: 'Pendiente de firma', cls: 'butter' },
  firmado: { label: 'Firmado', cls: 'sage' },
};

export const TIPOS_CONTRATO: Record<TipoContrato, { label: string }> = {
  proyecto: { label: 'Proyecto' },
  iguala: { label: 'Iguala mensual' },
  colaborador: { label: 'Encargo a colaborador' },
};

export const DERECHOS: Record<Derechos, { label: string }> = {
  cesion: { label: 'Los derechos pasan al cliente cuando paga todo' },
  licencia: { label: 'El cliente recibe una licencia de uso (los derechos siguen siendo míos)' },
  colaborador: { label: 'Los derechos de lo creado pasan a mí (encargo a colaborador)' },
};

export type DefAutomatizacion = { icon: NombreIcono; when: string; then: string[]; porDefecto: boolean };

export const AUTOMATIZACIONES: Record<ClaveAutomatizacion, DefAutomatizacion> = {
  won: {
    icon: 'funnel',
    when: 'Cuando ganas una oportunidad',
    then: ['Se crea el proyecto con la plantilla de su disciplina', 'Se envía el briefing al cliente', 'Se prepara y envía el contrato para firmar'],
    porDefecto: true,
  },
  signed: { icon: 'pen', when: 'Cuando el cliente firma el contrato', then: ['Se emite la factura del anticipo', 'Te llega un aviso'], porDefecto: true },
  approved: {
    icon: 'tick',
    when: 'Cuando el cliente aprueba el último entregable',
    then: ['El proyecto pasa a «Entregado»', 'Se prepara la factura final con lo que falta por cobrar', 'Se crea una tarea para pedirle su opinión para el portfolio'],
    porDefecto: true,
  },
  lead: { icon: 'inbox', when: 'Cuando alguien rellena el formulario de tu web', then: ['Se crean el contacto y la oportunidad', 'Se crea una tarea urgente para llamarle en 24 h'], porDefecto: true },
  overdue: { icon: 'bell', when: 'Cuando una factura está a punto de vencer o vence', then: ['El cliente recibe un aviso amable 3 días antes', 'Recordatorios a 1, 7 y 15 días de retraso'], porDefecto: true },
  nudge: { icon: 'send', when: 'Cuando un entregable lleva 5 días sin respuesta', then: ['El cliente recibe un recordatorio amable para revisarlo'], porDefecto: true },
  retainer: { icon: 'repeat', when: 'Cada mes, el día de facturación de cada iguala', then: ['Se emite la factura de la cuota sola'], porDefecto: false },
};
export const CLAVES_AUTOMATIZACION = Object.keys(AUTOMATIZACIONES) as ClaveAutomatizacion[];

/** Datos de los informes mensuales según la disciplina de la iguala (RKPI). */
export const KPIS_INFORME: Partial<Record<Disciplina | 'base', [string, string][]>> = {
  social: [['alcance', 'Personas alcanzadas'], ['seguidores', 'Seguidores totales'], ['interacciones', 'Interacciones'], ['clics', 'Clics a la web'], ['contactos', 'Citas o contactos']],
  cint: [['aperturas', 'Aperturas de la newsletter (%)'], ['clics', 'Clics en la newsletter'], ['respuestas', 'Respuestas del equipo']],
  web: [['visitas', 'Visitas a la web'], ['contactos', 'Contactos recibidos'], ['primera', 'Búsquedas en primera página']],
  seo: [['impresiones', 'Veces que se vieron los anuncios'], ['clics', 'Clics'], ['contactos', 'Contactos conseguidos'], ['coste', 'Coste por contacto (€)']],
  base: [['r1', 'Resultado principal'], ['r2', 'Resultado secundario']],
};
export const kpisDe = (d: Disciplina | null) => (d && KPIS_INFORME[d]) || KPIS_INFORME.base!;

/** Tramos de presupuesto del formulario web (valor de la oportunidad que se crea). */
export const TRAMOS_PRESUPUESTO: [number, string][] = [
  [800, 'Menos de 1.000 €'],
  [2000, '1.000–3.000 €'],
  [4500, '3.000–6.000 €'],
  [8000, 'Más de 6.000 €'],
];

/** Recordatorios de pago: días respecto al vencimiento (SPEC §6.20). */
export const RECORDATORIOS_PAGO: [number, string][] = [
  [-3, 'Aviso amable: vence en 3 días'],
  [1, 'Ha vencido: recordatorio de pago'],
  [7, 'Segundo recordatorio'],
  [15, 'Último aviso antes de reclamar'],
];
