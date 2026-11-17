import { AUTOMATIZACIONES, RECORDATORIOS_PAGO, TIPOS_CONTRATO } from '@/lib/catalogos/cliente';
import type { Ajustes, Reservas } from '@/lib/datos/tipos';
import type { ClaveAutomatizacion, Colecciones, Contrato, Factura, Fecha, Id, InformeMensual, Reunion } from '@/lib/datos/entidades';
import { eur } from './dinero';
import { esEmitida, estadoDe, pagosDe, totalesDe } from './facturas';
import { aFecha, diasHasta, fechaLargaDe, iso, sumarDias, sumarMeses } from './fechas';
import { enMarcha } from './proyectos';
import { mesDe } from './recurrentes';
import { briefDe, rondasDe } from './trabajo';

// ───────── Contratos (SPEC §7.6) ─────────

type Ctx = Pick<Colecciones, 'projects' | 'retainers' | 'contacts' | 'companies' | 'deliverables'>;
type Emisor = Pick<Ajustes, 'legalName' | 'business' | 'payDays' | 'rate' | 'extraRound' | 'nif' | 'address'>;
const nombreEmisor = (a: Emisor) => (a.legalName || a.business || 'quien firma').split(' (')[0];

/** Cláusulas numeradas generadas con los datos (clauses() del prototipo). */
export function clausulas(k: Contrato, c: Ctx, a: Emisor): [string, string][] {
  const p = c.projects.find((x) => x.id === k.projectId);
  const r = c.retainers.find((x) => x.id === k.retainerId);
  const persona = c.contacts.find((x) => x.id === k.contactId);
  const yo = nombreEmisor(a);
  const derechos = {
    cesion: `Cuando ${yo} haya cobrado el total, el cliente recibe los derechos de uso y explotación de los trabajos finales, sin límite de tiempo ni territorio. Los bocetos y propuestas descartadas siguen siendo de quien los creó.`,
    licencia: 'El cliente puede usar los trabajos para su comunicación mientras dure la relación. Los derechos de autor siguen siendo de quien los creó.',
    colaborador: `Los derechos de explotación de todo lo creado en este encargo pasan a ${yo} en el momento del pago, para poder cederlos a sus clientes.`,
  }[k.ip];
  const L: [string, string][] = [];
  if (k.type === 'colaborador') {
    L.push(
      ['Objeto del encargo', k.scope || `Colaboración en proyectos de ${a.business || yo}.`],
      ['Tarifa y pago', `${persona?.rate ? `${eur(persona.rate)} por hora, ` : ''}con factura mensual del trabajo realizado y pago en ${a.payDays} días.`],
      ['Plazos', 'Cada encargo tendrá su fecha de entrega, acordada por escrito antes de empezar.'],
      ['Propiedad intelectual', derechos],
      ['Confidencialidad', 'No se puede compartir información de los clientes ni de sus proyectos, ni durante ni después de la colaboración.'],
    );
  } else if (k.type === 'iguala') {
    L.push(
      ['Servicio', r?.services || 'Servicio mensual acordado.'],
      ['Cuota', `${eur(r?.fee ?? 0)} al mes más IVA, facturados el día ${r?.billingDay ?? 1} de cada mes.`],
      ['Horas incluidas', `${r?.hours ?? 0} horas al mes. Las horas de más se cobran a ${eur(a.rate)}/h, avisando antes.`],
      ['Duración', 'Mensual, se renueva sola. Cualquiera de las partes puede terminarla avisando con 30 días.'],
      ['Propiedad intelectual', derechos],
      ['Confidencialidad', 'Ambas partes mantendrán en secreto la información que se compartan.'],
    );
  } else {
    const entregables = c.deliverables.filter((d) => d.projectId === k.projectId).map((d) => d.name);
    L.push(
      ['Objeto', `${p?.description || p?.name || 'Proyecto'}${entregables.length ? ` Entregables: ${entregables.join(', ')}.` : ''}`],
      ['Plazos', `Empieza el ${fechaLargaDe(p?.start ?? null)} y se entrega el ${fechaLargaDe(p?.end ?? null)}. Si el cliente tarda en enviar material o respuestas, la entrega se retrasa los mismos días.`],
      ['Precio y forma de pago', `${eur(p?.budget ?? 0)} más IVA. ${k.deposit ? `Un ${k.deposit} % al firmar este contrato y el resto a la entrega` : 'A la entrega'}, con un plazo de pago de ${a.payDays} días.`],
      ['Rondas de cambios', `Incluye ${p?.roundsIncluded ?? 2} rondas de cambios por entregable. Cada ronda extra cuesta ${eur(a.extraRound)} más IVA.`],
      ['Propiedad intelectual', derechos],
    );
    if (k.portfolio) L.push(['Portfolio', 'Se podrá mostrar el trabajo terminado en el portfolio y las redes de quien lo creó, salvo que el cliente pida lo contrario por escrito.']);
    L.push(
      ['Cancelación', 'Si el cliente cancela el proyecto, pagará el trabajo hecho hasta ese momento. El anticipo no se devuelve.'],
      ['Confidencialidad', 'Ambas partes mantendrán en secreto la información que se compartan.'],
    );
  }
  if (k.extra) L.push(['Otras condiciones', k.extra]);
  return L;
}

/** Texto completo del contrato: es lo que se firma y de lo que se calcula la huella. */
export function textoContrato(k: Contrato, c: Ctx, a: Emisor): string {
  const empresa = c.companies.find((e) => e.id === k.companyId);
  const persona = c.contacts.find((x) => x.id === k.contactId);
  const para = empresa ? `${empresa.name} (NIF ${empresa.nif || '—'}), ${empresa.address}` : persona ? `${persona.name}${persona.nif ? ` (NIF ${persona.nif})` : ''}` : '—';
  return [
    `CONTRATO · ${TIPOS_CONTRATO[k.type].label}`,
    k.title,
    `De: ${a.legalName || a.business} (NIF ${a.nif || '—'}), ${a.address}`,
    `Para: ${para}`,
    ...clausulas(k, c, a).map(([t, x], i) => `${i + 1}. ${t}. ${x}`),
  ].join('\n');
}

/** Huella SHA-256 en hexadecimal (funciona en el navegador y en el servidor). */
export async function huella(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const h = await globalThis.crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Validación de la firma: nombre escrito (mín. 3 letras) y casilla aceptada. */
export function problemaFirma(nombre: string, acepta: boolean): string | null {
  if (nombre.trim().replace(/\s+/g, ' ').length < 3) return 'Escribe tu nombre completo como firma';
  if (!acepta) return 'Marca la casilla de que has leído y aceptas el contrato';
  return null;
}

// ───────── Automatizaciones (SPEC §6.20) ─────────

export const automatizacionActiva = (c: Pick<Colecciones, 'automations'>, k: ClaveAutomatizacion) => c.automations.find((a) => a.key === k)?.on ?? AUTOMATIZACIONES[k].porDefecto;
export const yaEjecutada = (c: Pick<Colecciones, 'automationRuns'>, k: ClaveAutomatizacion, ref: string) => c.automationRuns.some((r) => r.key === k && r.ref === ref);
export function ejecucionesDe(c: Pick<Colecciones, 'automationRuns'>, k: ClaveAutomatizacion) {
  const rs = c.automationRuns.filter((r) => r.key === k);
  return { veces: rs.length, ultima: rs.map((r) => r.createdAt.slice(0, 10)).sort().at(-1) ?? null };
}

/** Recordatorio de pago que toca hoy (el más reciente que ya ha llegado y no se ha enviado), o null. */
export function recordatorioQueToca(f: Factura, c: Pick<Colecciones, 'payments' | 'automationRuns'>, hoy: Fecha): { dias: number; label: string } | null {
  if (!esEmitida(f) || !f.due) return null;
  const t = totalesDe(c, f);
  if (t.pending <= 0 || t.total <= 0) return null;
  const pasados = RECORDATORIOS_PAGO.filter(([d]) => diasHasta(sumarDias(f.due!, d), hoy) <= 0);
  const ultimo = pasados.at(-1);
  if (!ultimo || yaEjecutada(c, 'overdue', `${f.id}:${ultimo[0]}`)) return null;
  return { dias: ultimo[0], label: ultimo[1] };
}

/** ¿Toca recordar al cliente que revise un entregable? (5 días sin respuesta, una vez por envío). */
export function toqueQueToca(v: Colecciones['deliverables'][number], c: Pick<Colecciones, 'automationRuns'>, hoy: Fecha) {
  return v.status === 'enviado' && Boolean(v.sentAt) && diasHasta(v.sentAt!, hoy) <= -5 && !yaEjecutada(c, 'nudge', `${v.id}:${v.sentAt}`);
}

// ───────── Página de reservas (SPEC §6.18) ─────────

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * Huecos libres de los próximos `n` días con reservas (empezando mañana): según el horario y la duración,
 * sin solaparse con reuniones que ya hay.
 */
export function huecosReserva(b: Reservas, eventos: Pick<Reunion, 'date' | 'time'>[], hoy: Fecha, n = 5, maxDias = 30): { fecha: Fecha; horas: string[] }[] {
  const out: { fecha: Fecha; horas: string[] }[] = [];
  const dur = b.duration || 30;
  for (let d = 1; out.length < n && d <= maxDias; d++) {
    const f = sumarDias(hoy, d);
    const dia = aFecha(f).getDay() || 7;
    if (!b.days.includes(dia)) continue;
    const ocupadas = eventos.filter((e) => e.date === f && e.time).map((e) => aMin(e.time));
    const horas: string[] = [];
    for (let m = aMin(b.from); m + dur <= aMin(b.to); m += dur) {
      // Una reunión ya puesta bloquea el hueco si empieza dentro de él o menos de una duración antes.
      if (!ocupadas.some((o) => o < m + dur && o + dur > m)) horas.push(aHora(m));
    }
    out.push({ fecha: f, horas });
  }
  return out;
}

export const huecoLibre = (b: Reservas, eventos: Pick<Reunion, 'date' | 'time'>[], hoy: Fecha, fecha: Fecha, hora: string) =>
  huecosReserva(b, eventos, hoy, 60, 60).some((x) => x.fecha === fecha && x.horas.includes(hora));

/** Nombre corto para las direcciones públicas a partir del nombre del estudio. */
export function slugDe(texto: string): string {
  const s = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s.length >= 3 ? s : `estudio-${s || 'nebula'}`.slice(0, 40);
}

// ───────── Informes mensuales (SPEC §4.17) ─────────

export const mesAnterior = (hoy: Fecha) => mesDe(sumarMeses(`${mesDe(hoy)}-01`, -1));
export const etiquetaMes = (ym: string) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(aFecha(`${ym}-01`));

/** Informe de una iguala para un mes (o uno nuevo con los datos del anterior como referencia). */
export function informeDe(c: Pick<Colecciones, 'reports' | 'retainers'>, retainerId: Id, mes: string, id: Id, ahora: string): InformeMensual {
  const ya = c.reports.find((x) => x.retainerId === retainerId && x.month === mes);
  if (ya) return ya;
  const anterior = c.reports.filter((x) => x.retainerId === retainerId && x.month < mes).sort((a, b) => a.month.localeCompare(b.month)).at(-1);
  return {
    id, retainerId, companyId: c.retainers.find((r) => r.id === retainerId)?.companyId ?? null, month: mes, status: 'borrador', sentAt: null,
    kpis: {}, prev: { ...(anterior?.kpis ?? {}) }, summary: '', next: '', createdAt: ahora,
  };
}

/** Cambio respecto al mes anterior en %, o null si no hay con qué comparar. */
export function cambioKpi(v: number | undefined, antes: number | undefined): number | null {
  if (v === undefined || antes === undefined || !antes) return null;
  return Math.round(((v - antes) / antes) * 100);
}

// ───────── Portal del cliente (SPEC §6.17) ─────────

export type DatosPortal = ReturnType<typeof datosPortal>;

/**
 * Lo que ve una empresa en su portal. SOLO datos de esa empresa (sus personas y sus proyectos):
 * se usa igual en la vista previa de la app y en el servidor del portal real.
 */
export function datosPortal(c: Colecciones, companyId: Id, a: Pick<Ajustes, 'business' | 'legalName' | 'nif' | 'address' | 'iban' | 'extraRound' | 'payDays' | 'rate'>, hoy: Fecha) {
  const empresa = c.companies.find((e) => e.id === companyId);
  if (!empresa) return null;
  const personas = c.contacts.filter((x) => x.companyId === companyId);
  const ids = new Set(personas.map((x) => x.id));
  const proyectos = c.projects.filter((p) => p.contactId && ids.has(p.contactId));
  const pids = new Set(proyectos.map((p) => p.id));
  const contratos = c.contracts.filter((k) => k.companyId === companyId && k.status !== 'borrador');
  const ctxContrato = { ...c, projects: proyectos, deliverables: c.deliverables.filter((d) => pids.has(d.projectId)) };
  return {
    empresa: { id: empresa.id, name: empresa.name },
    estudio: a.business || a.legalName,
    persona: personas[0] ? { id: personas[0].id, name: personas[0].name } : null,
    contratos: contratos.map((k) => ({ ...k, clausulas: clausulas(k, ctxContrato, a), texto: textoContrato(k, ctxContrato, a) })),
    briefings: proyectos
      .filter((p) => enMarcha(p) && briefDe(p).status !== 'completado')
      .map((p) => ({ id: p.id, name: p.name, discipline: p.discipline, answers: briefDe(p).answers })),
    entregables: c.deliverables
      .filter((d) => pids.has(d.projectId) && d.status === 'enviado')
      .map((d) => {
        const p = proyectos.find((x) => x.id === d.projectId);
        return { id: d.id, name: d.name, proyecto: p?.name ?? '', version: d.versions?.length ?? 0, rondas: rondasDe(d, p) };
      }),
    presupuestos: c.invoices
      .filter((f) => f.companyId === companyId && f.kind === 'presupuesto' && f.status === 'enviado')
      .map((f) => ({ ...f, total: totalesDe(c, f).total })),
    facturas: c.invoices
      .filter((f) => f.companyId === companyId && esEmitida(f))
      .sort((x, y) => y.date.localeCompare(x.date))
      .map((f) => ({ ...f, pagos: pagosDe(c, f.id), ...totalesDe(c, f), estado: estadoDe(c, f, hoy) })),
    informes: c.reports
      .filter((r) => r.companyId === companyId && r.status === 'enviado')
      .sort((x, y) => y.month.localeCompare(x.month))
      .map((r) => {
        const ig = c.retainers.find((x) => x.id === r.retainerId);
        return {
          ...r,
          iguala: ig ? { name: ig.name, hours: ig.hours, discipline: ig.discipline } : null,
          publicaciones: c.posts.filter((p) => p.companyId === companyId && mesDe(p.date) === r.month && p.status === 'publicado').map((p) => ({ id: p.id, title: p.title, channel: p.channel, date: p.date })),
          minutos: c.timeEntries.filter((e) => e.retainerId === r.retainerId && mesDe(e.date) === r.month).reduce((s, e) => s + e.minutes, 0),
        };
      }),
    proyectos: proyectos.filter(enMarcha).map((p) => ({ id: p.id, name: p.name, status: p.status, end: p.end })),
    pago: { iban: a.iban, extraRound: a.extraRound },
    emisor: { legalName: a.legalName || a.business, nif: a.nif, address: a.address },
  };
}

/** Cuántas cosas tiene pendientes el cliente. */
export function pendientesPortal(d: NonNullable<DatosPortal>) {
  return d.contratos.filter((k) => k.status === 'enviado').length + d.briefings.length + d.entregables.length + d.presupuestos.length + d.facturas.filter((f) => f.pending > 0).length;
}

/** Fecha del enlace caducado (30 días). */
export const caducidadEnlace = (ahora: Date) => new Date(ahora.getTime() + 30 * 864e5);
export const hoyMadrid = (ahora: Date = new Date()) => iso(new Date(ahora.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })));
