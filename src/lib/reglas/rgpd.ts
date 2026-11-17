import type { Colecciones, Fecha, Id } from '@/lib/datos/entidades';
import { totales } from './facturas';
import { aplicarBorrado, efectoDeBorrar } from './vinculos';

/**
 * «Darle sus datos» (SPEC §7.12): todo lo que nebúla guarda sobre una persona, en un formato legible.
 * No incluye contraseñas de accesos ni datos de otras personas.
 */
export function exportarContacto(c: Colecciones, id: Id, hoy: Fecha) {
  const x = c.contacts.find((p) => p.id === id);
  if (!x) return null;
  const suyo = <T extends { contactId?: Id | null }>(l: T[]) => l.filter((y) => y.contactId === id);
  return {
    generado: hoy,
    aviso: 'Datos personales que guardamos sobre ti, según el artículo 15 del RGPD.',
    persona: {
      nombre: x.name, email: x.email, telefono: x.phone, nif: x.nif, cargo: x.role, empresa: c.companies.find((e) => e.id === x.companyId)?.name ?? '',
      tipo: x.type, etiquetas: x.tags, observaciones: x.notes, alta: x.createdAt.slice(0, 10),
      permiso: x.consent ? { desde: x.consentDate, via: x.consentVia } : null,
    },
    historial: suyo(c.activities).map((a) => ({ fecha: a.date, tipo: a.type, texto: a.text })),
    reuniones: suyo(c.events).map((e) => ({ fecha: e.date, hora: e.time, titulo: e.title })),
    notas: suyo(c.notes).map((n) => ({ fecha: n.date, texto: n.text })),
    documentos: suyo(c.files).map((d) => ({ fecha: d.date, nombre: d.name })),
    tareas: suyo(c.tasks).map((t) => ({ titulo: t.title, fecha: t.due, hecha: t.done })),
    oportunidades: suyo(c.deals).map((d) => ({ titulo: d.title, fase: d.stage, valor: d.value })),
    proyectos: c.projects.filter((p) => p.contactId === id).map((p) => ({ nombre: p.name, fase: p.status, inicio: p.start, entrega: p.end })),
    facturas: suyo(c.invoices).map((f) => ({ numero: f.number || 'borrador', tipo: f.kind, fecha: f.date, total: totales(f).total })),
    contratos: suyo(c.contracts).map((k) => ({ titulo: k.title, estado: k.status, firmado: k.signedAt, firmadoPor: k.signedBy })),
    correos: suyo(c.outgoingEmails).map((m) => ({ fecha: m.createdAt.slice(0, 10), asunto: m.subject, para: m.to })),
  };
}

/**
 * «Borrar sus datos» (SPEC §7.12), igual que la función borrar_datos_contacto de la base de datos:
 * borra ficha, apuntes, reuniones, notas, documentos y correos; desvincula tareas, oportunidades, gastos,
 * facturas y contratos (las facturas se conservan sin su vínculo). Apunta el registro sin datos personales.
 */
export function borrarDatosContacto(c: Colecciones, id: Id, hoy: Fecha, registro: { id: Id; ahora: string }): { c: Colecciones; rutas: string[] } {
  const rutas = c.files.filter((d) => d.contactId === id && d.storagePath).map((d) => d.storagePath);
  const fuera = <T extends { contactId?: Id | null }>(l: T[]) => l.filter((y) => y.contactId !== id);
  const limpio: Colecciones = {
    ...c,
    activities: fuera(c.activities),
    events: fuera(c.events),
    notes: fuera(c.notes),
    files: fuera(c.files),
    outgoingEmails: fuera(c.outgoingEmails),
  };
  const sin = aplicarBorrado(limpio, efectoDeBorrar(limpio, 'contacts', id));
  return {
    rutas,
    c: {
      ...sin,
      rgpdLog: [...sin.rgpdLog, { id: registro.id, date: hoy, action: 'Borrado de datos', detail: 'Se borraron los datos de una persona a petición suya. Sus facturas se conservan sin vínculo con ella.', createdAt: registro.ahora }],
    },
  };
}

/** ¿Queda algo de la persona? (para comprobar el borrado) */
export function quedaAlgoDe(c: Colecciones, id: Id, nombre: string, email: string): string[] {
  const restos: string[] = [];
  for (const [col, filas] of Object.entries(c) as [string, unknown[]][]) {
    if (col === 'notificationReads' || col === 'invoices' || col === 'contracts' || col === 'rgpdLog') continue;
    for (const f of filas) {
      const s = JSON.stringify(f);
      if (s.includes(`"${id}"`) || (nombre && s.includes(nombre)) || (email && s.includes(email))) restos.push(col);
    }
  }
  return [...new Set(restos)];
}
