import { describe, expect, it } from 'vitest';
import { aEntidad, aValores, porDefecto } from '@/components/app/formularios/conversion';
import { PLANTILLAS } from '@/lib/catalogos/plantillas';
import { crearAlmacenDemo, type Guardado } from '@/lib/datos/almacen-demo';
import type { Oportunidad, Proyecto } from '@/lib/datos/entidades';
import { semillaDemo } from '@/lib/datos/semilla';
import { calcularAvisos, sinLeer } from './avisos';
import { buscar } from './buscador';
import { diasDelMes, elementosDelDia, moverMes } from './calendario';
import { sumarDias } from './fechas';
import { historial } from './historial';
import { aplicarPlantilla, cambiosDeFase, cifrasOportunidades, enMarcha, enTablero, faseAlReanudar, moverOportunidad, progreso } from './proyectos';
import { leerTareaRapida } from './tareaRapida';

const HOY = '2026-11-13'; // viernes
const datos = () => semillaDemo(HOY);
let n = 0;
const id = () => `nuevo-${++n}`;
const AHORA = '2026-11-13T10:00:00.000Z';
const ctx = (extra: Partial<Parameters<typeof moverOportunidad>[2]> = {}) => ({ c: datos(), hoy: HOY, tarifa: 50, nuevoId: id, ahora: AHORA, ...extra });
const deal = (o: Partial<Oportunidad> = {}): Oportunidad => ({
  id: 'dx', title: 'Web para Café Nómada', discipline: 'web', companyId: 'co9', contactId: 'c10', value: 3200, prob: 20, stage: 'contactado',
  expected: null, source: '', notes: 'Con reservas', lostReason: '', projectId: null, closedAt: null, createdAt: AHORA, ...o,
});

describe('Plantillas de proyecto', () => {
  it('crea las tareas con fecha desde el inicio, su fase y los entregables', () => {
    const p = { id: 'px', start: '2026-12-01', contactId: 'c1' };
    const r = aplicarPlantilla(p, 'web', HOY, id, AHORA);
    expect(r.tasks).toHaveLength(PLANTILLAS.web.tasks.length);
    expect(r.tasks[0]).toMatchObject({ title: 'Reunión de briefing', due: '2026-12-01', phase: 'briefing', projectId: 'px', contactId: 'c1', important: true, done: false });
    expect(r.tasks.at(-1)).toMatchObject({ title: 'Lanzamiento y formación al cliente', due: sumarDias('2026-12-01', 45), phase: 'entregado' });
    expect(r.deliverables.map((d) => d.name)).toEqual(['Wireframes', 'Diseño UI', 'Web en pruebas']);
    expect(r.deliverables.every((d) => d.status === 'en_curso' && d.projectId === 'px')).toBe(true);
  });
  it('sin fecha de inicio cuenta desde hoy; una clave desconocida no crea nada', () => {
    expect(aplicarPlantilla({ id: 'px', start: null, contactId: null }, 'branding', HOY, id, AHORA).tasks[0].due).toBe(HOY);
    expect(aplicarPlantilla({ id: 'px', start: null, contactId: null }, 'nada', HOY, id, AHORA)).toEqual({ tasks: [], deliverables: [] });
  });
  it('todas las plantillas tienen tareas, entregables, horas y rondas', () => {
    for (const t of Object.values(PLANTILLAS)) {
      expect(t.tasks.length).toBeGreaterThan(0);
      expect(t.dlv.length).toBeGreaterThan(0);
      expect(t.hours).toBeGreaterThan(0);
      expect(t.rounds).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Flujo «contacto → oportunidad ganada → proyecto con plantilla»', () => {
  it('ganar crea el proyecto con la plantilla de su disciplina, el presupuesto y el cliente', () => {
    const r = moverOportunidad(deal(), 'ganado', ctx());
    expect(r.cambios).toMatchObject({ stage: 'ganado', prob: 100, closedAt: HOY });
    expect(r.proyecto).not.toBeNull();
    const { project, tasks, deliverables, plantilla } = r.proyecto!;
    expect(r.cambios.projectId).toBe(project.id);
    expect(project).toMatchObject({ name: 'Web para Café Nómada', contactId: 'c10', discipline: 'web', status: 'briefing', budget: 3200, hoursBudget: 60, roundsIncluded: 2, start: HOY, end: sumarDias(HOY, 50), description: 'Con reservas' });
    expect(plantilla).toBe('Web corporativa');
    expect(tasks).toHaveLength(9);
    expect(tasks.every((t) => t.projectId === project.id && t.contactId === 'c10')).toBe(true);
    expect(deliverables).toHaveLength(3);
  });
  it('si no hay persona, usa la primera de la empresa; sin plantilla calcula horas con la tarifa', () => {
    const r = moverOportunidad(deal({ contactId: null, discipline: null, value: 1000 }), 'ganado', ctx());
    expect(r.proyecto!.project.contactId).toBe('c10');
    expect(r.proyecto!.project.hoursBudget).toBe(20);
    expect(r.proyecto!.project.end).toBe(sumarDias(HOY, 45));
    expect(r.proyecto!.tasks).toHaveLength(0);
    expect(r.proyecto!.plantilla).toBeNull();
  });
  it('una oportunidad ganada que ya tiene proyecto no crea otro', () => {
    expect(moverOportunidad(deal({ projectId: 'p1' }), 'ganado', ctx()).proyecto).toBeNull();
  });
  it('perder guarda la fecha y la probabilidad 0; reabrir quita la fecha de cierre y el motivo', () => {
    expect(moverOportunidad(deal(), 'perdido', ctx()).cambios).toMatchObject({ stage: 'perdido', prob: 0, closedAt: HOY });
    expect(moverOportunidad(deal({ stage: 'perdido', closedAt: '2026-10-01', lostReason: 'Precio' }), 'propuesta', ctx()).cambios).toMatchObject({ stage: 'propuesta', prob: 40, closedAt: null, lostReason: '' });
  });
  it('desde el formulario respeta la probabilidad que escribió la persona', () => {
    expect(moverOportunidad(deal({ prob: 55 }), 'negociacion', ctx({ desdeFormulario: true })).cambios.prob).toBeUndefined();
    expect(moverOportunidad(deal({ stage: 'ganado', closedAt: '2026-11-10' }), 'ganado', ctx({ desdeFormulario: true })).cambios.closedAt).toBe('2026-11-10');
  });
  it('el formulario de oportunidad ganada da el estado que dispara el proyecto', () => {
    const v = aValores('deal', { ...porDefecto('deal', HOY), title: 'Logo', value: '900', stage: 'ganado', discipline: 'branding' });
    const d = aEntidad('deal', v, { id: 'dz', createdAt: AHORA, hoy: HOY }, null) as Oportunidad;
    expect(d).toMatchObject({ stage: 'ganado', prob: 100, closedAt: HOY, projectId: null });
    expect(moverOportunidad(d, 'ganado', ctx({ desdeFormulario: true })).proyecto?.plantilla).toBe('Identidad de marca');
  });
});

describe('Oportunidades: tablero y cifras', () => {
  it('el tablero esconde lo cerrado hace más de 90 días', () => {
    expect(enTablero(deal({ stage: 'ganado', closedAt: sumarDias(HOY, -90) }), HOY)).toBe(true);
    expect(enTablero(deal({ stage: 'perdido', closedAt: sumarDias(HOY, -91) }), HOY)).toBe(false);
    expect(enTablero(deal({ stage: 'nuevo' }), HOY)).toBe(true);
  });
  it('en juego, ponderado, ganado y tasa de éxito con los datos de ejemplo', () => {
    const k = cifrasOportunidades(datos().deals, HOY);
    expect(k.abiertas).toBe(8);
    expect(k.enJuego).toBe(3200 + 2400 + 5400 + 1200 + 1800 + 2000 + 7200 + 900);
    expect(k.ponderado).toBe(Math.round(640 + 960 + 3780 + 480 + 1260 + 200 + 1440 + 90));
    expect(k.ganado90).toBe(6500 + 1900);
    expect(k.tasa).toBe(67); // 2 ganadas y 1 perdida
  });
});

describe('Proyectos: fases y progreso', () => {
  it('pausar recuerda la fase y reanudar vuelve a ella', () => {
    const p = { status: 'concepto' as const, prevStatus: null };
    const pausado = { ...p, ...cambiosDeFase(p, 'pausa') } as Pick<Proyecto, 'status' | 'prevStatus'>;
    expect(pausado).toEqual({ status: 'pausa', prevStatus: 'concepto' });
    expect(faseAlReanudar(pausado)).toBe('concepto');
    expect(cambiosDeFase(pausado, 'concepto')).toEqual({ status: 'concepto', prevStatus: null });
    expect(cambiosDeFase(p, 'concepto')).toEqual({});
    expect(faseAlReanudar({ prevStatus: null })).toBe('produccion');
  });
  it('en marcha y progreso de tareas', () => {
    const c = datos();
    expect(c.projects.filter(enMarcha).map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p6', 'p7']);
    expect(progreso(c.tasks, 'p1')).toEqual({ hechas: 2, total: 5, pct: 40 });
    expect(progreso(c.tasks, 'nada')).toEqual({ hechas: 0, total: 0, pct: 0 });
  });
  it('el formulario de proyecto nuevo con plantilla rellena horas, rondas y disciplina', () => {
    const v = aValores('project', { ...porDefecto('project', HOY), name: 'Marca nueva', template: 'branding', roundsIncluded: '' });
    const p = aEntidad('project', v, { id: 'pz', createdAt: AHORA, hoy: HOY }, null) as Proyecto;
    expect(p).toMatchObject({ name: 'Marca nueva', discipline: 'branding', hoursBudget: 35, roundsIncluded: 3, status: 'briefing', priority: 'media', start: HOY, collaborators: [] });
  });
  it('pausar desde el formulario guarda la fase anterior y conserva el equipo', () => {
    const previo = datos().projects.find((p) => p.id === 'p1')!;
    const v = aValores('project', { ...previo, status: 'pausa' });
    const p = aEntidad('project', v, { id: 'p1', createdAt: previo.createdAt, hoy: HOY }, previo) as Proyecto;
    expect(p).toMatchObject({ status: 'pausa', prevStatus: 'produccion', collaborators: ['c6'], budget: 4800 });
  });
});

describe('Tarea rápida en lenguaje natural', () => {
  const c = datos();
  const leer = (t: string) => leerTareaRapida(t, HOY, c.contacts, c.projects);
  it('reconoce mañana, urgente y @contacto (con su proyecto en marcha)', () => {
    expect(leer('Llamar a @Lucía mañana urgente')).toEqual({ title: 'Llamar a Lucía', due: '2026-11-14', urgent: true, important: false, contactId: 'c1', projectId: 'p1' });
  });
  it('hoy, pasado mañana e importante; sin prioridad → importante', () => {
    expect(leer('enviar factura hoy')).toMatchObject({ title: 'Enviar factura', due: HOY, urgent: false, important: true });
    expect(leer('revisar textos pasado mañana importante')).toMatchObject({ title: 'Revisar textos', due: '2026-11-15', important: true });
    expect(leer('pedir papel!')).toMatchObject({ title: 'Pedir papel', urgent: true, important: false });
  });
  it('días de la semana: la próxima vez que llegan (hoy viernes → el viernes que viene)', () => {
    expect(leer('reunión el lunes').due).toBe('2026-11-16');
    expect(leer('Informe viernes').due).toBe('2026-11-20');
    expect(leer('Comprar miércoles').due).toBe('2026-11-18');
    expect(leer('Comprar miércoles').title).toBe('Comprar');
  });
  it('#proyecto vincula el proyecto y se quita del título', () => {
    expect(leer('Maquetar portada #catálogo')).toMatchObject({ title: 'Maquetar portada', projectId: 'p4' });
  });
  it('si no encuentra el contacto, deja el texto tal cual', () => {
    expect(leer('Escribir a @nadie')).toMatchObject({ title: 'Escribir a @nadie', contactId: null });
  });
});

describe('Avisos (campana)', () => {
  it('salen tareas atrasadas y de hoy, reuniones de hoy y mañana, entregables esperando y oportunidades sin decidir', () => {
    const a = calcularAvisos(datos(), HOY);
    const claves = a.map((x) => x.clave);
    expect(claves).toContain(`late-t2-${sumarDias(HOY, -1)}`);
    expect(claves).toContain(`today-t1-${HOY}`);
    expect(claves).toContain(`ev-e1-${HOY}`);
    expect(claves).toContain(`ev-e5-${sumarDias(HOY, 1)}`);
    expect(claves).not.toContain(`ev-e4-${sumarDias(HOY, 2)}`);
    expect(claves).toContain(`dw-v2-${sumarDias(HOY, -6)}`);
    expect(claves.some((k) => k.startsWith('dw-v5'))).toBe(false); // solo 1 día esperando
    expect(claves).toContain(`deal-d11-${sumarDias(HOY, -3)}`);
    expect(a.find((x) => x.clave.startsWith('rgpd-'))?.texto).toBe('2 contactos sin permiso para guardar sus datos');
  });
  it('las tareas hechas no avisan y aplazar una tarea la vuelve a mostrar como nueva', () => {
    const c = datos();
    const antes = calcularAvisos(c, HOY).find((x) => x.clave.startsWith('late-t2'))!;
    c.tasks = c.tasks.map((t) => (t.id === 't2' ? { ...t, due: sumarDias(HOY, -2) } : t));
    const despues = calcularAvisos(c, HOY).find((x) => x.clave.startsWith('late-t2'))!;
    expect(despues.clave).not.toBe(antes.clave);
    c.tasks = c.tasks.map((t) => (t.id === 't2' ? { ...t, done: true } : t));
    expect(calcularAvisos(c, HOY).some((x) => x.clave.startsWith('late-t2'))).toBe(false);
  });
  it('cuenta los no leídos', () => {
    const a = calcularAvisos(datos(), HOY);
    expect(sinLeer(a, [])).toBe(a.length);
    expect(sinLeer(a, [a[0].clave, 'otra'])).toBe(a.length - 1);
  });
  it('avisa de clientes sin contacto en 30 días y de los nuevos que llegan por la web', () => {
    const c = datos();
    c.activities = c.activities.filter((x) => x.contactId !== 'c4');
    c.activities.push({ id: 'ax', type: 'llamada', text: 'Hola', date: sumarDias(HOY, -40), contactId: 'c4', projectId: null, createdAt: AHORA });
    c.contacts.push({ ...c.contacts[0], id: 'cw', name: 'Ana Web', consentVia: 'Formulario web', createdAt: `${sumarDias(HOY, -1)}T08:00:00.000Z` });
    const claves = calcularAvisos(c, HOY).map((x) => x.clave);
    expect(claves).toContain(`fu-c4-${sumarDias(HOY, -40)}`);
    expect(claves).toContain('lead-cw');
  });
});

describe('Buscador ⌘K', () => {
  const c = datos();
  it('busca sin tildes ni mayúsculas en contactos, empresas, proyectos y tareas', () => {
    const g = buscar(c, 'lucia', HOY);
    expect(g.find((x) => x.titulo === 'Contactos')?.items.map((i) => i.label)).toEqual(['Lucía Fernández']);
    expect(buscar(c, 'ESPIGA', HOY).map((x) => x.titulo)).toEqual(['Contactos', 'Empresas', 'Proyectos', 'Oportunidades', 'Facturas', 'Gastos', 'Contratos', 'Documentos']);
  });
  it('cada resultado lleva a su sitio', () => {
    const g = buscar(c, 'catálogo', HOY);
    expect(g.find((x) => x.titulo === 'Proyectos')?.items[0].destino).toEqual({ ruta: '/proyectos?p=p4' });
    expect(g.find((x) => x.titulo === 'Documentos')?.items[0].destino).toEqual({ ruta: '/proyectos?p=p4' });
    expect(buscar(c, 'wireframes', HOY).find((x) => x.titulo === 'Tareas')?.items[0].destino).toEqual({ formulario: 'task', id: 't19' });
  });
  it('sin texto no devuelve nada', () => {
    expect(buscar(c, '  ', HOY)).toEqual([]);
  });
});

describe('Calendario', () => {
  it('la cuadrícula empieza en lunes y tiene 5 o 6 semanas', () => {
    const nov = diasDelMes(2026, 10);
    expect(nov[0].fecha).toBe('2026-10-26'); // 1 de noviembre de 2026 es domingo
    expect(nov).toHaveLength(42);
    const feb = diasDelMes(2027, 1);
    expect(feb[0].fecha).toBe('2027-02-01');
    expect(feb).toHaveLength(35);
    expect(feb.filter((d) => d.delMes)).toHaveLength(28);
  });
  it('un día muestra reuniones por hora y tareas abiertas (las urgentes e importantes en rosa)', () => {
    const it = elementosDelDia(datos(), HOY);
    expect(it.slice(0, 2).map((x) => x.texto)).toEqual(['10:00 Seguimiento con Estudio Alba', '16:30 Revisión de anuncios con Clínica Sanz']);
    expect(it.find((x) => x.clave === 'tt1')?.cls).toBe('rose');
    expect(it.find((x) => x.clave === 'tt7')?.cls).toBe('butter');
  });
  it('cambia de mes pasando de año', () => {
    expect(moverMes(2026, 11, 1)).toEqual({ anio: 2027, mes: 0 });
    expect(moverMes(2026, 0, -1)).toEqual({ anio: 2025, mes: 11 });
  });
});

describe('Historial y datos', () => {
  it('el historial del proyecto incluye entregables enviados y aprobados', () => {
    const h = historial(datos(), { projectId: 'p1' }, HOY);
    expect(h.some((x) => x.titulo === 'Entregable aprobado' && x.texto === 'Wireframes')).toBe(true);
    expect(h.some((x) => x.titulo === 'Entregable enviado · v1' && x.texto === 'Diseño UI · home e interiores')).toBe(true);
  });
  it('la demo crea varias filas de una vez', async () => {
    const mapa = new Map<string, string>();
    const store: Guardado = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => void mapa.set(k, v), removeItem: (k) => void mapa.delete(k) };
    const a = crearAlmacenDemo(store);
    const antes = (await a.cargarColecciones()).tasks.length;
    const { tasks } = aplicarPlantilla({ id: 'p1', start: HOY, contactId: 'c1' }, 'grafico', HOY, id, AHORA);
    await a.crearVarios('tasks', tasks);
    expect((await a.cargarColecciones()).tasks.length).toBe(antes + tasks.length);
  });
});
