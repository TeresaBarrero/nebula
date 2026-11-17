import { describe, expect, it } from 'vitest';
import { aEntidad, aValores, porDefecto } from '@/components/app/formularios/conversion';
import { crearAlmacenDemo, CLAVE_DEMO, type Guardado } from '@/lib/datos/almacen-demo';
import type { Factura, Gasto, Iguala } from '@/lib/datos/entidades';
import { semillaDemo } from '@/lib/datos/semilla';
import { AJUSTES_POR_DEFECTO, type Ajustes } from '@/lib/datos/tipos';
import { calcularAvisos } from './avisos';
import { buscar } from './buscador';
import { elementosDelDia } from './calendario';
import {
  borradorDe,
  cambioPermitido,
  cambiosAlEmitir,
  cifrasFacturas,
  cifrasPresupuestos,
  dineroEmpresa,
  dineroProyecto,
  documentoNuevo,
  estadoFactura,
  facturaDePresupuesto,
  limpiarLineas,
  problemaParaEmitir,
  rectificativaDe,
  resumenFiscal,
  siguienteNumero,
  totales,
  totalesGasto,
  trimestreDe,
} from './facturas';
import { sumarDias } from './fechas';
import { efectoDeBorrar } from './vinculos';
import { ingresosYGastos, mejoresClientes, porDisciplina, porProyecto } from './informes';
import { irpfPorDefecto } from './irpf';
import { estadoRenovacion, igualaPorFacturar, ingresosFijos, siguienteRenovacion } from './recurrentes';

const HOY = '2026-11-17'; // martes
const AHORA = '2026-11-17T10:00:00.000Z';
const ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO, legalName: 'Teresa Pruebas', nif: '00000000T', address: 'C/ Ejemplo 1', iban: 'ES00 1234', irpf: 15 };
let n = 0;
const id = () => `id-${++n}`;
const base = (empresas = semillaDemo(HOY).companies) => ({ id: id(), hoy: HOY, ahora: AHORA, ajustes, empresas });
const factura = (o: Partial<Factura> = {}): Factura =>
  documentoNuevo('factura', { companyId: 'co1', lines: [{ desc: 'Diseño de logotipo', qty: 1, price: 1000 }], ...o }, base());

describe('Cálculo de una factura (SPEC §7.1)', () => {
  it('total = base + IVA − retención, redondeando en cada paso', () => {
    expect(totales({ lines: [{ desc: 'a', qty: 1, price: 1000 }], iva: 21, irpf: 15 })).toEqual({ base: 1000, iva: 210, irpf: 150, total: 1060, paid: 0, pending: 1060 });
    expect(totales({ lines: [{ desc: 'a', qty: 3, price: 33.333 }, { desc: 'b', qty: 1, price: 0.005 }], iva: 21, irpf: 7 })).toEqual({ base: 100.01, iva: 21, irpf: 7, total: 114.01, paid: 0, pending: 114.01 });
    expect(totales({ lines: [{ desc: 'a', qty: 2, price: 450 }], iva: 21, irpf: 0 }, [{ amount: 500 }])).toMatchObject({ total: 1089, paid: 500, pending: 589 });
  });
  it('lo pendiente nunca es negativo', () => {
    expect(totales({ lines: [{ desc: 'a', qty: 1, price: 100 }], iva: 0, irpf: 0 }, [{ amount: 150 }]).pending).toBe(0);
  });
  it('limpia las líneas vacías y entiende comas decimales', () => {
    expect(limpiarLineas([{ desc: ' Logo ', qty: '2', price: '12,5' }, { desc: '', qty: 1, price: '' }, { desc: '', qty: '', price: '30' }])).toEqual([
      { desc: 'Logo', qty: 2, price: 12.5 },
      { desc: '', qty: 1, price: 30 },
    ]);
  });
});

describe('Estado de una factura', () => {
  const emitida = (o: Partial<Factura> = {}) => factura({ status: 'emitida', number: 'F-2026-001', date: '2026-11-01', due: '2026-12-01', ...o });
  it('borrador, esperando el pago, pagada en parte, pagada y fuera de plazo', () => {
    expect(estadoFactura(factura(), [], HOY)).toBe('borrador');
    expect(estadoFactura(emitida(), [], HOY)).toBe('pendiente');
    expect(estadoFactura(emitida(), [{ amount: 100 }], HOY)).toBe('parcial');
    expect(estadoFactura(emitida(), [{ amount: 1060 }], HOY)).toBe('pagada');
    expect(estadoFactura(emitida(), [{ amount: 1059.996 }], HOY)).toBe('pagada');
    expect(estadoFactura(emitida({ due: '2026-11-16' }), [{ amount: 100 }], HOY)).toBe('vencida');
    expect(estadoFactura(emitida({ due: HOY }), [], HOY)).toBe('pendiente');
  });
  it('una rectificativa (total negativo) se ve como rectificativa', () => {
    expect(estadoFactura(emitida({ series: 'R', lines: [{ desc: 'Anulación', qty: -1, price: 1000 }] }), [], HOY)).toBe('rectificativa');
  });
  it('un presupuesto muestra su estado guardado', () => {
    expect(estadoFactura(documentoNuevo('presupuesto', { status: 'enviado' }, base()), [], HOY)).toBe('enviado');
  });
});

describe('Numeración y emisión (SPEC §7.3)', () => {
  const fs = [
    { series: 'F' as const, number: 'F-2026-001' },
    { series: 'F' as const, number: 'F-2026-007' },
    { series: 'F' as const, number: '' },
    { series: 'R' as const, number: 'R-2026-001' },
    { series: 'F' as const, number: 'F-2025-120' },
  ];
  it('correlativo por serie y año, con tres cifras', () => {
    expect(siguienteNumero(fs, 'F', 2026)).toBe('F-2026-008');
    expect(siguienteNumero(fs, 'R', 2026)).toBe('R-2026-002');
    expect(siguienteNumero(fs, 'F', 2027)).toBe('F-2027-001');
    expect(siguienteNumero(fs, 'P', 2026)).toBe('P-2026-001');
  });
  it('emitir pone número, estado, fecha de hoy, vencimiento no pasado y copia de cliente y emisor', () => {
    const c = semillaDemo(HOY);
    const f = factura({ date: '2026-11-01', due: '2026-11-10' });
    const cambios = cambiosAlEmitir(f, c.invoices, c.companies.find((e) => e.id === 'co1'), ajustes, HOY, AHORA);
    expect(cambios).toMatchObject({ status: 'emitida', date: HOY, due: HOY, issuedAt: AHORA });
    expect(cambios.number).toMatch(/^F-2026-\d{3}$/);
    expect(cambios.client).toEqual({ name: 'Estudio Alba S.L.', nif: 'B12345678', address: 'C/ Mayor 12, 28013 Madrid' });
    expect(cambios.issuer).toEqual({ legalName: 'Teresa Pruebas', nif: '00000000T', address: 'C/ Ejemplo 1', iban: 'ES00 1234' });
  });
  it('no se emite sin cliente, sin conceptos ni dos veces', () => {
    expect(problemaParaEmitir(factura({ companyId: null }))).toMatch(/Elige a quién/);
    expect(problemaParaEmitir(factura({ lines: [] }))).toMatch(/ningún concepto/);
    expect(problemaParaEmitir(factura({ status: 'emitida', number: 'F-2026-001' }))).toMatch(/ya está emitida/);
    expect(problemaParaEmitir(factura())).toBeNull();
  });
  it('una factura emitida solo admite que se desvincule', () => {
    const f = factura({ status: 'emitida', number: 'F-2026-001' });
    expect(cambioPermitido(f, { lines: [] })).toBe(false);
    expect(cambioPermitido(f, { companyId: 'co2' })).toBe(false);
    expect(cambioPermitido(f, { notes: 'otra' })).toBe(false);
    expect(cambioPermitido(f, { companyId: null, projectId: null })).toBe(true);
    expect(cambioPermitido(factura(), { lines: [] })).toBe(true);
  });
});

describe('Demo: emisión correlativa e inmutabilidad (igual que la base de datos)', () => {
  const nuevoAlmacen = () => {
    const mapa = new Map<string, string>();
    const store: Guardado = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => void mapa.set(k, v), removeItem: (k) => void mapa.delete(k) };
    return { a: crearAlmacenDemo(store), mapa };
  };
  it('emite sin huecos aunque se emitan varias seguidas', async () => {
    const { a } = nuevoAlmacen();
    const c = await a.cargarColecciones();
    const anio = new Date().getFullYear();
    const antes = siguienteNumero(c.invoices, 'F', anio);
    const ids = [id(), id(), id()];
    for (const x of ids) await a.crear('invoices', factura({ id: x }));
    const numeros = await Promise.all(ids.map((x) => a.emitir(x).then((f) => f.number)));
    const k = Number(antes.slice(-3));
    expect(numeros).toEqual([0, 1, 2].map((i) => `F-${anio}-${String(k + i).padStart(3, '0')}`));
  });
  it('no deja cambiar ni borrar una emitida, pero sí desvincularla', async () => {
    const { a } = nuevoAlmacen();
    await a.cargarColecciones();
    await expect(a.actualizar('invoices', 'f3', { notes: 'cambio' })).rejects.toThrow(/no se puede modificar/);
    await expect(a.borrar('invoices', 'f3')).rejects.toThrow(/no se puede borrar/);
    await expect(a.actualizar('invoices', 'f3', { projectId: null })).resolves.toBeUndefined();
    await expect(a.emitir('f3')).rejects.toThrow(/ya está emitida/);
  });
  it('borrar una empresa desvincula sus facturas emitidas, que conservan los datos del cliente', async () => {
    const { a } = nuevoAlmacen();
    await a.cargarColecciones();
    await a.borrar('companies', 'co1');
    const f = (await a.cargarColecciones()).invoices.find((x) => x.id === 'f3')!;
    expect(f.companyId).toBeNull();
    expect(f.client?.name).toBe('Estudio Alba S.L.');
  });
  it('«Deshacer» el borrado de una empresa la recupera sin volver a tocar sus facturas emitidas', async () => {
    const { a } = nuevoAlmacen();
    const c = await a.cargarColecciones();
    const ef = efectoDeBorrar(c, 'companies', 'co1');
    await a.borrar('companies', 'co1');
    await a.restaurar(ef);
    const d = await a.cargarColecciones();
    expect(d.companies.some((e) => e.id === 'co1')).toBe(true);
    expect(d.invoices.find((x) => x.id === 'fb')?.companyId).toBe('co1'); // borrador: se vuelve a enlazar
    expect(d.invoices.find((x) => x.id === 'f3')?.companyId).toBeNull(); // emitida: se queda como está
    expect(d.renewals.filter((x) => x.companyId === 'co1')).toHaveLength(2);
  });
  it('los presupuestos reciben su número P al guardarlos', async () => {
    const { a } = nuevoAlmacen();
    const c = await a.cargarColecciones();
    const q = documentoNuevo('presupuesto', { companyId: 'co3', lines: [{ desc: 'Etiquetas', qty: 1, price: 300 }] }, base());
    await a.crear('invoices', q);
    expect((await a.emitir(q.id)).number).toBe(siguienteNumero(c.invoices, 'P', new Date().getFullYear()));
  });
  it('una demo de la Fase 1 conserva sus cambios y recibe los datos de dinero', async () => {
    const { mapa } = nuevoAlmacen();
    const v2 = semillaDemo(HOY);
    const c1 = { ...v2, companies: v2.companies.filter((e) => e.id !== 'co6'), tasks: [...v2.tasks.slice(0, 3)] };
    for (const k of ['retainers', 'renewals', 'invoices', 'payments', 'expenses'] as const) delete (c1 as Partial<typeof c1>)[k];
    mapa.set(CLAVE_DEMO, JSON.stringify({ v: 2, perfil: { name: 'X' }, ajustes: {}, asistenteHecho: false, colecciones: c1 }));
    const store: Guardado = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => void mapa.set(k, v), removeItem: (k) => void mapa.delete(k) };
    const c = await crearAlmacenDemo(store).cargarColecciones();
    expect(c.tasks).toHaveLength(3);
    expect(c.invoices.length).toBeGreaterThan(15);
    expect(c.renewals.some((r) => r.companyId === 'co6')).toBe(false);
    expect(c.invoices.filter((f) => f.client?.name === 'Hotel Mirador S.A.').every((f) => f.companyId === null)).toBe(true);
  });
});

describe('Retención por defecto (SPEC §7.4) al crear facturas', () => {
  it('15 % a empresas, 0 a particulares o si eres sociedad', () => {
    const empresas = semillaDemo(HOY).companies.map((e) => (e.id === 'co3' ? { ...e, isPrivate: true } : e));
    expect(documentoNuevo('factura', { companyId: 'co1' }, base(empresas)).irpf).toBe(15);
    expect(documentoNuevo('factura', { companyId: 'co3' }, base(empresas)).irpf).toBe(0);
    expect(irpfPorDefecto({ ...ajustes, kind: 'sociedad' }, empresas[0])).toBe(0);
  });
  it('vencimiento según los días de pago del perfil', () => {
    expect(documentoNuevo('factura', {}, base()).due).toBe(sumarDias(HOY, 30));
  });
});

describe('Rectificativas y presupuestos', () => {
  it('la rectificativa copia las líneas en negativo y referencia la original', () => {
    const o = factura({ id: 'orig', status: 'emitida', number: 'F-2026-050', projectId: 'p1' });
    const r = rectificativaDe(o, base());
    expect(r).toMatchObject({ kind: 'factura', series: 'R', status: 'borrador', number: '', rectifiesId: 'orig', companyId: 'co1', projectId: 'p1', notes: 'Rectifica la factura F-2026-050' });
    expect(r.lines).toEqual([{ desc: 'Anulación: Diseño de logotipo', qty: -1, price: 1000 }]);
    expect(totales(r).total).toBe(-1060);
  });
  it('«Aceptado: crear factura» copia sus líneas y lo referencia', () => {
    const q = semillaDemo(HOY).invoices.find((f) => f.id === 'q2')!;
    const f = facturaDePresupuesto(q, base());
    expect(f).toMatchObject({ kind: 'factura', series: 'F', fromQuoteId: 'q2', companyId: 'co2', projectId: 'p5', dealId: 'd6' });
    expect(f.lines).toEqual(q.lines);
    expect(totales(f).base).toBe(6500);
  });
  it('encuentra el borrador abierto de un cliente (no rectificativas)', () => {
    const fs = semillaDemo(HOY).invoices;
    expect(borradorDe(fs, 'co1')?.id).toBe('fb');
    expect(borradorDe(fs, 'co9')).toBeUndefined();
  });
});

describe('Cifras con los datos de ejemplo', () => {
  const c = semillaDemo(HOY);
  it('te deben y fuera de plazo', () => {
    const k = cifrasFacturas(c, HOY);
    // Sin pagar: consultoría (954 €, vencida), newsletter de hace 11 días (424 €) y redes de hace 3 días (689 − 500).
    expect(k.teDeben).toBe(954 + 424 + 189);
    expect(k.fueraDePlazo).toBe(954);
  });
  it('presupuestos', () => {
    expect(cifrasPresupuestos(c.invoices)).toEqual({ sinRespuesta: 5400 + 1200 + 2400, aceptados: 1, tasa: 50, esperando: 2 });
  });
  it('dinero de un proyecto y de una empresa', () => {
    expect(dineroProyecto(c, 'p1')).toEqual({ facturado: 3000, gastos: 1000, margen: 2000, pct: 67 });
    expect(dineroEmpresa(c, 'co2')).toEqual({ facturado: 400 * 3 + 900, teDebe: 954 + 424 });
  });
});

describe('Resumen fiscal del trimestre (orientativo, SPEC §7.5)', () => {
  it('IVA a pagar = IVA cobrado − IVA de gastos deducibles; rendimiento = ingresos − gastos', () => {
    const f = (date: string, price: number): Factura => factura({ id: id(), status: 'emitida', number: 'F-x', date, lines: [{ desc: 'x', qty: 1, price }] });
    const g = (date: string, b: number, ivaPct: number, deductible = true): Gasto => ({
      id: id(), date, supplier: 's', contactId: null, concept: 'c', category: 'Otros', base: b, ivaPct, deductible, projectId: null, receiptPath: '', receiptName: '', createdAt: AHORA,
    });
    const r = resumenFiscal(
      {
        invoices: [f('2026-10-02', 1000), f('2026-12-31', 500), f('2026-09-30', 9999), factura({ date: '2026-11-01' })],
        expenses: [g('2026-11-01', 100, 21), g('2026-10-15', 50, 10), g('2026-11-02', 300, 21, false), g('2026-07-01', 80, 21)],
      },
      HOY,
    );
    expect(r).toEqual({ ivaCobrado: 315, ivaPagado: 26, ivaAPagar: 289, retenciones: 225, ingresos: 1500, gastos: 150, rendimiento: 1350 });
  });
  it('trimestres', () => {
    expect(trimestreDe('2026-03-31')).toBe(20260);
    expect(trimestreDe('2026-04-01')).toBe(20261);
    expect(trimestreDe('2026-12-31')).toBe(20263);
  });
  it('totales de un gasto', () => {
    expect(totalesGasto({ base: 60.49, ivaPct: 21 })).toEqual({ base: 60.49, iva: 12.7, total: 73.19 });
  });
});

describe('Igualas y renovaciones (SPEC §7.14 y §7.15)', () => {
  const r = (o: Partial<Iguala>): Iguala => ({ id: 'r', name: 'x', companyId: null, contactId: null, discipline: null, fee: 100, hours: 5, billingDay: 10, services: '', active: true, start: null, lastBilled: '', extraBilled: '', createdAt: AHORA, ...o });
  it('por facturar: activa, sin factura este mes y ya ha llegado su día', () => {
    expect(igualaPorFacturar(r({ billingDay: 17 }), HOY)).toBe(true);
    expect(igualaPorFacturar(r({ billingDay: 18 }), HOY)).toBe(false);
    expect(igualaPorFacturar(r({ lastBilled: '2026-11' }), HOY)).toBe(false);
    expect(igualaPorFacturar(r({ active: false }), HOY)).toBe(false);
    expect(igualaPorFacturar(r({ billingDay: 31 }), '2026-02-28')).toBe(true);
  });
  it('ingresos fijos solo de las activas', () => {
    expect(ingresosFijos([r({ fee: 650 }), r({ fee: 150 }), r({ fee: 999, active: false })])).toBe(800);
  });
  it('estado de una renovación y nueva fecha al renovar', () => {
    expect(estadoRenovacion({ renewDate: '2026-11-16' }, HOY).k).toBe('vencida');
    expect(estadoRenovacion({ renewDate: '2026-12-17' }, HOY).k).toBe('pronto');
    expect(estadoRenovacion({ renewDate: '2026-12-18' }, HOY).k).toBe('ok');
    expect(siguienteRenovacion({ renewDate: '2026-12-01' }, HOY)).toBe('2027-12-01');
    expect(siguienteRenovacion({ renewDate: '2026-10-01' }, HOY)).toBe('2027-11-17');
  });
  it('los datos de ejemplo tienen la iguala de mantenimiento por facturar', () => {
    const c = semillaDemo(HOY);
    expect(c.retainers.filter((x) => igualaPorFacturar(x, HOY)).map((x) => x.id)).toEqual(['r2']);
  });
});

describe('Informes', () => {
  const c = semillaDemo(HOY);
  it('seis meses de ingresos y gastos, del más antiguo al actual', () => {
    const m = ingresosYGastos(c, HOY);
    expect(m.map((x) => x.clave)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(m.at(-1)!.ingresos).toBe(1800 + 400 + 600 + 650);
  });
  it('por disciplina, por proyecto y mejores clientes', () => {
    expect(porDisciplina(c, HOY).slice(0, 2)).toEqual([
      { k: 'grafico', facturado: 1600 + 1600 },
      { k: 'web', facturado: 1200 + 150 + 1800 },
    ]);
    expect(porProyecto(c)[0].p.id).toBe('p4');
    expect(mejoresClientes(c, HOY).map((x) => [x.e.id, x.facturado]).slice(0, 2)).toEqual([['co6', 3500], ['co1', 3150]]);
  });
});

describe('Dinero en el resto del CRM', () => {
  const c = semillaDemo(HOY);
  it('avisos de iguala por facturar, renovaciones, facturas fuera de plazo, borradores y presupuestos sin respuesta', () => {
    const claves = calcularAvisos(c, HOY).map((a) => a.clave);
    expect(claves).toContain('rb-r2-2026-11');
    expect(claves).toContain(`rn-n3-${sumarDias(HOY, 6)}`);
    expect(claves).toContain(`rn-n6-${sumarDias(HOY, -3)}`);
    expect(claves.some((k) => k.startsWith('rn-n1'))).toBe(false);
    expect(claves).toContain('inv-f10');
    expect(claves).toContain('dr-fb');
    expect(claves).toContain('pre-q3');
    expect(claves).toContain('pre-q5');
  });
  it('el calendario muestra vencimientos sin cobrar y renovaciones', () => {
    const f = c.invoices.find((x) => x.id === 'f13')!;
    expect(elementosDelDia(c, f.due!, HOY).some((x) => x.texto === `Vence ${f.number}`)).toBe(true);
    const pagada = c.invoices.find((x) => x.id === 'f12')!;
    expect(elementosDelDia(c, pagada.due!, HOY).some((x) => x.texto.startsWith('Vence'))).toBe(false);
    expect(elementosDelDia(c, sumarDias(HOY, 18), HOY).some((x) => x.texto === 'Renueva estudioalba.es')).toBe(true);
  });
  it('el buscador encuentra facturas, igualas, renovaciones y gastos', () => {
    const titulos = (q: string) => buscar(c, q, HOY).map((g) => g.titulo);
    expect(titulos('consultoría')).toContain('Facturas');
    expect(titulos('newsletter')).toContain('Igualas y renovaciones');
    expect(titulos('dondominio')).toContain('Igualas y renovaciones');
    expect(titulos('adobe')).toContain('Gastos');
  });
  it('los formularios de iguala, renovación y gasto guardan datos válidos', () => {
    const b = { id: 'z', createdAt: AHORA, hoy: HOY };
    expect(aEntidad('retainer', aValores('retainer', { ...porDefecto('retainer', HOY), name: 'SEO', fee: '200', billingDay: '40' }), b, null)).toMatchObject({ fee: 200, billingDay: 31, active: true, lastBilled: '' });
    expect(aEntidad('renewal', aValores('renewal', { ...porDefecto('renewal', HOY), name: 'x.es', type: 'raro' }), b, null)).toMatchObject({ type: 'dominio', renewDate: '2027-11-17' });
    expect(aEntidad('expense', aValores('expense', { ...porDefecto('expense', HOY), supplier: 'Adobe', concept: 'CC', base: '60,49', ivaPct: '7', category: 'Nada' }), b, null)).toMatchObject({
      base: 60.49, ivaPct: 21, category: 'Otros', deductible: true, receiptPath: '',
    });
  });
});
