import { describe, expect, it } from 'vitest';
import { aEntidad, aValores, porDefecto } from '@/components/app/formularios/conversion';
import { CLAVE_DEMO, crearAlmacenDemo, type Guardado } from '@/lib/datos/almacen-demo';
import type { Acceso, Entregable, Proyecto, Tarea } from '@/lib/datos/entidades';
import { semillaDemo } from '@/lib/datos/semilla';
import { calcularAvisos } from './avisos';
import { buscar } from './buscador';
import { sumarDias } from './fechas';
import { historial } from './historial';
import { porDisciplina } from './informes';
import {
  aprobarEntregable,
  briefDe,
  capacidadDe,
  cargaDe,
  cifrasContenidos,
  cobroDeRondas,
  colorCarga,
  coloresDe,
  destinoDe,
  duracion,
  entradaDeCronometro,
  enviarVersion,
  eurHoraReal,
  horas,
  horasDeMas,
  horasProyecto,
  hueco,
  marcaDe,
  minutosIguala,
  pedirCambios,
  portfolioDe,
  reloj,
  rondasDe,
  semanas,
  textoCaso,
} from './trabajo';

const HOY = '2026-11-18'; // miércoles
const AHORA = '2026-11-18T10:00:00.000Z';
const datos = () => semillaDemo(HOY);
const entregable = (o: Partial<Entregable> = {}): Entregable => ({
  id: 'v', projectId: 'p', name: 'Logotipo', status: 'en_curso', sentAt: null, approvedAt: null, billedExtra: 0, versions: [], feedback: [], createdAt: AHORA, ...o,
});
const tarea = (o: Partial<Tarea>): Tarea => ({
  id: 'x', title: 't', due: HOY, urgent: false, important: true, done: false, projectId: null, contactId: null, assigneeId: null, estimate: 2, repeat: '', blockedBy: null, nextCreated: false, phase: null, createdAt: AHORA, ...o,
});
const almacen = () => {
  const mapa = new Map<string, string>();
  const store: Guardado = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => void mapa.set(k, v), removeItem: (k) => void mapa.delete(k) };
  return { a: crearAlmacenDemo(store), mapa, store };
};

describe('Entregables y rondas de cambios (SPEC §7.7)', () => {
  it('enviar versión, pedir cambios y aprobar', () => {
    let v = entregable();
    v = { ...v, ...enviarVersion(v, HOY) };
    expect(v).toMatchObject({ status: 'enviado', sentAt: HOY, versions: [{ v: 1, date: HOY }] });
    v = { ...v, ...pedirCambios(v, '  Cambiar el color  ', HOY) };
    expect(v).toMatchObject({ status: 'cambios', feedback: [{ date: HOY, text: 'Cambiar el color' }] });
    v = { ...v, ...enviarVersion(v, HOY) };
    expect(v.versions).toHaveLength(2);
    expect({ ...v, ...aprobarEntregable(HOY) }).toMatchObject({ status: 'aprobado', approvedAt: HOY });
    expect(pedirCambios(entregable(), '', HOY).feedback?.[0].text).toBe('Cambios solicitados');
  });
  it('cuenta las rondas usadas, las extra y las que faltan por cobrar', () => {
    const tres = entregable({ feedback: [1, 2, 3].map((k) => ({ date: HOY, text: `r${k}` })) });
    expect(rondasDe(tres, { roundsIncluded: 2 })).toEqual({ incluidas: 2, usadas: 3, extra: 1, porCobrar: 1 });
    expect(rondasDe(tres, { roundsIncluded: 3 })).toEqual({ incluidas: 3, usadas: 3, extra: 0, porCobrar: 0 });
    expect(rondasDe(entregable(), undefined).incluidas).toBe(2);
  });
  it('cobrar las rondas extra pone qty × precio y no se cobran dos veces', () => {
    const v = entregable({ feedback: [1, 2, 3, 4].map((k) => ({ date: HOY, text: `r${k}` })) });
    const cobro = cobroDeRondas(v, { roundsIncluded: 2 }, 120)!;
    expect(cobro).toEqual({ linea: { desc: 'Ronda de cambios extra · Logotipo', qty: 2, price: 120 }, billedExtra: 2 });
    const yaCobrado = { ...v, billedExtra: cobro.billedExtra };
    expect(cobroDeRondas(yaCobrado, { roundsIncluded: 2 }, 120)).toBeNull();
    const otraMas = { ...yaCobrado, feedback: [...yaCobrado.feedback!, { date: HOY, text: 'r5' }] };
    expect(cobroDeRondas(otraMas, { roundsIncluded: 2 }, 120)).toEqual({ linea: { desc: 'Ronda de cambios extra · Logotipo', qty: 1, price: 120 }, billedExtra: 3 });
  });
  it('en los datos de ejemplo, las creatividades de Clínica Sanz tienen una ronda extra sin cobrar', () => {
    const c = datos();
    const v = c.deliverables.find((x) => x.id === 'v6')!;
    expect(rondasDe(v, c.projects.find((p) => p.id === 'p3'))).toEqual({ incluidas: 2, usadas: 3, extra: 1, porCobrar: 1 });
    expect(calcularAvisos(c, HOY).some((a) => a.clave === 'dx-v6-1')).toBe(true);
  });
  it('el historial del proyecto muestra versiones y rondas', () => {
    const h = historial(datos(), { projectId: 'p2' }, HOY).map((x) => x.titulo);
    expect(h).toContain('Entregable enviado · v3');
    expect(h).toContain('El cliente pide cambios · ronda 2');
  });
});

describe('Horas y cronómetro', () => {
  it('formatos de horas', () => {
    expect(horas(90)).toBe('1,5 h');
    expect(horas(0)).toBe('0 h');
    expect(duracion(95)).toBe('1 h 35 min');
    expect(duracion(60)).toBe('1 h');
    expect(duracion(45)).toBe('45 min');
    expect(reloj('2026-11-18T10:00:00.000Z', new Date('2026-11-18T11:02:05.000Z'))).toBe('01:02:05');
  });
  it('al parar el cronómetro se apunta lo transcurrido (mínimo 1 minuto)', () => {
    const t = { start: '2026-11-18T09:00:00.000Z', projectId: 'p1', retainerId: null, taskId: 't1', note: '' };
    const e = entradaDeCronometro(t, new Date('2026-11-18T10:30:20.000Z'), HOY, datos().tasks, 'h');
    expect(e).toMatchObject({ date: HOY, minutes: 90, projectId: 'p1', taskId: 't1', note: 'Enviar diseño de interiores a Lucía', billable: true });
    expect(entradaDeCronometro({ ...t, projectId: null, taskId: null }, new Date('2026-11-18T09:00:10.000Z'), HOY, [], 'h')).toMatchObject({ minutes: 1, billable: false });
  });
  it('horas del proyecto, si se pasa de lo previsto y € por hora real', () => {
    const c = datos();
    const h = horasProyecto(c, c.projects.find((p) => p.id === 'p4')!);
    expect(h.min).toBe(11 * 390);
    expect(h.sePasa).toBe(true);
    expect(h.eurh).toBe(Math.round((3200 / ((11 * 390) / 60)) * 100) / 100);
    expect(eurHoraReal(c, HOY)).toBeGreaterThan(0);
  });
  it('horas de más de una iguala: solo si pasa de las incluidas y una vez al mes', () => {
    const c = datos();
    const r = { ...c.retainers[0], hours: 1 };
    c.timeEntries = [{ id: 'z', date: HOY, minutes: 150, projectId: null, retainerId: r.id, taskId: null, note: '', billable: true, createdAt: AHORA }];
    expect(minutosIguala(c, r, HOY)).toBe(150);
    expect(horasDeMas(c, r, HOY)).toBe(1.5);
    expect(horasDeMas(c, { ...r, extraBilled: '2026-11' }, HOY)).toBe(0);
    expect(horasDeMas(c, { ...r, hours: 3 }, HOY)).toBe(0);
  });
  it('nombre de a qué se dedicó el tiempo', () => {
    const c = datos();
    expect(destinoDe(c, { projectId: 'p1', retainerId: null })).toBe('Web corporativa Estudio Alba');
    expect(destinoDe(c, { projectId: null, retainerId: 'r1' })).toBe('Redes sociales mensual');
    expect(destinoDe(c, { projectId: null, retainerId: null })).toBe('Trabajo interno');
  });
  it('los formularios de horas guardan minutos y no mezclan proyecto e iguala', () => {
    const b = { id: 'h', createdAt: AHORA, hoy: HOY };
    const e = aEntidad('time', aValores('time', { ...porDefecto('time', HOY), hours: '1,5', projectId: 'p1', retainerId: 'r1' }), b, null);
    expect(e).toMatchObject({ minutes: 90, projectId: 'p1', retainerId: null, billable: true });
    expect(aValores('time', { minutes: 135 }).hours).toBe('2.25');
  });
});

describe('Carga de trabajo (SPEC §7.8)', () => {
  const c = { tasks: [] as Tarea[], retainers: datos().retainers, contacts: datos().contacts };
  it('cuatro semanas desde el lunes', () => {
    expect(semanas(HOY)).toEqual([
      { a: '2026-11-16', b: '2026-11-22', i: 0 },
      { a: '2026-11-23', b: '2026-11-29', i: 1 },
      { a: '2026-11-30', b: '2026-12-06', i: 2 },
      { a: '2026-12-07', b: '2026-12-13', i: 3 },
    ]);
  });
  it('suma las horas estimadas, las atrasadas en la semana actual y las igualas / 4,3 para mí', () => {
    const ss = semanas(HOY);
    const tareas = [tarea({ id: 'a', estimate: 3 }), tarea({ id: 'b', due: '2026-11-01', estimate: 4 }), tarea({ id: 'c', due: '2026-11-25', estimate: 5 }), tarea({ id: 'd', estimate: 8, done: true }), tarea({ id: 'e', estimate: 6, assigneeId: 'c6' })];
    const igualas = (15 + 3 + 8) / 4.3;
    expect(cargaDe({ ...c, tasks: tareas }, null, ss[0]).h).toBe(Math.round((7 + igualas) * 10) / 10);
    expect(cargaDe({ ...c, tasks: tareas }, null, ss[1]).h).toBe(Math.round((5 + igualas) * 10) / 10);
    expect(cargaDe({ ...c, tasks: tareas }, 'c6', ss[0])).toMatchObject({ h: 6 });
  });
  it('capacidad y colores', () => {
    expect(capacidadDe(null, 30)).toBe(30);
    expect(capacidadDe({ availability: 'disponible' }, 30)).toBe(25);
    expect(capacidadDe({ availability: 'parcial' }, 30)).toBe(12);
    expect(capacidadDe({ availability: 'ocupado' }, 30)).toBe(0);
    expect(colorCarga(24, 30)).toBe('ok');
    expect(colorCarga(30, 30)).toBe('casi');
    expect(colorCarga(31, 30)).toBe('pasa');
    expect(colorCarga(1, 0)).toBe('pasa');
  });
  it('¿puedes aceptar un proyecto? primera semana con hueco y colaboradores libres', () => {
    const ss = semanas(HOY);
    const tareas = [tarea({ estimate: 20 }), tarea({ id: 'y', due: ss[1].a, estimate: 10 })];
    const r = hueco({ ...c, tasks: tareas }, 10, HOY, 30);
    expect(r.primera?.s.i).toBe(1); // semana 0: 30 − 20 − 6 de igualas = 4 h libres; semana 1: 14 h
    expect(r.ayudantes.map((a) => a.x.id).sort()).toEqual(['c13', 'c14', 'c6']);
  });
});

describe('Contenidos, marca y portfolio', () => {
  it('cifras de contenidos con los datos de ejemplo', () => {
    const k = cifrasContenidos(datos(), HOY);
    expect(k.revision).toBe(2);
    expect(k.ideas).toBe(4);
    expect(k.sinProgramar).toBe(0);
  });
  it('avisa de publicaciones de hoy o mañana sin programar', () => {
    const c = datos();
    c.posts[4] = { ...c.posts[4], date: sumarDias(HOY, 1), status: 'borrador' };
    expect(calcularAvisos(c, HOY).some((a) => a.clave === `po-${c.posts[4].id}-${sumarDias(HOY, 1)}`)).toBe(true);
    expect(cifrasContenidos(c, HOY).sinProgramar).toBe(1);
  });
  it('colores del kit de marca y valores por defecto', () => {
    expect(coloresDe({ colors: '#2f3e46, rojo, #84A98C,#fff' })).toEqual(['#2F3E46', '#84A98C', '#FFF']);
    expect(marcaDe({})).toEqual({ colors: '', fonts: '', tone: '', manual: '' });
    expect(briefDe({})).toEqual({ status: 'pendiente', sentDate: null, answers: {} });
    expect(portfolioDe({}).featured).toBe(false);
  });
  it('texto del caso de éxito', () => {
    const p = datos().projects.find((x) => x.id === 'p4')!;
    expect(textoCaso(p, 'Hotel Mirador S.A.', 'Diseño gráfico')).toBe(
      'Catálogo Hotel Mirador (Diseño gráfico)\nCliente: Hotel Mirador S.A.\nCatálogo de 48 páginas con fotografía propia para la temporada 2026.\nResultado: +22 % de reservas directas durante la temporada',
    );
  });
  it('los formularios de kit de marca y caso solo cambian su parte', () => {
    const e = datos().companies[0];
    const v = aValores('brand', e as unknown as Record<string, unknown>);
    expect(v.colors).toBe('#2F3E46, #84A98C, #CAD2C5, #F4F1DE');
    const nuevo = aEntidad('brand', { ...v, tone: 'Otro tono' }, { id: e.id, createdAt: e.createdAt, hoy: HOY }, e as unknown as Record<string, unknown>);
    expect(nuevo).toMatchObject({ name: e.name, nif: e.nif, brand: { tone: 'Otro tono', fonts: e.brand!.fonts } });
    const p = datos().projects.find((x) => x.id === 'p8')! as Proyecto;
    const caso = aEntidad('case', { ...aValores('case', p as unknown as Record<string, unknown>), permission: true }, { id: p.id, createdAt: p.createdAt, hoy: HOY }, p as unknown as Record<string, unknown>) as Proyecto;
    expect(caso.portfolio).toMatchObject({ featured: true, permission: true });
    expect(caso.budget).toBe(p.budget);
  });
  it('el buscador encuentra publicaciones', () => {
    expect(buscar(datos(), 'ortodoncia', HOY).map((g) => g.titulo)).toContain('Contenidos');
  });
  it('informes por disciplina con horas y € por hora', () => {
    const d = porDisciplina(datos(), HOY).find((x) => x.k === 'social')!;
    expect(d.min).toBeGreaterThan(0);
    expect(d.eurh).toBe(Math.round((d.facturado / (d.min / 60)) * 100) / 100);
  });
});

describe('Accesos (contraseña aparte y nunca en el formulario)', () => {
  it('el formulario no rellena la contraseña; vacía al editar = se queda la que había', () => {
    const a: Acceso = { id: 'k', companyId: 'co1', service: 'WP', url: '', username: 'u', hasPassword: true, createdAt: AHORA };
    const v = aValores('access', { ...a, password: 'secreta' } as unknown as Record<string, unknown>);
    expect(v.password).toBe('');
    expect(aEntidad('access', v, { id: 'k', createdAt: AHORA, hoy: HOY }, a as unknown as Record<string, unknown>)).toMatchObject({ password: undefined, hasPassword: true });
    expect(aEntidad('access', { ...v, password: 'nueva' }, { id: 'k', createdAt: AHORA, hoy: HOY }, a as unknown as Record<string, unknown>)).toMatchObject({ password: 'nueva' });
    expect(aEntidad('access', { service: 'X', password: '' }, { id: 'n', createdAt: AHORA, hoy: HOY }, null)).toMatchObject({ password: '', hasPassword: false });
  });
  it('en la demo se ve, se cambia y se conserva la contraseña', async () => {
    const { a } = almacen();
    await a.cargarColecciones();
    expect(await a.verClave('k1')).toBe('demo-Alba-2026');
    await a.actualizar('accesses', 'k1', { service: 'WordPress' });
    expect(await a.verClave('k1')).toBe('demo-Alba-2026');
    await a.actualizar('accesses', 'k1', { password: 'otra' });
    expect(await a.verClave('k1')).toBe('otra');
    await a.crear('accesses', { id: 'k9', companyId: 'co1', service: 'Nuevo', url: '', username: '', hasPassword: false, password: '', createdAt: AHORA });
    expect((await a.cargarColecciones()).accesses.find((x) => x.id === 'k9')?.hasPassword).toBe(false);
  });
  it('borrar una empresa borra sus accesos y sus publicaciones', async () => {
    const { a } = almacen();
    await a.cargarColecciones();
    await a.borrar('companies', 'co1');
    const c = await a.cargarColecciones();
    expect(c.accesses.some((x) => x.companyId === 'co1')).toBe(false);
    expect(c.posts.some((x) => x.companyId === 'co1')).toBe(false);
  });
});

describe('Demo: una demo de la Fase 2 recibe los datos de la Fase 3 sin perder lo hecho', () => {
  it('añade horas, contenidos, accesos, briefings, marcas y rondas', async () => {
    const { mapa, store } = almacen();
    const v3 = semillaDemo(HOY);
    const previas = {
      ...v3,
      tasks: v3.tasks.slice(0, 2),
      companies: v3.companies.filter((e) => e.id !== 'co5').map((e) => ({ ...e, brand: undefined })),
      projects: v3.projects.map((p) => ({ ...p, brief: undefined, portfolio: undefined })),
      deliverables: v3.deliverables.map((d) => ({ ...d, versions: undefined, feedback: undefined })),
    };
    for (const k of ['timeEntries', 'posts', 'accesses'] as const) delete (previas as Partial<typeof previas>)[k];
    mapa.set(CLAVE_DEMO, JSON.stringify({ v: 3, perfil: { name: 'X' }, ajustes: {}, asistenteHecho: false, colecciones: previas }));
    const c = await crearAlmacenDemo(store).cargarColecciones();
    expect(c.tasks).toHaveLength(2);
    expect(c.timeEntries.length).toBeGreaterThan(40);
    expect(c.posts.some((p) => p.companyId === 'co5')).toBe(false);
    expect(c.accesses.some((x) => x.companyId === 'co5')).toBe(false);
    expect(c.companies.find((e) => e.id === 'co1')?.brand?.fonts).toMatch(/Playfair/);
    expect(c.projects.find((p) => p.id === 'p6')?.brief?.status).toBe('enviado');
    expect(c.deliverables.find((v) => v.id === 'v6')?.feedback).toHaveLength(3);
  });
});
