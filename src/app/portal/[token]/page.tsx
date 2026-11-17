'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import type { Id } from '@/lib/datos/entidades';
import type { DatosPortal } from '@/lib/reglas/cliente';
import { PortalVista, type AccionesPortal } from '@/components/cliente/PortalVista';
import { ProveedorToasts, useToast } from '@/components/ui/Toasts';

type Respuesta = { d: NonNullable<DatosPortal>; hoy: string; pagoOnline: boolean; pagado: boolean };

export default function Pagina() {
  return (
    <ProveedorToasts>
      <Suspense>
        <Portal />
      </Suspense>
    </ProveedorToasts>
  );
}

/** Portal del cliente (SPEC §6.17): se entra con el enlace mágico, sin contraseña. */
function Portal() {
  const { token } = useParams<{ token: string }>();
  const toast = useToast();
  const [r, setR] = useState<Respuesta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${token}${location.search}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) return setError(j.error ?? 'No se ha podido abrir tu portal');
      setR(j);
      if (j.pagado) toast('¡Gracias! Hemos recibido tu pago. Puede tardar unos segundos en aparecer.');
    } catch {
      setError('No se ha podido abrir tu portal. Revisa tu conexión.');
    }
  }, [token, toast]);
  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const enviar = async (cuerpo: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/portal/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const j = (await res.json()) as { ok: boolean; mensaje: string; url?: string };
      await cargar();
      return j;
    } catch {
      return { ok: false, mensaje: 'No se ha podido enviar. Revisa tu conexión.' };
    }
  };
  const acciones: AccionesPortal = {
    firmar: async (id: Id, nombre: string) => (await enviar({ tipo: 'firmar', id, nombre, acepta: true })).mensaje,
    brief: async (id, respuestas) => (await enviar({ tipo: 'brief', id, respuestas })).mensaje,
    aprobar: async (id) => (await enviar({ tipo: 'aprobar', id })).mensaje,
    cambios: async (id, texto) => (await enviar({ tipo: 'cambios', id, texto })).mensaje,
    presupuesto: async (id, acepta) => (await enviar({ tipo: 'presupuesto', id, acepta })).mensaje,
    ...(r?.pagoOnline
      ? {
          pagar: async (id: Id) => {
            const j = await enviar({ tipo: 'pagar', id });
            if (!j.url) toast(j.mensaje);
            return j.url ?? null;
          },
        }
      : {}),
  };

  return (
    <div className="portal" style={{ position: 'static', minHeight: '100dvh' }}>
      <div className="pt-wrap">
        <header className="pt-head">
          <span className="logo" style={{ fontSize: 30 }}>
            nebúla
          </span>
          {r && (
            <span className="muted">
              {r.d.estudio} · portal de {r.d.empresa.name}
            </span>
          )}
        </header>
        {error ? (
          <section className="pt-card">
            <h3>No podemos abrir tu portal</h3>
            <p className="muted">{error}</p>
            <Link className="btn primary" href="/portal/acceso">
              Pedir un enlace nuevo
            </Link>
          </section>
        ) : r ? (
          <PortalVista d={r.d} acciones={acciones} hoy={r.hoy} aviso={toast} />
        ) : (
          <p className="muted" aria-busy="true">
            Cargando tu portal…
          </p>
        )}
      </div>
    </div>
  );
}
