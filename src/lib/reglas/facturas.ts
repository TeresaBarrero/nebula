import type { EstadoFactura } from '@/lib/catalogos/dinero';
import type { Ajustes } from '@/lib/datos/tipos';
import type { Colecciones, Empresa, Factura, Fecha, Gasto, Id, LineaFactura, Pago, Serie } from '@/lib/datos/entidades';
import { r2 } from './dinero';
import { diasHasta, sumarDias } from './fechas';
import { irpfPorDefecto } from './irpf';

export type Totales = { base: number; iva: number; irpf: number; total: number; paid: number; pending: number };

/**
 * Cálculo de una factura (SPEC §7.1), redondeando a 2 decimales en cada paso:
 * base = Σ qty × price · iva = base × iva% · irpf = base × irpf% · total = base + iva − irpf («Te ingresarán»).
 */
export function totales(f: Pick<Factura, 'lines' | 'iva' | 'irpf'>, pagos: Pick<Pago, 'amount'>[] = []): Totales {
  const base = r2(f.lines.reduce((a, l) => a + r2((Number(l.qty) || 0) * (Number(l.price) || 0)), 0));
  const iva = r2((base * (Number(f.iva) || 0)) / 100);
  const irpf = r2((base * (Number(f.irpf) || 0)) / 100);
  const total = r2(base + iva - irpf);
  const paid = r2(pagos.reduce((a, p) => a + (Number(p.amount) || 0), 0));
  return { base, iva, irpf, total, paid, pending: Math.max(0, r2(total - paid)) };
}

export const pagosDe = (c: Pick<Colecciones, 'payments'>, id: Id) => c.payments.filter((p) => p.invoiceId === id);
export const totalesDe = (c: Pick<Colecciones, 'payments'>, f: Factura) => totales(f, pagosDe(c, f.id));

/**
 * Estado que se ve (SPEC §7.1): borrador · rectificativa (total negativo) · pagada · fuera de plazo · pagada en parte · esperando el pago.
 * Los presupuestos muestran su estado guardado.
 */
export function estadoFactura(f: Factura, pagos: Pick<Pago, 'amount'>[], hoy: Fecha): EstadoFactura {
  if (f.kind === 'presupuesto') return f.status as EstadoFactura;
  if (f.status === 'borrador') return 'borrador';
  const t = totales(f, pagos);
  if (t.total < 0) return 'rectificativa';
  if (t.paid >= t.total - 0.005) return 'pagada';
  if (f.due && diasHasta(f.due, hoy) < 0) return 'vencida';
  if (t.paid > 0) return 'parcial';
  return 'pendiente';
}
export const estadoDe = (c: Pick<Colecciones, 'payments'>, f: Factura, hoy: Fecha) => estadoFactura(f, pagosDe(c, f.id), hoy);

export const esEmitida = (f: Pick<Factura, 'kind' | 'status'>) => f.kind === 'factura' && f.status === 'emitida';
export const emitidas = (fs: Factura[]) => fs.filter(esEmitida);

/** Siguiente número de la serie en ese año: «F-2026-001», correlativo y sin huecos (en la demo; en la nube lo da la base de datos). */
export function siguienteNumero(facturas: Pick<Factura, 'series' | 'number'>[], serie: Serie, anio: number): string {
  const prefijo = `${serie}-${anio}-`;
  const ultimo = facturas
    .filter((f) => f.series === serie && f.number.startsWith(prefijo))
    .map((f) => Number(f.number.slice(prefijo.length)) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefijo}${String(ultimo + 1).padStart(3, '0')}`;
}

/** Por qué no se puede emitir (o null si se puede). */
export function problemaParaEmitir(f: Factura): string | null {
  if (f.kind === 'factura' && f.status !== 'borrador') return `Esta factura ya está emitida (${f.number})`;
  if (f.kind === 'presupuesto') return null;
  if (!f.companyId) return 'Elige a quién va la factura antes de emitirla';
  if (!f.lines.length || !f.lines.some((l) => l.desc.trim())) return 'La factura no tiene ningún concepto';
  return null;
}

/**
 * Emitir (o numerar un presupuesto) igual que la función emitir_documento de la base de datos:
 * número correlativo, fecha de hoy, vencimiento no anterior a hoy y copia de los datos del cliente y de quien factura.
 */
export function cambiosAlEmitir(f: Factura, todas: Factura[], empresa: Empresa | undefined, ajustes: Ajustes, hoy: Fecha, ahora: string): Partial<Factura> {
  const anio = Number(hoy.slice(0, 4));
  if (f.kind === 'presupuesto') return f.number ? {} : { number: siguienteNumero(todas, 'P', anio) };
  return {
    number: siguienteNumero(todas, f.series, anio),
    status: 'emitida',
    date: hoy,
    due: f.due && f.due > hoy ? f.due : hoy,
    issuedAt: ahora,
    client: { name: empresa?.name ?? '', nif: empresa?.nif ?? '', address: empresa?.address ?? '' },
    issuer: { legalName: ajustes.legalName || ajustes.business, nif: ajustes.nif, address: ajustes.address, iban: ajustes.iban },
  };
}

/** ¿Este cambio está permitido en una factura emitida? Solo desvincular (poner a null cliente, proyecto…). */
export function cambioPermitido(f: Factura, cambios: Partial<Factura>): boolean {
  if (!esEmitida(f)) return true;
  const desvincular = new Set(['companyId', 'contactId', 'projectId', 'retainerId', 'dealId', 'fromQuoteId']);
  return Object.entries(cambios).every(([k, v]) => desvincular.has(k) && v === null);
}

type Base = { id: Id; hoy: Fecha; ahora: string; ajustes: Ajustes; empresas: Empresa[] };

/** Documento nuevo en blanco, con IVA, retención y plazo de pago del perfil. */
export function documentoNuevo(kind: Factura['kind'], o: Partial<Factura>, b: Base): Factura {
  const empresa = b.empresas.find((e) => e.id === o.companyId);
  return {
    id: b.id,
    kind,
    series: kind === 'presupuesto' ? 'P' : 'F',
    number: '',
    status: 'borrador',
    companyId: null,
    contactId: null,
    projectId: null,
    retainerId: null,
    dealId: null,
    fromQuoteId: null,
    rectifiesId: null,
    iva: b.ajustes.iva,
    irpf: irpfPorDefecto(b.ajustes, empresa),
    date: b.hoy,
    due: sumarDias(b.hoy, b.ajustes.payDays || 30),
    notes: '',
    lines: [],
    client: null,
    issuer: null,
    issuedAt: null,
    createdAt: b.ahora,
    ...o,
  };
}

/** Rectificativa (serie R): copia las líneas en negativo y referencia la original (SPEC §7.3). */
export function rectificativaDe(f: Factura, b: Base): Factura {
  return documentoNuevo(
    'factura',
    {
      series: 'R',
      rectifiesId: f.id,
      companyId: f.companyId,
      contactId: f.contactId,
      projectId: f.projectId,
      retainerId: f.retainerId,
      iva: f.iva,
      irpf: f.irpf,
      lines: f.lines.map((l) => ({ desc: `Anulación: ${l.desc}`, qty: -l.qty, price: l.price })),
      notes: `Rectifica la factura ${f.number}`,
    },
    b,
  );
}

/** «Aceptado: crear factura»: copia las líneas del presupuesto (from_quote_id). */
export function facturaDePresupuesto(q: Factura, b: Base, projectId: Id | null = q.projectId): Factura {
  return documentoNuevo(
    'factura',
    { companyId: q.companyId, contactId: q.contactId, projectId, dealId: q.dealId, fromQuoteId: q.id, iva: q.iva, irpf: q.irpf, lines: q.lines.map((l) => ({ ...l })), notes: `Según presupuesto ${q.number}` },
    b,
  );
}

/** Borrador de factura abierto de un cliente (no rectificativa), para añadirle líneas (renovaciones, horas extra…). */
export function borradorDe(fs: Factura[], companyId: Id | null): Factura | undefined {
  return fs.find((f) => f.kind === 'factura' && f.status === 'borrador' && f.series === 'F' && f.companyId === companyId);
}

/** Líneas limpias para guardar: sin filas vacías, con número en cantidad y precio. */
export function limpiarLineas(ls: { desc: string; qty: number | string; price: number | string }[]): LineaFactura[] {
  return ls
    .map((l) => ({ desc: String(l.desc).trim().slice(0, 300), qty: Number(String(l.qty).replace(',', '.')) || 1, price: r2(Number(String(l.price).replace(',', '.')) || 0) }))
    .filter((l) => l.desc || l.price);
}

// ───────── Trimestres y cifras ─────────

/** Trimestre de una fecha como número comparable (2026·10 + 0…3). */
export const trimestreDe = (f: Fecha) => Number(f.slice(0, 4)) * 10 + Math.floor((Number(f.slice(5, 7)) - 1) / 3);
export const nombreTrimestre = (f: Fecha) => `${Math.floor((Number(f.slice(5, 7)) - 1) / 3) + 1}.º trimestre de ${f.slice(0, 4)}`;

export const totalesGasto = (g: Pick<Gasto, 'base' | 'ivaPct'>) => {
  const base = r2(Number(g.base) || 0);
  const iva = r2((base * (Number(g.ivaPct) || 0)) / 100);
  return { base, iva, total: r2(base + iva) };
};

/** Cifras de la pestaña Facturas (SPEC §6.13). */
export function cifrasFacturas(c: Pick<Colecciones, 'invoices' | 'payments'>, hoy: Fecha) {
  const em = emitidas(c.invoices);
  const t = (f: Factura) => totalesDe(c, f);
  const anio = hoy.slice(0, 4);
  return {
    cobradoAnio: r2(c.payments.filter((p) => p.date.startsWith(anio) && em.some((f) => f.id === p.invoiceId)).reduce((a, p) => a + p.amount, 0)),
    pagadas: em.filter((f) => estadoDe(c, f, hoy) === 'pagada').length,
    teDeben: r2(em.reduce((a, f) => a + t(f).pending, 0)),
    fueraDePlazo: r2(em.filter((f) => estadoDe(c, f, hoy) === 'vencida').reduce((a, f) => a + t(f).pending, 0)),
    ivaTrimestre: r2(em.filter((f) => trimestreDe(f.date) === trimestreDe(hoy)).reduce((a, f) => a + t(f).iva, 0)),
  };
}

/** Cifras de la pestaña Presupuestos. */
export function cifrasPresupuestos(fs: Factura[]) {
  const ps = fs.filter((f) => f.kind === 'presupuesto');
  const decididos = ps.filter((p) => p.status === 'aceptado' || p.status === 'rechazado');
  return {
    sinRespuesta: r2(ps.filter((p) => p.status === 'enviado' || p.status === 'borrador').reduce((a, p) => a + totales(p).base, 0)),
    aceptados: ps.filter((p) => p.status === 'aceptado').length,
    tasa: decididos.length ? Math.round((decididos.filter((p) => p.status === 'aceptado').length / decididos.length) * 100) : 0,
    esperando: ps.filter((p) => p.status === 'enviado').length,
  };
}

/**
 * Resumen fiscal orientativo del trimestre (SPEC §7.5):
 * IVA cobrado (facturas emitidas) − IVA pagado (gastos deducibles) = IVA a pagar (modelo 303); retenciones; rendimiento.
 */
export function resumenFiscal(c: Pick<Colecciones, 'invoices' | 'expenses'>, hoy: Fecha) {
  const q = trimestreDe(hoy);
  const fs = emitidas(c.invoices).filter((f) => trimestreDe(f.date) === q);
  const gs = c.expenses.filter((g) => g.deductible && trimestreDe(g.date) === q);
  const ing = fs.reduce((a, f) => { const t = totales(f); return { base: a.base + t.base, iva: a.iva + t.iva, irpf: a.irpf + t.irpf }; }, { base: 0, iva: 0, irpf: 0 });
  const gas = gs.reduce((a, g) => { const t = totalesGasto(g); return { base: a.base + t.base, iva: a.iva + t.iva }; }, { base: 0, iva: 0 });
  return {
    ivaCobrado: r2(ing.iva),
    ivaPagado: r2(gas.iva),
    ivaAPagar: r2(ing.iva - gas.iva),
    retenciones: r2(ing.irpf),
    ingresos: r2(ing.base),
    gastos: r2(gas.base),
    rendimiento: r2(ing.base - gas.base),
  };
}

/** Lo facturado (sin IVA), gastado y lo que queda de un proyecto (projectMoney del prototipo, sin horas). */
export function dineroProyecto(c: Pick<Colecciones, 'invoices' | 'expenses'>, projectId: Id) {
  const facturado = r2(emitidas(c.invoices).filter((f) => f.projectId === projectId).reduce((a, f) => a + totales(f).base, 0));
  const gastos = r2(c.expenses.filter((g) => g.projectId === projectId).reduce((a, g) => a + (Number(g.base) || 0), 0));
  return { facturado, gastos, margen: r2(facturado - gastos), pct: facturado ? Math.round(((facturado - gastos) / facturado) * 100) : 0 };
}

/** Lo facturado y lo que debe una empresa. */
export function dineroEmpresa(c: Pick<Colecciones, 'invoices' | 'payments'>, companyId: Id) {
  const em = emitidas(c.invoices).filter((f) => f.companyId === companyId);
  return {
    facturado: r2(em.reduce((a, f) => a + totales(f).base, 0)),
    teDebe: r2(em.reduce((a, f) => a + totalesDe(c, f).pending, 0)),
  };
}
