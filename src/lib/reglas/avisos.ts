import { FASES_ABIERTAS, type Pastel } from '@/lib/catalogos/crm';
import type { NombreIcono } from '@/lib/catalogos/iconos';
import type { Colecciones, Fecha } from '@/lib/datos/entidades';
import { diasHasta, relativa } from './fechas';
import { empresaDe, ultimoContacto } from './historial';

/** A dónde lleva pulsar un aviso: una página o el formulario de algo. */
export type Destino = { ruta: string } | { formulario: 'task' | 'deal' | 'event' | 'note'; id: string };

export type Aviso = { clave: string; icono: NombreIcono; cls: Pastel; texto: string; sub: string; destino: Destino };

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

/**
 * Avisos de la campana (SPEC §7.9). Se calculan cada vez a partir de los datos.
 * La clave incluye la fecha que lo provoca: si cambia (p. ej. se aplaza la tarea), vuelve a salir como no leído.
 * En la Fase 1 salen los de tareas, reuniones, entregables, oportunidades y contactos;
 * los de facturas, igualas, renovaciones, contratos, briefings y contenidos llegan con sus fases.
 */
export function calcularAvisos(c: Colecciones, hoy: Fecha): Aviso[] {
  const out: Aviso[] = [];
  const d = (f: Fecha) => diasHasta(f, hoy);
  const proyecto = (id: string | null) => c.projects.find((p) => p.id === id);

  for (const t of c.tasks)
    if (!t.done && t.due && d(t.due) < 0)
      out.push({ clave: `late-${t.id}-${t.due}`, icono: 'flag', cls: 'rose', texto: `Tarea atrasada: ${t.title}`, sub: `Era para ${relativa(t.due, hoy).toLowerCase()}`, destino: { formulario: 'task', id: t.id } });
  for (const t of c.tasks)
    if (!t.done && t.due === hoy)
      out.push({ clave: `today-${t.id}-${t.due}`, icono: 'check', cls: 'peach', texto: `Para hoy: ${t.title}`, sub: 'Vence hoy', destino: { ruta: '/tareas' } });

  for (const e of [...c.events].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)))
    if (d(e.date) === 0 || d(e.date) === 1)
      out.push({ clave: `ev-${e.id}-${e.date}`, icono: 'calendar', cls: 'lilac', texto: e.title, sub: `${relativa(e.date, hoy)}${e.time ? ` a las ${e.time}` : ', todo el día'}`, destino: { ruta: `/calendario?dia=${e.date}` } });

  for (const v of c.deliverables)
    if (v.status === 'enviado' && v.sentAt && d(v.sentAt) <= -5)
      out.push({ clave: `dw-${v.id}-${v.sentAt}`, icono: 'send', cls: 'butter', texto: `Llevas ${dias(-d(v.sentAt))} esperando respuesta: ${v.name}`, sub: proyecto(v.projectId)?.name ?? '', destino: { ruta: `/proyectos?p=${v.projectId}` } });

  for (const o of c.deals)
    if (FASES_ABIERTAS.includes(o.stage) && o.expected && d(o.expected) < 0)
      out.push({ clave: `deal-${o.id}-${o.expected}`, icono: 'funnel', cls: 'butter', texto: `Oportunidad sin decidir: ${o.title}`, sub: `Esperabas respuesta ${relativa(o.expected, hoy).toLowerCase()}`, destino: { formulario: 'deal', id: o.id } });

  // Contactos nuevos que llegan desde el formulario web (≤ 2 días).
  for (const x of c.contacts)
    if (x.consentVia === 'Formulario web' && d(x.createdAt.slice(0, 10)) >= -2)
      out.push({ clave: `lead-${x.id}`, icono: 'inbox', cls: 'peach', texto: `Nuevo contacto desde tu web: ${x.name}`, sub: empresaDe(c, x) || 'Llámale cuanto antes', destino: { ruta: `/contactos?id=${x.id}` } });

  const sinPermiso = c.contacts.filter((x) => !x.consent);
  if (sinPermiso.length)
    out.push({
      clave: `rgpd-${sinPermiso.map((x) => x.id).sort().join(',')}`,
      icono: 'shield',
      cls: 'rose',
      texto: `${sinPermiso.length} ${sinPermiso.length === 1 ? 'contacto' : 'contactos'} sin permiso para guardar sus datos`,
      sub: 'Apúntalo antes de enviarles nada',
      destino: { ruta: `/contactos?id=${sinPermiso[0].id}` },
    });

  for (const x of c.contacts) {
    if (x.type === 'Colaborador' || x.status === 'inactivo') continue;
    const u = ultimoContacto(c, x.id, hoy);
    if (u && d(u) <= -30)
      out.push({ clave: `fu-${x.id}-${u}`, icono: 'talk', cls: 'sage', texto: `Hace ${dias(-d(u))} que no hablas con ${x.name}`, sub: empresaDe(c, x), destino: { ruta: `/contactos?id=${x.id}` } });
  }
  return out;
}

/** Cuántos avisos quedan sin leer. */
export const sinLeer = (avisos: Aviso[], leidos: string[]) => avisos.filter((a) => !leidos.includes(a.clave)).length;
