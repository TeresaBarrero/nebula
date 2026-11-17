/**
 * Lo que puede hacer un cliente desde su portal. Cada acción comprueba que lo que toca es de SU empresa
 * (usando datosPortal, que solo contiene lo suyo). La usan la vista previa de la demo y el servidor del portal real.
 */
import { alAprobar, alFirmar, alGanar, type Contexto, type Ejecutor } from './automatizaciones';
import type { Id } from './datos/entidades';
import { datosPortal, huella, problemaFirma, textoContrato } from './reglas/cliente';
import { moverOportunidad } from './reglas/proyectos';
import { briefDe, pedirCambios } from './reglas/trabajo';

export type Rastro = { ip: string; navegador: string };
export type Resultado = { ok: boolean; mensaje: string };

const mal = (mensaje: string): Resultado => ({ ok: false, mensaje });

export async function accionPortal(
  accion: { tipo: 'firmar'; id: Id; nombre: string; acepta: boolean } | { tipo: 'brief'; id: Id; respuestas: Record<string, string> } | { tipo: 'aprobar'; id: Id } | { tipo: 'cambios'; id: Id; texto: string } | { tipo: 'presupuesto'; id: Id; acepta: boolean },
  companyId: Id,
  x: Contexto,
  ej: Ejecutor,
  rastro: Rastro,
): Promise<Resultado> {
  const d = datosPortal(x.c, companyId, x.ajustes, x.hoy);
  if (!d) return mal('No se encuentra tu portal');
  const apunte = async (texto: string, contactId: Id | null, projectId: Id | null) =>
    ej.crear('activities', { id: x.nuevoId(), type: 'nota', text: texto.slice(0, 5000), date: x.hoy, contactId, projectId, createdAt: x.ahora });

  switch (accion.tipo) {
    case 'firmar': {
      const k = d.contratos.find((y) => y.id === accion.id && y.status === 'enviado');
      if (!k) return mal('Este contrato ya no está pendiente de firma');
      const problema = problemaFirma(accion.nombre, accion.acepta);
      if (problema) return mal(problema);
      const original = x.c.contracts.find((y) => y.id === k.id)!;
      const texto = textoContrato(original, x.c, x.ajustes);
      const firmado = {
        status: 'firmado' as const, signedAt: x.ahora, signedBy: accion.nombre.trim().replace(/\s+/g, ' ').slice(0, 160),
        signedIp: rastro.ip.slice(0, 100), signedUserAgent: rastro.navegador.slice(0, 500), signedText: texto, documentHash: await huella(texto),
      };
      if (!(await ej.actualizar('contracts', k.id, firmado))) return mal('No se ha podido firmar. Inténtalo de nuevo.');
      const anticipo = await alFirmar({ ...original, ...firmado }, x, ej);
      return { ok: true, mensaje: anticipo ? `¡Contrato firmado! Tienes la factura del anticipo (${anticipo.number}) en tu portal.` : '¡Contrato firmado! Gracias.' };
    }
    case 'brief': {
      const p = d.briefings.find((y) => y.id === accion.id);
      if (!p) return mal('Este briefing ya no está pendiente');
      const proyecto = x.c.projects.find((y) => y.id === p.id)!;
      const answers = Object.fromEntries(
        Object.entries(accion.respuestas)
          .map(([k, v]) => [k.slice(0, 40), String(v).trim().slice(0, 2000)])
          .filter(([, v]) => v),
      );
      if (!(await ej.actualizar('projects', p.id, { brief: { ...briefDe(proyecto), status: 'completado', answers } }))) return mal('No se ha podido guardar. Inténtalo de nuevo.');
      await apunte('Ha rellenado el briefing desde su portal.', proyecto.contactId, proyecto.id);
      return { ok: true, mensaje: '¡Gracias! Hemos recibido tu briefing.' };
    }
    case 'aprobar': {
      const v = x.c.deliverables.find((y) => y.id === accion.id && d.entregables.some((e) => e.id === y.id));
      if (!v) return mal('Este entregable ya no está pendiente de revisión');
      const r = await alAprobar(v, x, ej);
      const p = x.c.projects.find((y) => y.id === v.projectId);
      await apunte(`Ha aprobado «${v.name}» desde su portal.`, p?.contactId ?? null, v.projectId);
      return { ok: true, mensaje: r === 'proyecto-entregado' ? '¡Aprobado! Con esto el proyecto queda terminado. Gracias.' : `«${v.name}» aprobado. ¡Gracias!` };
    }
    case 'cambios': {
      const v = x.c.deliverables.find((y) => y.id === accion.id && d.entregables.some((e) => e.id === y.id));
      if (!v) return mal('Este entregable ya no está pendiente de revisión');
      if (!accion.texto.trim()) return mal('Cuéntanos qué te gustaría cambiar');
      if (!(await ej.actualizar('deliverables', v.id, pedirCambios(v, accion.texto, x.hoy)))) return mal('No se ha podido enviar. Inténtalo de nuevo.');
      const p = x.c.projects.find((y) => y.id === v.projectId);
      await apunte(`Pide cambios en «${v.name}»: ${accion.texto.trim()}`, p?.contactId ?? null, v.projectId);
      return { ok: true, mensaje: 'Hemos recibido tus cambios. Te enviaremos una nueva versión.' };
    }
    case 'presupuesto': {
      const q = d.presupuestos.find((y) => y.id === accion.id);
      if (!q) return mal('Este presupuesto ya no está pendiente');
      if (!(await ej.actualizar('invoices', q.id, { status: accion.acepta ? 'aceptado' : 'rechazado' }))) return mal('No se ha podido guardar. Inténtalo de nuevo.');
      await apunte(`${accion.acepta ? 'Ha aceptado' : 'Ha rechazado'} el presupuesto ${q.number} desde su portal.`, q.contactId, q.projectId);
      const deal = x.c.deals.find((y) => y.id === q.dealId);
      if (deal && deal.stage !== 'ganado' && deal.stage !== 'perdido') {
        const r = moverOportunidad(deal, accion.acepta ? 'ganado' : 'perdido', { c: x.c, hoy: x.hoy, tarifa: x.ajustes.rate, nuevoId: x.nuevoId, ahora: x.ahora });
        if (r.proyecto) {
          await ej.crear('projects', r.proyecto.project);
          for (const t of r.proyecto.tasks) await ej.crear('tasks', t);
          for (const v of r.proyecto.deliverables) await ej.crear('deliverables', v);
          await alGanar(deal, r.proyecto.project, { ...x, c: { ...x.c, projects: [...x.c.projects, r.proyecto.project] } }, ej);
        }
        await ej.actualizar('deals', deal.id, r.cambios);
      }
      return { ok: true, mensaje: accion.acepta ? '¡Presupuesto aceptado! Nos ponemos en marcha.' : 'Gracias por responder.' };
    }
  }
}
