import { describe, expect, it } from 'vitest';
import { alAprobar, alGanar, alLlegarLead, tareasDiarias, type Contexto, type Correo, type Ejecutor } from '@/lib/automatizaciones';
import { crearAlmacenDemo, estadoDemoInicial, type Guardado } from '@/lib/datos/almacen-demo';
import type { Colecciones, Contrato, Factura } from '@/lib/datos/entidades';
import { semillaDemo } from '@/lib/datos/semilla';
import { AJUSTES_POR_DEFECTO, type Ajustes } from '@/lib/datos/tipos';
import { accionPortal } from '@/lib/portal';
import { calcularAvisos } from './avisos';
import { automatizacionActiva, clausulas, datosPortal, huecoLibre, huecosReserva, huella, informeDe, mesAnterior, problemaFirma, recordatorioQueToca, slugDe, textoContrato, toqueQueToca } from './cliente';
import { sumarDias } from './fechas';

const HOY = '2026-11-19'; // jueves
const ajustes: Ajustes = { ...estadoDemoInicial(HOY).ajustes, legalName: 'Teresa Pruebas', nif: '00000000T', address: 'C/ Ejemplo 1' };

/** Banco de pruebas: la demo en memoria como «Ejecutor», con los correos apuntados aparte. */
async function banco(ajuste: (c: Colecciones) => void = () => {}) {
  const mapa = new Map<string, string>();
  const store: Guardado = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => void mapa.set(k, v), removeItem: (k) => void mapa.delete(k) };
  const a = crearAlmacenDemo(store);
  const c0 = await a.cargarColecciones();
  ajuste(c0);
  for (const k of Object.keys(c0) as (keyof Colecciones)[]) if (k !== 'notificationReads') await a.crearVarios(k, c0[k] as never);
  const correos: Correo[] = [];
  let n = 0;
  const ej: Ejecutor = {
    crear: async (col, fila) => (await a.crear(col, fila), true),
    actualizar: async (col, id, cambios) => (await a.actualizar(col, id, cambios), true),
    emitir: async (id) => a.emitir(id).catch(() => null),
    correo: async (m) => void correos.push(m),
    registrar: async (key, ref) => {
      const c = await a.cargarColecciones();
      if (c.automationRuns.some((r) => r.key === key && r.ref === ref)) return false;
      await a.crear('automationRuns', { id: `run-${++n}`, key, ref, createdAt: `${HOY}T08:00:00.000Z` });
      return true;
    },
  };
  const x = async (): Promise<Contexto> => ({ c: await a.cargarColecciones(), ajustes, hoy: HOY, ahora: `${HOY}T10:00:00.000Z`, nuevoId: () => `id-${++n}`, enlacePortal: async (co) => `https://nebula/portal/${co}` });
  return { a, ej, x, correos };
}

describe('Contratos (SPEC §7.6)', () => {
  const c = semillaDemo(HOY);
  const k = (id: string) => c.contracts.find((y) => y.id === id)!;
  it('cláusulas de proyecto con anticipo, rondas, derechos, portfolio y cancelación', () => {
    const t = clausulas(k('k3'), c, ajustes).map(([x]) => x);
    expect(t).toEqual(['Objeto', 'Plazos', 'Precio y forma de pago', 'Rondas de cambios', 'Propiedad intelectual', 'Portfolio', 'Cancelación', 'Confidencialidad']);
    const precio = clausulas(k('k3'), c, ajustes).find(([x]) => x === 'Precio y forma de pago')![1];
    expect(precio).toMatch(/5\.?400\s€ más IVA\. Un 30 % al firmar/);
    expect(clausulas(k('k5'), c, ajustes).some(([x]) => x === 'Portfolio')).toBe(false);
  });
  it('cláusulas de iguala y de colaborador', () => {
    expect(clausulas(k('k4'), c, ajustes).map(([x]) => x)).toEqual(['Servicio', 'Cuota', 'Horas incluidas', 'Duración', 'Propiedad intelectual', 'Confidencialidad']);
    expect(clausulas(k('k4'), c, ajustes)[1][1]).toMatch(/650\s€ al mes más IVA, facturados el día 1/);
    expect(clausulas(k('k6'), c, ajustes)[0]).toEqual(['Objeto del encargo', 'Redacción de textos para proyectos de clientes (newsletters, webs y campañas).']);
  });
  it('la huella SHA-256 identifica el texto exacto que se firma', async () => {
    const t = textoContrato(k('k3'), c, ajustes);
    expect(t.startsWith('CONTRATO · Proyecto\nContrato · Lanzamiento app Pulso\nDe: Teresa Pruebas (NIF 00000000T)')).toBe(true);
    const h = await huella(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await huella(t)).toBe(h);
    expect(await huella(t + ' ')).not.toBe(h);
    expect(await huella('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('para firmar hace falta el nombre y aceptar', () => {
    expect(problemaFirma(' A ', true)).toMatch(/nombre/);
    expect(problemaFirma('Andrés Gil', false)).toMatch(/casilla/);
    expect(problemaFirma('Andrés Gil', true)).toBeNull();
  });
});

describe('Portal del cliente (SPEC §6.17)', () => {
  const c = semillaDemo(HOY);
  it('solo contiene lo de su empresa (un cliente no ve datos de otro)', () => {
    const d = datosPortal(c, 'co7', ajustes, HOY)!;
    expect(d.empresa.name).toBe('Gimnasio Pulso S.L.');
    expect(d.contratos.map((k) => k.id)).toEqual(['k3']);
    expect(d.briefings.map((p) => p.id)).toEqual(['p6']);
    expect(d.presupuestos.map((q) => q.id)).toEqual(['q3']);
    const todo = JSON.stringify(d);
    for (const otra of c.companies.filter((e) => e.id !== 'co7')) expect(todo).not.toContain(otra.name);
    for (const f of c.invoices.filter((x) => x.companyId !== 'co7' && x.number)) expect(todo).not.toContain(f.number);
  });
  it('no enseña borradores de contrato ni presupuestos sin enviar', () => {
    expect(datosPortal(c, 'co6', ajustes, HOY)!.contratos).toEqual([]); // k5 está en borrador
    expect(datosPortal(c, 'co3', ajustes, HOY)!.presupuestos).toEqual([]); // q4 en borrador
    expect(datosPortal(c, 'no-existe', ajustes, HOY)).toBeNull();
  });
  it('firmar desde el portal guarda el rastro y emite UNA vez la factura del anticipo', async () => {
    const { a, ej, x } = await banco();
    const r = await accionPortal({ tipo: 'firmar', id: 'k3', nombre: 'Andrés  Gil', acepta: true }, 'co7', await x(), ej, { ip: '1.2.3.4', navegador: 'Prueba' });
    expect(r.ok).toBe(true);
    const c1 = await a.cargarColecciones();
    const k = c1.contracts.find((y) => y.id === 'k3')!;
    expect(k).toMatchObject({ status: 'firmado', signedBy: 'Andrés Gil', signedIp: '1.2.3.4', signedUserAgent: 'Prueba' });
    expect(k.documentHash).toBe(await huella(k.signedText));
    const anticipo = c1.invoices.find((f) => f.id === k.depositInvoiceId)!;
    expect(anticipo).toMatchObject({ status: 'emitida', projectId: 'p6', lines: [{ desc: 'Lanzamiento app Pulso · anticipo del 30 % a la firma', qty: 1, price: 1620 }] });
    expect(r.mensaje).toContain(anticipo.number);
    // Volver a firmar no hace nada: ya no está pendiente y la automatización ya se ejecutó.
    const otra = await accionPortal({ tipo: 'firmar', id: 'k3', nombre: 'Andrés Gil', acepta: true }, 'co7', await x(), ej, { ip: '', navegador: '' });
    expect(otra.ok).toBe(false);
    expect((await a.cargarColecciones()).invoices.filter((f: Factura) => f.lines[0]?.desc.includes('anticipo del 30 % a la firma'))).toHaveLength(1);
  });
  it('un cliente no puede firmar el contrato de otra empresa', async () => {
    const { ej, x } = await banco();
    const r = await accionPortal({ tipo: 'firmar', id: 'k3', nombre: 'Intruso', acepta: true }, 'co1', await x(), ej, { ip: '', navegador: '' });
    expect(r.ok).toBe(false);
  });
  it('briefing, cambios y presupuesto aceptado (gana la oportunidad)', async () => {
    const { a, ej, x } = await banco();
    expect((await accionPortal({ tipo: 'brief', id: 'p6', respuestas: { objective: ' Más reservas ', otra: '' } }, 'co7', await x(), ej, { ip: '', navegador: '' })).ok).toBe(true);
    expect((await a.cargarColecciones()).projects.find((p) => p.id === 'p6')!.brief).toMatchObject({ status: 'completado', answers: { objective: 'Más reservas' } });
    expect((await accionPortal({ tipo: 'cambios', id: 'v2', texto: 'Más grande' }, 'co1', await x(), ej, { ip: '', navegador: '' })).ok).toBe(true);
    expect((await a.cargarColecciones()).deliverables.find((v) => v.id === 'v2')).toMatchObject({ status: 'cambios', feedback: [{ text: 'Más grande' }] });
    expect((await accionPortal({ tipo: 'presupuesto', id: 'q5', acepta: true }, 'co8', await x(), ej, { ip: '', navegador: '' })).ok).toBe(true);
    const c2 = await a.cargarColecciones();
    expect(c2.invoices.find((q) => q.id === 'q5')!.status).toBe('aceptado');
    const d2 = c2.deals.find((d) => d.id === 'd2')!;
    expect(d2.stage).toBe('ganado');
    expect(c2.projects.some((p) => p.id === d2.projectId)).toBe(true);
  });
});

describe('Automatizaciones: cada una UNA sola vez (SPEC §13)', () => {
  it('won: briefing y contrato enviados, y al repetir no se duplican', async () => {
    const { a, ej, x, correos } = await banco();
    const c = await a.cargarColecciones();
    const d = c.deals.find((y) => y.id === 'd1')!;
    const p = { ...c.projects[0], id: 'pn', name: 'Web Café Nómada', contactId: 'c10' };
    await a.crear('projects', p);
    expect(await alGanar(d, p, await x(), ej)).toBe(true);
    expect(await alGanar(d, p, await x(), ej)).toBe(false);
    const c2 = await a.cargarColecciones();
    expect(c2.contracts.filter((k) => k.projectId === 'pn')).toHaveLength(1);
    expect(c2.projects.find((y) => y.id === 'pn')!.brief?.status).toBe('enviado');
    expect(correos).toHaveLength(1);
    expect(correos[0]).toMatchObject({ to: 'diego@cafenomada.es', kind: 'portal' });
  });
  it('approved: al aprobar el último entregable, proyecto entregado, factura final y tarea', async () => {
    const { a, ej, x } = await banco((c) => {
      c.deliverables = c.deliverables.map((v) => (v.projectId === 'p1' && v.id !== 'v2' ? { ...v, status: 'aprobado' } : v));
    });
    const v = (await a.cargarColecciones()).deliverables.find((y) => y.id === 'v2')!;
    expect(await alAprobar(v, await x(), ej)).toBe('proyecto-entregado');
    const c = await a.cargarColecciones();
    expect(c.projects.find((p) => p.id === 'p1')!.status).toBe('entregado');
    expect(c.invoices.find((f) => f.id === 'fb')!.lines.at(-1)).toEqual({ desc: 'Web corporativa Estudio Alba · pago final', qty: 1, price: 4800 - 1200 - 1800 });
    expect(c.tasks.some((t) => t.title === 'Pedir a Lucía su opinión para el portfolio')).toBe(true);
    expect(await alAprobar(v, await x(), ej)).toBe('aprobado');
  });
  it('lead: contacto con permiso, oportunidad «Formulario web» y tarea urgente', async () => {
    const { a, ej, x } = await banco();
    const id = await alLlegarLead({ nombre: 'Ana Web', email: 'ana@web.es', empresa: 'Ana S.L.', telefono: '', mensaje: 'Quiero una web', disciplina: 'web', presupuesto: 2000 }, await x(), ej);
    const c = await a.cargarColecciones();
    expect(c.contacts.find((p) => p.id === id)).toMatchObject({ consent: true, consentVia: 'Formulario web', status: 'potencial' });
    expect(c.deals.find((d) => d.contactId === id)).toMatchObject({ source: 'Formulario web', value: 2000, stage: 'nuevo', title: 'Diseño web para Ana S.L.' });
    expect(c.tasks.find((t) => t.contactId === id)).toMatchObject({ urgent: true, due: sumarDias(HOY, 1) });
    expect(calcularAvisos(c, HOY).some((v) => v.clave === `lead-${id}`)).toBe(true);
  });
  it('tarea diaria: recordatorios y toques una sola vez aunque se ejecute dos veces', async () => {
    const { ej, x, correos } = await banco();
    const r1 = await tareasDiarias(await x(), ej);
    const n = correos.length;
    const r2 = await tareasDiarias(await x(), ej);
    expect(r1.recordatorios).toBeGreaterThan(0);
    expect(r1.toques).toBeGreaterThan(0);
    expect(r2).toEqual({ recordatorios: 0, toques: 0, igualas: 0 });
    expect(correos).toHaveLength(n);
  });
  it('retainer (desactivada por defecto): si se activa, emite la cuota del mes una vez', async () => {
    const { a, ej, x } = await banco((c) => {
      c.automations = c.automations.map((au) => (au.key === 'retainer' ? { ...au, on: true } : au));
    });
    expect(automatizacionActiva(await a.cargarColecciones(), 'retainer')).toBe(true);
    expect((await tareasDiarias(await x(), ej)).igualas).toBe(1); // la de mantenimiento web (día 10)
    expect((await tareasDiarias(await x(), ej)).igualas).toBe(0);
    const c = await a.cargarColecciones();
    expect(c.retainers.find((r) => r.id === 'r2')!.lastBilled).toBe('2026-11');
  });
  it('desactivada no hace nada', async () => {
    const { ej, x, correos } = await banco((c) => {
      c.automations = c.automations.map((au) => ({ ...au, on: false }));
    });
    expect(await tareasDiarias(await x(), ej)).toEqual({ recordatorios: 0, toques: 0, igualas: 0 });
    expect(correos).toEqual([]);
  });
});

describe('Recordatorios, reservas e informes', () => {
  const f = (o: Partial<Factura> = {}): Factura => ({ ...semillaDemo(HOY).invoices.find((x) => x.id === 'f10')!, ...o });
  it('el recordatorio que toca según el vencimiento (−3, +1, +7, +15)', () => {
    const c = { payments: [], automationRuns: [] as Colecciones['automationRuns'] };
    expect(recordatorioQueToca(f({ due: sumarDias(HOY, 5) }), c, HOY)).toBeNull();
    expect(recordatorioQueToca(f({ due: sumarDias(HOY, 3) }), c, HOY)?.dias).toBe(-3);
    expect(recordatorioQueToca(f({ due: sumarDias(HOY, -1) }), c, HOY)?.dias).toBe(1);
    expect(recordatorioQueToca(f({ due: sumarDias(HOY, -10) }), c, HOY)?.dias).toBe(7);
    expect(recordatorioQueToca(f({ due: sumarDias(HOY, -20) }), c, HOY)?.dias).toBe(15);
    const ya = { payments: [], automationRuns: [{ id: 'r', key: 'overdue' as const, ref: 'f10:7', createdAt: '' }] };
    expect(recordatorioQueToca(f({ due: sumarDias(HOY, -10) }), ya, HOY)).toBeNull();
    expect(recordatorioQueToca(f({ due: sumarDias(HOY, -1) }), { payments: [{ id: 'p', invoiceId: 'f10', amount: 9999, date: HOY, method: '', createdAt: '' }], automationRuns: [] }, HOY)).toBeNull();
  });
  it('toque al cliente a los 5 días de enviar un entregable, una vez por envío', () => {
    const v = { ...semillaDemo(HOY).deliverables[1], status: 'enviado' as const, sentAt: sumarDias(HOY, -5) };
    expect(toqueQueToca(v, { automationRuns: [] }, HOY)).toBe(true);
    expect(toqueQueToca({ ...v, sentAt: sumarDias(HOY, -4) }, { automationRuns: [] }, HOY)).toBe(false);
    expect(toqueQueToca(v, { automationRuns: [{ id: '', key: 'nudge', ref: `${v.id}:${v.sentAt}`, createdAt: '' }] }, HOY)).toBe(false);
  });
  it('huecos de reserva: solo días y horas del horario, sin pisar reuniones', () => {
    const b = { on: true, duration: 30, from: '10:00', to: '12:00', days: [1, 2, 3, 4, 5] };
    const h = huecosReserva(b, [{ date: '2026-11-20', time: '10:30' }], HOY, 3);
    expect(h.map((x) => x.fecha)).toEqual(['2026-11-20', '2026-11-23', '2026-11-24']); // salta el fin de semana
    expect(h[0].horas).toEqual(['10:00', '11:00', '11:30']);
    expect(h[1].horas).toEqual(['10:00', '10:30', '11:00', '11:30']);
    expect(huecoLibre(b, [], HOY, '2026-11-20', '10:30')).toBe(true);
    expect(huecoLibre(b, [{ date: '2026-11-20', time: '10:30' }], HOY, '2026-11-20', '10:30')).toBe(false);
    expect(huecoLibre(b, [], HOY, '2026-11-21', '10:00')).toBe(false); // sábado
    expect(huecoLibre(b, [], HOY, '2026-11-20', '12:00')).toBe(false); // fuera de horario
  });
  it('nombre público para las direcciones', () => {
    expect(slugDe('Estudio Creativo Ñandú & Co.')).toBe('estudio-creativo-nandu-co');
    expect(slugDe('A')).toBe('estudio-a');
  });
  it('informe nuevo con los datos del mes anterior como referencia', () => {
    const c = semillaDemo(HOY);
    expect(mesAnterior(HOY)).toBe('2026-10');
    const nuevo = informeDe(c, 'r1', '2026-11', 'x', '');
    expect(nuevo).toMatchObject({ status: 'borrador', companyId: 'co5', prev: { alcance: 41200 } });
    expect(informeDe(c, 'r1', '2026-10', 'x', '').id).toBe('rp1');
  });
  it('avisos de contratos sin firmar y proyectos sin contrato', () => {
    const c = semillaDemo(HOY);
    const claves = calcularAvisos(c, HOY).map((v) => v.clave);
    expect(claves).toContain(`ks-k3-${sumarDias(HOY, -4)}`);
    expect(claves).toContain('sk-p3');
    expect(claves).not.toContain('sk-p1');
    const k: Contrato = c.contracts[0];
    expect(claves).not.toContain(`kf-${k.id}`);
  });
  it('por defecto todas activas menos la de igualas', () => {
    const vacio = { automations: [] };
    expect(automatizacionActiva(vacio, 'won')).toBe(true);
    expect(automatizacionActiva(vacio, 'retainer')).toBe(false);
    expect(AJUSTES_POR_DEFECTO.booking.on).toBe(false);
  });
});
