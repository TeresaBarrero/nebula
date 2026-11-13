import { APUNTES, FASES_OPORTUNIDAD, type Pastel } from '@/lib/catalogos/crm';
import type { NombreIcono } from '@/lib/catalogos/iconos';
import type { Colecciones, Contacto, Fecha, Id } from '@/lib/datos/entidades';
import { eur } from './dinero';
import { diasHasta } from './fechas';

export type ElementoHistorial = { clave: string; fecha: Fecha; icono: NombreIcono; cls: Pastel; titulo: string; texto: string };

/** ¿Pertenece algo a este contacto, empresa o proyecto? */
export type Filtro = { contactId?: Id; companyId?: Id; projectId?: Id };

/**
 * Historial unificado (SPEC §7.11): apuntes, tareas, reuniones, oportunidades, notas y documentos, mezclados por fecha.
 * Para una empresa incluye lo de sus personas y sus proyectos. Facturas, contratos y correos se añaden en sus fases.
 */
export function historial(c: Colecciones, f: Filtro, hoy: Fecha): ElementoHistorial[] {
  const personas = f.companyId ? new Set(c.contacts.filter((x) => x.companyId === f.companyId).map((x) => x.id)) : null;
  const proyectos = f.companyId
    ? new Set(c.projects.filter((p) => p.contactId && personas?.has(p.contactId)).map((p) => p.id))
    : null;

  const es = (x: { contactId?: Id | null; projectId?: Id | null; companyId?: Id | null }) => {
    if (f.contactId) return x.contactId === f.contactId;
    if (f.projectId) return x.projectId === f.projectId;
    if (f.companyId)
      return (
        x.companyId === f.companyId ||
        Boolean(x.contactId && personas?.has(x.contactId)) ||
        Boolean(x.projectId && proyectos?.has(x.projectId))
      );
    return false;
  };

  const out: ElementoHistorial[] = [];
  for (const a of c.activities.filter(es))
    out.push({ clave: 'a' + a.id, fecha: a.date, icono: APUNTES[a.type].icon, cls: APUNTES[a.type].cls, titulo: APUNTES[a.type].label, texto: a.text });
  for (const t of c.tasks.filter(es))
    out.push({ clave: 't' + t.id, fecha: t.due ?? t.createdAt.slice(0, 10), icono: 'check', cls: t.done ? 'sage' : 'mist', titulo: t.done ? 'Tarea hecha' : 'Tarea pendiente', texto: t.title });
  for (const e of c.events.filter(es))
    out.push({ clave: 'e' + e.id, fecha: e.date, icono: 'calendar', cls: 'peach', titulo: diasHasta(e.date, hoy) > 0 ? 'Reunión próxima' : 'Reunión', texto: `${e.title}${e.time ? ' · ' + e.time : ''}` });
  for (const d of c.deals.filter(es))
    out.push({ clave: 'd' + d.id, fecha: d.createdAt.slice(0, 10), icono: 'funnel', cls: FASES_OPORTUNIDAD[d.stage].cls, titulo: `Oportunidad · ${FASES_OPORTUNIDAD[d.stage].label}`, texto: `${d.title} · ${eur(d.value)}` });
  for (const n of c.notes.filter(es)) out.push({ clave: 'n' + n.id, fecha: n.date, icono: 'note', cls: n.color, titulo: 'Nota', texto: n.text });
  for (const d of c.files.filter(es)) out.push({ clave: 'f' + d.id, fecha: d.date, icono: 'paperclip', cls: 'mist', titulo: 'Documento añadido', texto: d.name });

  return out.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.clave.localeCompare(b.clave));
}

/** Última vez que hablaste con alguien: apuntes y reuniones ya pasadas (lastContact del prototipo). */
export function ultimoContacto(c: Colecciones, contactId: Id, hoy: Fecha): Fecha | null {
  const fechas = [
    ...c.activities.filter((a) => a.contactId === contactId).map((a) => a.date),
    ...c.events.filter((e) => e.contactId === contactId && diasHasta(e.date, hoy) <= 0).map((e) => e.date),
  ].sort();
  return fechas.at(-1) ?? null;
}

/** Empresa del contacto o, si no tiene, su cargo (coName del prototipo). */
export function empresaDe(c: Colecciones, x: Contacto | null | undefined): string {
  if (!x) return '';
  return c.companies.find((e) => e.id === x.companyId)?.name || x.role || '';
}
