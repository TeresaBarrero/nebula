'use client';

import type { Contexto, Correo, Ejecutor } from '@/lib/automatizaciones';
import type { CorreoEnviado, Id } from '@/lib/datos/entidades';
import { ahoraISO, nuevoId, useDatos } from './Datos';
import { useNebula } from './Nebula';

/**
 * Lo que necesitan las automatizaciones para trabajar desde la app.
 * En la demo los correos no salen: se guardan como «simulados» para que veas qué recibiría el cliente.
 */
export function useEjecutor() {
  const datos = useDatos();
  const { modo, ajustes } = useNebula();

  /** Enlace al portal de una empresa. En la demo, la vista previa; con cuenta, un enlace mágico de 30 días. */
  const enlacePortal = async (companyId: Id, contactId: Id | null): Promise<string | null> => {
    if (modo === 'demo') return `${location.origin}/empresas?id=${companyId}&portal=1`;
    try {
      const r = await fetch('/api/portal/enlace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ companyId, contactId }) });
      if (!r.ok) return null;
      return ((await r.json()) as { url: string }).url;
    } catch {
      return null;
    }
  };

  /** Envía (o simula) un correo y lo apunta en «Correos enviados». */
  const correo = async (m: Correo): Promise<CorreoEnviado | null> => {
    if (modo === 'demo') {
      const fila: CorreoEnviado = { id: nuevoId(), ...m, status: 'simulado', error: '', createdAt: ahoraISO() };
      return (await datos.crear('outgoingEmails', fila)) ? fila : null;
    }
    try {
      const r = await fetch('/api/correo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(m) });
      if (!r.ok) return null;
      const fila = (await r.json()) as CorreoEnviado;
      datos.anadirLocal('outgoingEmails', fila);
      return fila;
    } catch {
      return null;
    }
  };

  const ej: Ejecutor = {
    crear: datos.crear,
    actualizar: datos.actualizar,
    emitir: datos.emitir,
    registrar: datos.registrarEjecucion,
    correo: async (m) => {
      await correo(m);
    },
  };
  const contexto = (): Contexto => ({ c: datos.c, ajustes, hoy: datos.hoy, ahora: ahoraISO(), nuevoId, enlacePortal });
  return { ej, contexto, enlacePortal, correo, demo: modo === 'demo' };
}
