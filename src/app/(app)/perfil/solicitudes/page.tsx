'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Database } from '@/lib/supabase/tipos-bd';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { useNebula } from '@/components/app/Nebula';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

type Cuenta = Omit<Database['public']['Functions']['admin_list_accounts']['Returns'][number], 'status'> & {
  status: 'pendiente' | 'aprobado' | 'rechazado';
};

const ESTADO = {
  pendiente: { label: 'Pendiente', cls: 'butter' },
  aprobado: { label: 'Aprobada', cls: 'sage' },
  rechazado: { label: 'Rechazada', cls: 'rose' },
} as const;

const fecha = (s: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s));

/** Solo para quien administra nebúla: aprobar o rechazar a quien se registra. */
export default function Solicitudes() {
  const { esAdmin } = useNebula();
  const toast = useToast();
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  // Al subirla se vuelve a pedir la lista.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!esAdmin) return;
    supabaseNavegador()
      .rpc('admin_list_accounts')
      .then(({ data, error }) => {
        if (error) toast('No se han podido cargar las solicitudes');
        setCuentas((data ?? []) as Cuenta[]);
      });
  }, [esAdmin, toast, version]);
  const cargar = () => setVersion((v) => v + 1);

  const cambiar = async (c: Cuenta, estado: 'aprobado' | 'rechazado') => {
    setOcupado(c.id);
    const { error } = await supabaseNavegador().rpc('admin_set_status', { target: c.id, new_status: estado });
    setOcupado(null);
    if (error) return toast('No se ha podido cambiar. Inténtalo de nuevo.');
    toast(estado === 'aprobado' ? `${c.full_name || c.email} ya puede usar nebúla` : 'Solicitud rechazada');
    cargar();
  };

  if (!esAdmin)
    return (
      <>
        <Cabecera antetitulo="Cuenta" titulo="Solicitudes de acceso" />
        <section className="card">
          <div className="empty">Esta página solo la ve quien administra nebúla.</div>
        </section>
      </>
    );

  const orden = (cuentas ?? []).slice().sort((x, y) => Number(y.status === 'pendiente') - Number(x.status === 'pendiente'));

  return (
    <>
      <Cabecera
        antetitulo="Cuenta"
        titulo="Solicitudes de acceso"
        acciones={
          <Link href="/perfil" className="btn ghost">
            <Icono n="left" />
            Volver al perfil
          </Link>
        }
      >
        Quien se registra no puede usar nebúla hasta que lo apruebas. Al aprobarlo se crea su espacio de trabajo vacío.
      </Cabecera>
      <section className="card">
        {cuentas === null ? (
          <div className="empty">Cargando…</div>
        ) : !orden.length ? (
          <div className="empty">Todavía no se ha registrado nadie.</div>
        ) : (
          <div className="list">
            {orden.map((c) => (
              <div className="follow solicitud" key={c.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{c.full_name || 'Sin nombre'}</b>
                  <div className="tags" style={{ marginTop: 4 }}>
                    <span className="chip">{c.email}</span>
                    <span className="chip">Se registró el {fecha(c.created_at)}</span>
                    {!c.email_confirmed_at && <span className="chip late">Aún no ha confirmado su email</span>}
                    {!c.privacy_accepted_at && <span className="chip late">No ha aceptado la política de privacidad</span>}
                  </div>
                </div>
                <span className={`pill ${ESTADO[c.status].cls}`}>{ESTADO[c.status].label}</span>
                <div className="r-actions">
                  {c.status !== 'aprobado' && (
                    <button type="button" className="btn sm primary" disabled={ocupado === c.id} onClick={() => cambiar(c, 'aprobado')}>
                      <Icono n="tick" />
                      Aprobar
                    </button>
                  )}
                  {c.status === 'pendiente' && (
                    <button type="button" className="btn sm" disabled={ocupado === c.id} onClick={() => cambiar(c, 'rechazado')}>
                      Rechazar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
