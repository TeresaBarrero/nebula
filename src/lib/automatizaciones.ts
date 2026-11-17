/**
 * Automatizaciones de nebúla (SPEC §6.20). La misma lógica la ejecuta la app (demo o nube) y el servidor
 * (portal del cliente, formulario web, tarea diaria), cada uno con su «Ejecutor».
 * Cada disparador registra su ejecución con una referencia: si ya estaba, no se repite (SPEC §13).
 */
import { TIPOS_RENOVACION } from '@/lib/catalogos/dinero';
import { DISCIPLINAS, type Disciplina } from '@/lib/catalogos/disciplinas';
import type { Ajustes } from '@/lib/datos/tipos';
import type {
  ClaveAutomatizacion,
  Colecciones,
  Contrato,
  Empresa,
  Entregable,
  Factura,
  FilaDe,
  Id,
  LineaFactura,
  NombreColeccion,
  Oportunidad,
  Proyecto,
  Tarea,
} from '@/lib/datos/entidades';
import { automatizacionActiva, recordatorioQueToca, toqueQueToca } from './reglas/cliente';
import { eur2, r2 } from './reglas/dinero';
import { borradorDe, documentoNuevo, emitidas, totales, totalesDe } from './reglas/facturas';
import { fechaLargaDe, sumarDias } from './reglas/fechas';
import { igualaPorFacturar, mesDe, nombreMes } from './reglas/recurrentes';
import { briefDe } from './reglas/trabajo';

export type Correo = { to: string; subject: string; body: string; kind: string; contactId: Id | null; companyId: Id | null };

export interface Ejecutor {
  crear<K extends NombreColeccion>(col: K, fila: FilaDe<K>): Promise<boolean>;
  actualizar<K extends NombreColeccion>(col: K, id: Id, cambios: Partial<FilaDe<K>>): Promise<boolean>;
  emitir(id: Id): Promise<Factura | null>;
  correo(c: Correo): Promise<void>;
  /** Apunta la ejecución. Devuelve false si ya se había hecho para esa referencia (entonces no se repite). */
  registrar(key: ClaveAutomatizacion, ref: string): Promise<boolean>;
}

export type Contexto = {
  c: Colecciones;
  ajustes: Ajustes;
  hoy: string;
  ahora: string;
  nuevoId: () => Id;
  /** Enlace al portal de una empresa (o null si no se puede crear). */
  enlacePortal: (companyId: Id, contactId: Id | null) => Promise<string | null>;
};

const tareaBase = (o: Partial<Tarea> & Pick<Tarea, 'id' | 'title' | 'createdAt'>): Tarea => ({
  due: null, urgent: false, important: true, done: false, projectId: null, contactId: null, assigneeId: null, estimate: 2,
  repeat: '', blockedBy: null, nextCreated: false, phase: null, ...o,
});
const base = (x: Contexto, empresas: Empresa[] = x.c.companies) => ({ id: x.nuevoId(), hoy: x.hoy, ahora: x.ahora, ajustes: x.ajustes, empresas });
const firma = (x: Contexto) => `\n\nUn saludo,\n${x.ajustes.business || x.ajustes.legalName}`;

/** Añade una línea al borrador de factura del cliente (o crea uno). */
async function aBorrador(x: Contexto, ej: Ejecutor, companyId: Id | null, contactId: Id | null, projectId: Id | null, linea: LineaFactura) {
  const previo = borradorDe(x.c.invoices, companyId);
  if (previo) return (await ej.actualizar('invoices', previo.id, { lines: [...previo.lines, linea] })) ? previo.id : null;
  const f = documentoNuevo('factura', { companyId, contactId, projectId, lines: [linea] }, base(x));
  return (await ej.crear('invoices', f)) ? f.id : null;
}

/** Email del contacto o, si no tiene, el de facturas de su empresa. */
function emailDe(x: Contexto, contactId: Id | null, companyId: Id | null) {
  return x.c.contacts.find((p) => p.id === contactId)?.email || x.c.companies.find((e) => e.id === companyId)?.email || '';
}
const saludo = (x: Contexto, contactId: Id | null) => `Hola${x.c.contacts.find((p) => p.id === contactId)?.name ? ` ${x.c.contacts.find((p) => p.id === contactId)!.name.split(' ')[0]}` : ''}:`;

// ───────── won: se gana una oportunidad ─────────

/** Tras crear el proyecto de una oportunidad ganada: briefing enviado y contrato enviado para firmar. */
export async function alGanar(d: Oportunidad, p: Proyecto, x: Contexto, ej: Ejecutor): Promise<boolean> {
  if (!automatizacionActiva(x.c, 'won') || !(await ej.registrar('won', d.id))) return false;
  const companyId = d.companyId ?? x.c.contacts.find((c) => c.id === p.contactId)?.companyId ?? null;
  await ej.actualizar('projects', p.id, { brief: { ...briefDe(p), status: 'enviado', sentDate: x.hoy } });
  const k: Contrato = {
    id: x.nuevoId(), type: 'proyecto', title: `Contrato · ${p.name}`, projectId: p.id, retainerId: null, companyId, contactId: p.contactId,
    deposit: 30, ip: 'cesion', portfolio: true, scope: '', extra: '', status: 'enviado', sentAt: x.hoy, signedAt: null, signedBy: '',
    signedIp: '', signedUserAgent: '', signedText: '', documentHash: '', depositInvoiceId: null, createdAt: x.ahora,
  };
  await ej.crear('contracts', k);
  const to = emailDe(x, p.contactId, companyId);
  const enlace = companyId ? await x.enlacePortal(companyId, p.contactId) : null;
  if (to && enlace)
    await ej.correo({
      to, kind: 'portal', contactId: p.contactId, companyId,
      subject: `Empezamos «${p.name}»: contrato y briefing`,
      body: `${saludo(x, p.contactId)}\n\n¡Gracias por confiar en nosotros! Para arrancar, en tu portal tienes el contrato para firmar y unas preguntas para conocer bien el proyecto:\n\n${enlace}${firma(x)}`,
    });
  return true;
}

// ───────── signed: el cliente firma el contrato ─────────

/** Tras la firma: apunte en el historial y, si toca, factura del anticipo emitida. Devuelve la factura emitida. */
export async function alFirmar(k: Contrato, x: Contexto, ej: Ejecutor): Promise<Factura | null> {
  await ej.crear('activities', { id: x.nuevoId(), type: 'nota', text: `Ha firmado el contrato «${k.title}».`, date: x.hoy, contactId: k.contactId, projectId: k.projectId, createdAt: x.ahora });
  const p = x.c.projects.find((y) => y.id === k.projectId);
  if (!p || !k.deposit || !automatizacionActiva(x.c, 'signed') || !(await ej.registrar('signed', k.id))) return null;
  const importe = r2((p.budget * k.deposit) / 100);
  if (importe <= 0) return null;
  const f = documentoNuevo(
    'factura',
    { companyId: k.companyId, contactId: k.contactId, projectId: p.id, lines: [{ desc: `${p.name} · anticipo del ${k.deposit} % a la firma`, qty: 1, price: importe }], notes: `Según contrato «${k.title}»` },
    base(x),
  );
  if (!(await ej.crear('invoices', f))) return null;
  const emitida = await ej.emitir(f.id);
  if (emitida) await ej.actualizar('contracts', k.id, { depositInvoiceId: emitida.id });
  return emitida;
}

// ───────── approved: se aprueba el último entregable ─────────

/** Aprueba un entregable. Si era el último del proyecto: proyecto entregado, factura final en borrador y tarea de portfolio. */
export async function alAprobar(v: Entregable, x: Contexto, ej: Ejecutor): Promise<'aprobado' | 'proyecto-entregado'> {
  await ej.actualizar('deliverables', v.id, { status: 'aprobado', approvedAt: x.hoy });
  const p = x.c.projects.find((y) => y.id === v.projectId);
  if (!p) return 'aprobado';
  const todos = x.c.deliverables.filter((d) => d.projectId === p.id).map((d) => (d.id === v.id ? { ...d, status: 'aprobado' as const } : d));
  if (!todos.every((d) => d.status === 'aprobado') || p.status === 'entregado') return 'aprobado';
  if (!automatizacionActiva(x.c, 'approved') || !(await ej.registrar('approved', p.id))) return 'aprobado';
  await ej.actualizar('projects', p.id, { status: 'entregado', prevStatus: null });
  const facturado = emitidas(x.c.invoices).filter((f) => f.projectId === p.id).reduce((s, f) => s + totales(f).base, 0);
  const resto = r2(p.budget - facturado);
  const persona = x.c.contacts.find((c) => c.id === p.contactId);
  if (resto > 0) await aBorrador(x, ej, persona?.companyId ?? null, persona?.id ?? null, p.id, { desc: `${p.name} · pago final`, qty: 1, price: resto });
  await ej.crear('tasks', tareaBase({ id: x.nuevoId(), title: `Pedir a ${persona?.name.split(' ')[0] ?? 'el cliente'} su opinión para el portfolio`, due: sumarDias(x.hoy, 2), projectId: p.id, contactId: persona?.id ?? null, estimate: 0.5, createdAt: x.ahora }));
  return 'proyecto-entregado';
}

// ───────── lead: llega un formulario web ─────────

export type DatosLead = { nombre: string; email: string; empresa: string; disciplina: Disciplina; presupuesto: number; mensaje: string; telefono: string };

/** Contacto (con permiso), empresa, oportunidad «Desde tu web» y, si está activa, tarea urgente «Llamar en 24 h». */
export async function alLlegarLead(l: DatosLead, x: Contexto, ej: Ejecutor): Promise<Id | null> {
  let companyId: Id | null = null;
  if (l.empresa) {
    companyId = x.nuevoId();
    await ej.crear('companies', { id: companyId, name: l.empresa.slice(0, 200), nif: '', sector: '', address: '', email: l.email, phone: l.telefono, web: '', notes: '', isPrivate: false, createdAt: x.ahora });
  }
  const contactId = x.nuevoId();
  const ok = await ej.crear('contacts', {
    id: contactId, name: l.nombre.slice(0, 160), companyId, role: '', nif: '', email: l.email, phone: l.telefono, type: 'Cliente', status: 'potencial', tags: ['web'], notes: '',
    specialty: null, rate: null, availability: null, consent: true, consentDate: x.hoy, consentVia: 'Formulario web', createdAt: x.ahora,
  });
  if (!ok) return null;
  await ej.crear('deals', {
    id: x.nuevoId(), title: `${DISCIPLINAS[l.disciplina]?.label ?? 'Proyecto'} para ${l.empresa || l.nombre}`.slice(0, 200), discipline: l.disciplina, companyId, contactId,
    value: l.presupuesto, prob: 10, stage: 'nuevo', expected: sumarDias(x.hoy, 30), source: 'Formulario web', notes: l.mensaje.slice(0, 5000), lostReason: '', projectId: null, closedAt: null, createdAt: x.ahora,
  });
  if (l.mensaje) await ej.crear('activities', { id: x.nuevoId(), type: 'nota', text: `Mensaje desde la web: ${l.mensaje}`.slice(0, 5000), date: x.hoy, contactId, projectId: null, createdAt: x.ahora });
  if (automatizacionActiva(x.c, 'lead') && (await ej.registrar('lead', contactId)))
    await ej.crear('tasks', tareaBase({ id: x.nuevoId(), title: `Llamar a ${l.nombre} (contacto de la web)`.slice(0, 300), due: sumarDias(x.hoy, 1), urgent: true, contactId, estimate: 0.5, createdAt: x.ahora }));
  return contactId;
}

// ───────── Tarea diaria: overdue, nudge y retainer ─────────

/** Lo que se hace cada mañana: recordatorios de pago, toques por entregables y facturas de igualas. Devuelve cuántas cosas hizo. */
export async function tareasDiarias(x: Contexto, ej: Ejecutor): Promise<{ recordatorios: number; toques: number; igualas: number }> {
  const r = { recordatorios: 0, toques: 0, igualas: 0 };
  if (automatizacionActiva(x.c, 'overdue'))
    for (const f of x.c.invoices) {
      const toca = recordatorioQueToca(f, x.c, x.hoy);
      const to = toca && emailDe(x, f.contactId, f.companyId);
      if (!toca || !to || !(await ej.registrar('overdue', `${f.id}:${toca.dias}`))) continue;
      const pendiente = eur2(totalesDe(x.c, f).pending);
      const enlace = f.companyId ? await x.enlacePortal(f.companyId, f.contactId) : null;
      await ej.correo({
        to, kind: 'recordatorio', contactId: f.contactId, companyId: f.companyId,
        subject: toca.dias < 0 ? `La factura ${f.number} vence el ${fechaLargaDe(f.due)}` : `Recordatorio: factura ${f.number} pendiente`,
        body: `${saludo(x, f.contactId)}\n\n${toca.dias < 0 ? `Te recuerdo que la factura ${f.number} (${pendiente}) vence el ${fechaLargaDe(f.due)}.` : `La factura ${f.number} venció el ${fechaLargaDe(f.due)} y quedan ${pendiente} por pagar.`}${enlace ? `\n\nPuedes verla y pagarla desde tu portal:\n${enlace}` : x.ajustes.iban ? `\n\nPuedes pagarla por transferencia a ${x.ajustes.iban}.` : ''}\n\nSi ya la has pagado, olvida este mensaje.${firma(x)}`,
      });
      r.recordatorios++;
    }
  if (automatizacionActiva(x.c, 'nudge'))
    for (const v of x.c.deliverables) {
      if (!toqueQueToca(v, x.c, x.hoy)) continue;
      const p = x.c.projects.find((y) => y.id === v.projectId);
      const persona = x.c.contacts.find((c) => c.id === p?.contactId);
      const to = persona?.email;
      if (!p || !to || !(await ej.registrar('nudge', `${v.id}:${v.sentAt}`))) continue;
      const enlace = persona.companyId ? await x.enlacePortal(persona.companyId, persona.id) : null;
      await ej.correo({
        to, kind: 'toque', contactId: persona.id, companyId: persona.companyId,
        subject: `¿Has podido revisar «${v.name}»?`,
        body: `${saludo(x, persona.id)}\n\nHace unos días te envié «${v.name}» de ${p.name}. Cuando puedas, revísalo y apruébalo o déjame tus comentarios${enlace ? ` aquí:\n\n${enlace}` : '.'}${firma(x)}`,
      });
      r.toques++;
    }
  if (automatizacionActiva(x.c, 'retainer'))
    for (const ig of x.c.retainers) {
      if (!igualaPorFacturar(ig, x.hoy) || !(await ej.registrar('retainer', `${ig.id}:${mesDe(x.hoy)}`))) continue;
      const f = documentoNuevo('factura', { companyId: ig.companyId, contactId: ig.contactId, retainerId: ig.id, lines: [{ desc: `${ig.name} · ${nombreMes(x.hoy)}`, qty: 1, price: ig.fee }] }, base(x));
      if (!(await ej.crear('invoices', f))) continue;
      if (await ej.emitir(f.id)) {
        await ej.actualizar('retainers', ig.id, { lastBilled: mesDe(x.hoy) });
        r.igualas++;
      }
    }
  return r;
}

/** Textos de los correos que se mandan a mano desde la app. */
export const correos = {
  portal: (nombre: string, estudio: string, enlace: string) => ({
    subject: `Tu portal de ${estudio}`,
    body: `Hola${nombre ? ` ${nombre.split(' ')[0]}` : ''}:\n\nAquí tienes tu portal, donde puedes firmar contratos, revisar entregables, ver presupuestos y pagar facturas:\n\n${enlace}\n\nEl enlace es personal; no lo compartas. Caduca en 30 días (puedes pedir otro desde la misma página).\n\nUn saludo,\n${estudio}`,
  }),
  contrato: (nombre: string, estudio: string, titulo: string, enlace: string) => ({
    subject: `Contrato para firmar: ${titulo}`,
    body: `Hola${nombre ? ` ${nombre.split(' ')[0]}` : ''}:\n\nTe envío el contrato «${titulo}». Puedes leerlo y firmarlo desde tu portal, en un minuto y desde el móvil:\n\n${enlace}\n\nUn saludo,\n${estudio}`,
  }),
  informe: (nombre: string, estudio: string, mes: string, enlace: string) => ({
    subject: `Tu informe de ${mes}`,
    body: `Hola${nombre ? ` ${nombre.split(' ')[0]}` : ''}:\n\nYa tienes en tu portal el informe de ${mes}, con los resultados del mes y lo que haremos el siguiente:\n\n${enlace}\n\nUn saludo,\n${estudio}`,
  }),
  renovacion: (tipo: keyof typeof TIPOS_RENOVACION) => TIPOS_RENOVACION[tipo].label,
};
