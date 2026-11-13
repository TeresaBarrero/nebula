import { describe, expect, it } from 'vitest';
import { aEntidad, aValores, porDefecto } from '@/components/app/formularios/conversion';
import { NOMBRES_COLECCION, type Colecciones, type Tarea } from '@/lib/datos/entidades';
import { semillaDemo } from '@/lib/datos/semilla';
import { CLAVE_DEMO, crearAlmacenDemo, leerDemo, type Guardado } from '@/lib/datos/almacen-demo';
import { diasHasta, lunesDe, relativa, sumarDias, sumarMeses } from './fechas';
import { empresaDe, historial, ultimoContacto } from './historial';
import { bloqueante, cuadranteDe, marcarTarea, siguienteFecha } from './tareas';
import { aplicarBorrado, deshacerBorrado, efectoDeBorrar } from './vinculos';

const HOY = '2026-11-13'; // viernes
const datos = () => semillaDemo(HOY);
let n = 0;
const id = () => `nuevo-${++n}`;

describe('Fechas', () => {
  it('suma días y meses (fin de mes incluido)', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2026-11-13', 1)).toBe('2026-12-13');
  });
  it('días hasta y semana desde el lunes', () => {
    expect(diasHasta('2026-11-10', HOY)).toBe(-3);
    expect(lunesDe(HOY)).toBe('2026-11-09');
    expect(lunesDe('2026-11-09')).toBe('2026-11-09');
    expect(lunesDe('2026-11-15')).toBe('2026-11-09');
  });
  it('fechas relativas en español', () => {
    expect(relativa(HOY, HOY)).toBe('Hoy');
    expect(relativa('2026-11-14', HOY)).toBe('Mañana');
    expect(relativa('2026-11-12', HOY)).toBe('Ayer');
  });
});

describe('Datos de ejemplo de la demo', () => {
  it('ningún vínculo apunta a algo que no existe', () => {
    const c = datos();
    const ids = (col: keyof Colecciones) => new Set((c[col] as { id: string }[]).map((x) => x.id));
    const [co, ct, pr, ta] = [ids('companies'), ids('contacts'), ids('projects'), ids('tasks')];
    const ok = (set: Set<string>, v: string | null) => v === null || set.has(v);
    for (const x of c.contacts) expect(ok(co, x.companyId)).toBe(true);
    for (const x of c.deals) expect(ok(co, x.companyId) && ok(ct, x.contactId) && ok(pr, x.projectId)).toBe(true);
    for (const x of c.projects) expect(ok(ct, x.contactId) && x.collaborators.every((k) => ct.has(k))).toBe(true);
    for (const x of c.tasks) expect(ok(pr, x.projectId) && ok(ct, x.contactId) && ok(ct, x.assigneeId) && ok(ta, x.blockedBy)).toBe(true);
    for (const x of [...c.events, ...c.notes, ...c.activities]) expect(ok(ct, x.contactId) && ok(pr, x.projectId)).toBe(true);
    for (const x of c.files) expect(ok(ct, x.contactId) && ok(co, x.companyId) && ok(pr, x.projectId)).toBe(true);
    for (const x of c.deliverables) expect(pr.has(x.projectId)).toBe(true);
  });
  it('tiene las cantidades del prototipo y fechas de esta semana', () => {
    const c = datos();
    expect(c.companies).toHaveLength(9);
    expect(c.contacts).toHaveLength(15);
    expect(c.deals).toHaveLength(11);
    expect(c.projects).toHaveLength(8);
    expect(c.tasks.filter((t) => t.due === HOY && !t.done).length).toBeGreaterThan(0);
    expect(c.events.filter((e) => e.date === HOY)).toHaveLength(2);
  });
  it('ids únicos en cada colección', () => {
    const c = datos();
    for (const col of NOMBRES_COLECCION) {
      const lista = c[col] as { id: string }[];
      expect(new Set(lista.map((x) => x.id)).size).toBe(lista.length);
    }
  });
});

describe('Borrar con vínculos (igual que la base de datos)', () => {
  it('al borrar una empresa, sus personas y oportunidades quedan sin empresa', () => {
    const c = datos();
    const ef = efectoDeBorrar(c, 'companies', 'co1');
    const d = aplicarBorrado(c, ef);
    expect(d.companies.find((x) => x.id === 'co1')).toBeUndefined();
    expect(d.contacts.find((x) => x.id === 'c1')?.companyId).toBeNull();
    expect(d.deals.find((x) => x.id === 'd5')?.companyId).toBeNull();
    expect(d.contacts).toHaveLength(c.contacts.length);
  });
  it('al borrar un proyecto se borran sus entregables y se desvinculan sus tareas', () => {
    const c = datos();
    const d = aplicarBorrado(c, efectoDeBorrar(c, 'projects', 'p1'));
    expect(d.deliverables.some((x) => x.projectId === 'p1')).toBe(false);
    expect(d.tasks.find((x) => x.id === 't1')?.projectId).toBeNull();
    expect(d.tasks).toHaveLength(c.tasks.length);
  });
  it('al borrar un colaborador sale del equipo de los proyectos y de las tareas asignadas', () => {
    const c = datos();
    const d = aplicarBorrado(c, efectoDeBorrar(c, 'contacts', 'c6'));
    expect(d.projects.find((x) => x.id === 'p1')?.collaborators).toEqual([]);
    expect(d.tasks.find((x) => x.id === 't24')?.assigneeId).toBeNull();
  });
  it('al borrar una tarea, las que dependían de ella quedan libres', () => {
    const c = datos();
    const d = aplicarBorrado(c, efectoDeBorrar(c, 'tasks', 't1'));
    expect(d.tasks.find((x) => x.id === 't10')?.blockedBy).toBeNull();
  });
  it('«Deshacer» lo deja todo exactamente como estaba', () => {
    const c = datos();
    for (const [col, id] of [['companies', 'co1'], ['projects', 'p1'], ['contacts', 'c6'], ['tasks', 't1']] as const) {
      const ef = efectoDeBorrar(c, col, id);
      const vuelta = deshacerBorrado(aplicarBorrado(c, ef), ef);
      for (const k of NOMBRES_COLECCION) {
        const orden = (xs: { id: string }[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
        expect(orden(vuelta[k] as { id: string }[])).toEqual(orden(c[k] as { id: string }[]));
      }
    }
  });
});

describe('Tareas: repetición y dependencias (SPEC §7.13)', () => {
  const base = (o: Partial<Tarea> = {}): Tarea => ({
    id: 'x', title: 'X', due: HOY, urgent: false, important: true, done: false, projectId: null, contactId: null, assigneeId: null,
    estimate: 2, repeat: '', blockedBy: null, nextCreated: false, phase: null, createdAt: '', ...o,
  });
  const fmt = (f: string) => f;

  it('cuadrantes de la matriz', () => {
    expect(cuadranteDe({ urgent: true, important: true })).toBe('q1');
    expect(cuadranteDe({ urgent: false, important: true })).toBe('q2');
    expect(cuadranteDe({ urgent: true, important: false })).toBe('q3');
    expect(cuadranteDe({ urgent: false, important: false })).toBe('q4');
  });
  it('siguiente fecha: +1 día, +7 días, +1 mes desde su fecha, o desde hoy si ya pasó', () => {
    expect(siguienteFecha({ due: '2026-11-20', repeat: 'diaria' }, HOY)).toBe('2026-11-21');
    expect(siguienteFecha({ due: '2026-11-20', repeat: 'semanal' }, HOY)).toBe('2026-11-27');
    expect(siguienteFecha({ due: '2026-11-20', repeat: 'mensual' }, HOY)).toBe('2026-12-20');
    expect(siguienteFecha({ due: '2026-11-01', repeat: 'semanal' }, HOY)).toBe('2026-11-20');
    expect(siguienteFecha({ due: null, repeat: 'diaria' }, HOY)).toBe('2026-11-14');
    expect(siguienteFecha({ due: HOY, repeat: '' }, HOY)).toBeNull();
  });
  it('completar una que se repite crea la siguiente una sola vez', () => {
    const t = base({ repeat: 'semanal' });
    const r = marcarTarea(t, [t], HOY, id, fmt);
    expect(r.ok && r.siguiente?.due).toBe('2026-11-20');
    expect(r.ok && r.cambios).toEqual({ done: true, nextCreated: true });
    const otra = marcarTarea({ ...t, nextCreated: true }, [t], HOY, id, fmt);
    expect(otra.ok && otra.siguiente).toBeNull();
  });
  it('una tarea bloqueada no se puede completar', () => {
    const a = base({ id: 'a', title: 'Diseño' });
    const b = base({ id: 'b', title: 'Maquetación', blockedBy: 'a' });
    expect(bloqueante(b, [a, b])?.id).toBe('a');
    const r = marcarTarea(b, [a, b], HOY, id, fmt);
    expect(r).toEqual({ ok: false, aviso: 'Primero hay que terminar «Diseño»' });
  });
  it('al terminar la bloqueante avisa de la que queda libre', () => {
    const a = base({ id: 'a', title: 'Diseño' });
    const b = base({ id: 'b', title: 'Maquetación', blockedBy: 'a' });
    const r = marcarTarea(a, [a, b], HOY, id, fmt);
    expect(r.ok && r.mensaje).toBe('Hecha. Ya puedes empezar «Maquetación»');
    expect(bloqueante(b, [{ ...a, done: true }, b])).toBeNull();
  });
  it('desmarcar una hecha la deja pendiente', () => {
    const r = marcarTarea(base({ done: true }), [], HOY, id, fmt);
    expect(r.ok && r.cambios).toEqual({ done: false });
  });
});

describe('Historial unificado (SPEC §7.11)', () => {
  it('mezcla apuntes, tareas, reuniones, oportunidades, notas y documentos por fecha', () => {
    const h = historial(datos(), { contactId: 'c1' }, HOY);
    const tipos = new Set(h.map((x) => x.clave[0]));
    for (const t of ['a', 't', 'e', 'd', 'n', 'f']) expect(tipos.has(t)).toBe(true);
    expect([...h].map((x) => x.fecha)).toEqual([...h].map((x) => x.fecha).sort().reverse());
  });
  it('el de una empresa incluye lo de sus personas', () => {
    const h = historial(datos(), { companyId: 'co1' }, HOY);
    expect(h.some((x) => x.texto.includes('wireframes'))).toBe(true); // apunte de Lucía
  });
  it('último contacto y empresa', () => {
    const c = datos();
    expect(ultimoContacto(c, 'c1', HOY)).toBe(HOY); // reunión de hoy
    expect(empresaDe(c, c.contacts.find((x) => x.id === 'c1'))).toBe('Estudio Alba S.L.');
    expect(empresaDe(c, c.contacts.find((x) => x.id === 'c6'))).toBe('Desarrollo web');
  });
});

describe('Formularios', () => {
  const b = { id: 'z', createdAt: 'ahora', hoy: HOY };
  it('contacto: etiquetas a lista, campos de colaborador solo si lo es, permiso con fecha', () => {
    const v = { ...aValores('contact', porDefecto('contact', HOY)), name: ' Ana ', tags: 'web, , branding ', rate: '40', specialty: 'web', consent: true };
    const x = aEntidad('contact', v, b, null);
    expect(x).toMatchObject({ name: 'Ana', tags: ['web', 'branding'], rate: null, specialty: null, consent: true, consentDate: HOY });
    const colab = aEntidad('contact', { ...v, type: 'Colaborador' }, b, null);
    expect(colab).toMatchObject({ rate: 40, specialty: 'web', availability: 'disponible' });
  });
  it('oportunidad: ganada = 100 %, perdida = 0 % con motivo, fecha de cierre', () => {
    const v = { ...aValores('deal', porDefecto('deal', HOY)), title: 'Web', value: '1.500', stage: 'ganado', prob: '40' };
    expect(aEntidad('deal', v, b, null)).toMatchObject({ prob: 100, closedAt: HOY });
    const p = aEntidad('deal', { ...v, stage: 'perdido', lostReason: 'Precio' }, b, null);
    expect(p).toMatchObject({ prob: 0, lostReason: 'Precio', closedAt: HOY });
    expect(aEntidad('deal', { ...v, stage: 'propuesta', lostReason: 'Precio' }, b, null)).toMatchObject({ lostReason: '', closedAt: null, prob: 40 });
  });
  it('tarea: una tarea no puede depender de sí misma; vacíos a null', () => {
    const x = aEntidad('task', { title: 'T', blockedBy: 'z', due: '', urgent: true, important: false, estimate: '' }, b, null);
    expect(x).toMatchObject({ blockedBy: null, due: null, urgent: true, important: false, estimate: 2 });
  });
  it('reunión: hora inválida se descarta', () => {
    expect(aEntidad('event', { title: 'R', date: HOY, time: '25' }, b, null)).toMatchObject({ time: '' });
  });
});

describe('Demo con todos los datos', () => {
  const mem = (): Guardado => {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  };
  it('crear, cambiar y borrar se guardan', async () => {
    const m = mem();
    const a = crearAlmacenDemo(m);
    const c0 = await a.cargarColecciones();
    await a.crear('notes', { id: 'nn', text: 'Hola', color: 'sage', pinned: false, contactId: null, projectId: null, date: HOY, createdAt: '' });
    await a.actualizar('contacts', 'c1', { phone: '000' });
    await a.borrar('companies', 'co1');
    const c1 = await crearAlmacenDemo(m).cargarColecciones();
    expect(c1.notes).toHaveLength(c0.notes.length + 1);
    expect(c1.contacts.find((x) => x.id === 'c1')).toMatchObject({ phone: '000', companyId: null });
    expect(c1.companies.find((x) => x.id === 'co1')).toBeUndefined();
  });
  it('quien usó la demo de la Fase 0 conserva su perfil y recibe los datos de ejemplo', () => {
    const m = mem();
    m.setItem(CLAVE_DEMO, JSON.stringify({ v: 1, perfil: { name: 'Lucía' }, ajustes: { business: 'Lu' }, asistenteHecho: true }));
    const s = leerDemo(m, HOY);
    expect(s.perfil.name).toBe('Lucía');
    expect(s.asistenteHecho).toBe(true);
    expect(s.colecciones.contacts).toHaveLength(15);
  });
});
