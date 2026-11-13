'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { activarDemo } from '@/lib/demo-cookie';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { MarcoAcceso } from '@/components/acceso/MarcoAcceso';
import { Icono } from '@/components/ui/Icono';

type Estado = { status: 'pendiente' | 'aprobado' | 'rechazado'; privacidad: boolean; email: string } | null;

/** Lo que ve quien tiene cuenta pero aún no está aprobada (o fue rechazada). */
export default function Pendiente() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(null);
  const [acepta, setAcepta] = useState(false);

  useEffect(() => {
    const sb = supabaseNavegador();
    void (async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) return router.replace('/entrar');
      const { data } = await sb.from('profiles').select('status, privacy_accepted_at, email').eq('id', u.user.id).single();
      if (data?.status === 'aprobado') return router.replace('/inicio');
      setEstado({ status: data?.status ?? 'pendiente', privacidad: Boolean(data?.privacy_accepted_at), email: data?.email ?? u.user.email ?? '' });
    })();
  }, [router]);

  const salir = async () => {
    await supabaseNavegador().auth.signOut();
    router.replace('/entrar');
  };

  const aceptar = async () => {
    const { error } = await supabaseNavegador().rpc('accept_privacy');
    if (!error) setEstado((s) => (s ? { ...s, privacidad: true } : s));
  };

  return (
    <MarcoAcceso>
      <section className="card acceso-tarjeta">
        {!estado ? (
          <p className="muted">Comprobando tu cuenta…</p>
        ) : estado.status === 'rechazado' ? (
          <>
            <h1>No podemos darte acceso</h1>
            <p>
              La solicitud de <b>{estado.email}</b> no se ha aprobado. Si crees que es un error, escríbenos.
            </p>
          </>
        ) : (
          <>
            <span className="tl-ic butter grande">
              <Icono n="clock" />
            </span>
            <h1>Tu cuenta está pendiente de aprobación</h1>
            <p>
              Ya tenemos tu solicitud (<b>{estado.email}</b>). En cuanto se apruebe, podrás entrar con normalidad. Mientras, puedes seguir probando la
              demostración.
            </p>
            {!estado.privacidad && (
              <div className="warn butter acceso-form">
                <label className="toggle">
                  <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
                  <span>
                    He leído y acepto la{' '}
                    <Link href="/privacidad" className="text-link" target="_blank">
                      política de privacidad
                    </Link>
                  </span>
                </label>
                <button type="button" className="btn sm" disabled={!acepta} onClick={aceptar}>
                  Guardar
                </button>
              </div>
            )}
          </>
        )}
        <div className="r-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              activarDemo();
              router.push('/inicio');
            }}
          >
            <Icono n="eye" />
            Probar la demostración
          </button>
          <button type="button" className="btn ghost" onClick={salir}>
            <Icono n="logout" />
            Cerrar sesión
          </button>
        </div>
      </section>
    </MarcoAcceso>
  );
}
