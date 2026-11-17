import { FASES_ABIERTAS, type Pastel } from '@/lib/catalogos/crm';
import type { NombreIcono } from '@/lib/catalogos/iconos';
import type { Colecciones, Fecha } from '@/lib/datos/entidades';
import { diasHasta, relativa } from './fechas';
import { eur, eur2 } from './dinero';
import { estadoDe, totalesDe } from './facturas';
import { empresaDe, ultimoContacto } from './historial';
import { igualaPorFacturar, mesDe } from './recurrentes';
import { briefDe, minutosIguala, rondasDe } from './trabajo';

/** A dónde lleva pulsar un aviso: una página o el formulario de algo. */
export type Destino = { ruta: string } | { formulario: 'task' | 'deal' | 'event' | 'note' | 'expense' | 'retainer' | 'renewal' | 'post' | 'time'; id: string };

export type Aviso = { clave: string; icono: NombreIcono; cls: Pastel; texto: string; sub: string; destino: Destino };

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

/**
 * Avisos de la campana (SPEC §7.9). Se calculan cada vez a partir de los datos.
 * La clave incluye la fecha que lo provoca: si cambia (p. ej. se aplaza la tarea), vuelve a salir como no leído.
 * Salen los de tareas, reuniones, entregables, rondas, briefings, contenidos, oportunidades, contactos, facturas,
 * igualas y renovaciones; los de contratos e informes mensuales llegan en la Fase 4.
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

  for (const v of c.deliverables) {
    const r = rondasDe(v, proyecto(v.projectId));
    if (r.porCobrar > 0)
      out.push({ clave: `dx-${v.id}-${r.extra}`, icono: 'euro', cls: 'rose', texto: `Ronda de cambios extra sin cobrar: ${v.name}`, sub: proyecto(v.projectId)?.name ?? '', destino: { ruta: `/proyectos?p=${v.projectId}` } });
  }
  for (const p of c.projects) {
    const b = briefDe(p);
    if (b.status === 'enviado' && b.sentDate && d(b.sentDate) <= -3)
      out.push({ clave: `br-${p.id}-${b.sentDate}`, icono: 'brief', cls: 'lilac', texto: 'El cliente aún no ha rellenado el briefing', sub: p.name, destino: { ruta: `/proyectos?p=${p.id}` } });
  }
  for (const x of c.posts)
    if ((d(x.date) === 0 || d(x.date) === 1) && x.status !== 'programado' && x.status !== 'publicado')
      out.push({
        clave: `po-${x.id}-${x.date}`, icono: 'megaphone', cls: 'peach', texto: `Publicación sin preparar: ${x.title}`,
        sub: `${c.companies.find((e) => e.id === x.companyId)?.name ?? 'Mi marca'} · ${relativa(x.date, hoy)}`, destino: { formulario: 'post', id: x.id },
      });

  for (const o of c.deals)
    if (FASES_ABIERTAS.includes(o.stage) && o.expected && d(o.expected) < 0)
      out.push({ clave: `deal-${o.id}-${o.expected}`, icono: 'funnel', cls: 'butter', texto: `Oportunidad sin decidir: ${o.title}`, sub: `Esperabas respuesta ${relativa(o.expected, hoy).toLowerCase()}`, destino: { formulario: 'deal', id: o.id } });

  // Contactos nuevos que llegan desde el formulario web (≤ 2 días).
  for (const x of c.contacts)
    if (x.consentVia === 'Formulario web' && d(x.createdAt.slice(0, 10)) >= -2)
      out.push({ clave: `lead-${x.id}`, icono: 'inbox', cls: 'peach', texto: `Nuevo contacto desde tu web: ${x.name}`, sub: empresaDe(c, x) || 'Llámale cuanto antes', destino: { ruta: `/contactos?id=${x.id}` } });

  // ───── Dinero ─────
  const empresa = (id: string | null) => c.companies.find((e) => e.id === id)?.name ?? '';
  for (const r of c.retainers)
    if (igualaPorFacturar(r, hoy))
      out.push({ clave: `rb-${r.id}-${mesDe(hoy)}`, icono: 'repeat', cls: 'lilac', texto: `Toca facturar la iguala: ${r.name}`, sub: `${empresa(r.companyId)} · ${eur(r.fee)}`, destino: { ruta: '/igualas' } });
  for (const r of c.retainers) {
    const min = minutosIguala(c, r, hoy);
    if (r.active && r.hours && min / 60 >= r.hours * 0.9)
      out.push({ clave: `rh-${r.id}-${mesDe(hoy)}`, icono: 'timer', cls: 'peach', texto: `La iguala «${r.name}» ha gastado el ${Math.round((min / 60 / r.hours) * 100)} % de sus horas`, sub: empresa(r.companyId), destino: { ruta: '/igualas' } });
  }
  for (const n of c.renewals)
    if (d(n.renewDate) <= 15)
      out.push({
        clave: `rn-${n.id}-${n.renewDate}`, icono: 'globe', cls: d(n.renewDate) < 0 ? 'rose' : 'butter',
        texto: d(n.renewDate) < 0 ? `Ha caducado: ${n.name}` : `Renueva pronto: ${n.name}`,
        sub: `${empresa(n.companyId)} · ${relativa(n.renewDate, hoy)}`, destino: { ruta: '/igualas?tab=renovaciones' },
      });
  for (const f of c.invoices) {
    if (f.kind === 'factura' && f.status === 'emitida' && f.due && estadoDe(c, f, hoy) === 'vencida')
      out.push({ clave: `inv-${f.id}`, icono: 'euro', cls: 'rose', texto: `La factura ${f.number} está sin pagar y fuera de plazo`, sub: `${eur2(totalesDe(c, f).pending)} · venció hace ${dias(-d(f.due))}`, destino: { ruta: `/facturas?id=${f.id}` } });
    if (f.kind === 'factura' && f.status === 'borrador')
      out.push({ clave: `dr-${f.id}`, icono: 'receipt', cls: 'mist', texto: 'Tienes una factura en borrador sin emitir', sub: `${empresa(f.companyId)} · ${eur2(totalesDe(c, f).total)}`, destino: { ruta: `/facturas?id=${f.id}` } });
    if (f.kind === 'presupuesto' && f.status === 'enviado' && d(f.date) < -14)
      out.push({ clave: `pre-${f.id}`, icono: 'receipt', cls: 'sand', texto: `Escribe para saber si aceptan el presupuesto ${f.number}`, sub: `${empresa(f.companyId)} · enviado hace ${dias(-d(f.date))}`, destino: { ruta: `/facturas?tipo=presupuesto&id=${f.id}` } });
  }

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
