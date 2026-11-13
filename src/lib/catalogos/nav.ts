import type { NombreIcono } from './iconos';

// Navegación (SPEC §3, constante NAV del prototipo). Las URL van en español.
export type Seccion = {
  id: string;
  label: string;
  icon: NombreIcono;
  /** Texto pequeño sobre el título de la página (como en el prototipo). */
  antetitulo: string;
  /** Fase de SPEC §12 en la que la sección pasa a funcionar. */
  fase: number;
  /** Qué hará la sección (se muestra mientras no está lista). */
  desc: string;
};

export type ItemNav = Seccion | { group: string };

export const NAV: ItemNav[] = [
  { id: 'inicio', antetitulo: 'Inicio', label: 'Inicio', icon: 'home', fase: 0, desc: 'Tu resumen del día.' },
  { id: 'oportunidades', antetitulo: 'Clientes que pueden llegar', label: 'Oportunidades', icon: 'funnel', fase: 1, desc: 'Un tablero con tus posibles trabajos por fases: nuevo, contactado, propuesta, negociando, ganado y perdido. Arrastra cada uno según avance.' },
  { id: 'contactos', antetitulo: 'Agenda', label: 'Contactos', icon: 'users', fase: 1, desc: 'Clientes, potenciales y colaboradores con su ficha, su historial y el permiso de protección de datos.' },
  { id: 'empresas', antetitulo: 'Agenda', label: 'Empresas', icon: 'building', fase: 1, desc: 'Las empresas de tus clientes con sus datos fiscales, personas, proyectos y lo que te deben.' },
  { group: 'Trabajo' },
  { id: 'proyectos', antetitulo: 'Trabajo', label: 'Proyectos', icon: 'folder', fase: 1, desc: 'Tus proyectos con sus fases, plantillas por disciplina, tareas, horas y presupuesto.' },
  { id: 'tareas', antetitulo: 'Prioridades', label: 'Tareas', icon: 'check', fase: 1, desc: 'Una matriz con lo urgente y lo importante, tareas que se repiten y tareas que dependen de otras.' },
  { id: 'horas', antetitulo: 'Trabajo', label: 'Horas y carga', icon: 'timer', fase: 3, desc: 'Las horas que trabajas, tu precio por hora real y la carga de trabajo de las próximas semanas.' },
  { id: 'contenidos', antetitulo: 'Comunicación interna y externa', label: 'Contenidos', icon: 'megaphone', fase: 3, desc: 'El calendario de publicaciones de tus clientes y de tu marca, por canal y estado.' },
  { id: 'calendario', antetitulo: 'Agenda', label: 'Calendario', icon: 'calendar', fase: 1, desc: 'Reuniones, fechas límite, vencimientos de facturas y renovaciones en un mismo calendario.' },
  { group: 'Dinero' },
  { id: 'igualas', antetitulo: 'Ingresos que se repiten', label: 'Igualas y renovaciones', icon: 'repeat', fase: 2, desc: 'Clientes con cuota mensual y renovaciones de dominios, hosting y licencias.' },
  { id: 'contratos', antetitulo: 'Trabajo', label: 'Contratos', icon: 'pen', fase: 4, desc: 'Contratos generados a partir de tus datos, que el cliente firma desde su portal.' },
  { id: 'facturas', antetitulo: 'Dinero', label: 'Facturas', icon: 'receipt', fase: 2, desc: 'Presupuestos y facturas en modo sencillo, con numeración automática y lo que te deben.' },
  { id: 'gastos', antetitulo: 'Dinero', label: 'Gastos', icon: 'wallet', fase: 2, desc: 'Tus gastos con su ticket, por categoría y trimestre.' },
  { id: 'informes', antetitulo: 'Cómo va tu negocio', label: 'Informes', icon: 'chart', fase: 2, desc: 'Ingresos y gastos, el resumen para tu gestoría y lo que te deja cada proyecto y cliente.' },
  { group: 'Red' },
  { id: 'colaboradores', antetitulo: 'Tu equipo extendido', label: 'Colaboradores', icon: 'spark', fase: 3, desc: 'Tu red de colaboradores con su especialidad, tarifa y disponibilidad.' },
  { id: 'portfolio', antetitulo: 'Tu mejor carta de presentación', label: 'Portfolio', icon: 'star', fase: 3, desc: 'Casos de éxito de tus proyectos entregados, listos para copiar.' },
  { id: 'notas', antetitulo: 'Ideas', label: 'Notas', icon: 'note', fase: 1, desc: 'Notas de colores que puedes fijar en Inicio y vincular a contactos o proyectos.' },
  { id: 'automatizaciones', antetitulo: 'Que nebúla trabaje por ti', label: 'Automatizaciones', icon: 'zap', fase: 4, desc: 'Interruptores para que nebúla haga sola el trabajo repetitivo.' },
];

export const SECCIONES: Seccion[] = NAV.filter((n): n is Seccion => 'id' in n);

export function seccion(id: string): Seccion | undefined {
  return SECCIONES.find((s) => s.id === id);
}

