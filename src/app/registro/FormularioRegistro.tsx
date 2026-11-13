'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useActionState, useState } from 'react';
import { datosAsistenteDeDemo } from '@/lib/datos/almacen-demo';
import { supabaseConfigurado } from '@/lib/supabase/config';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { BotonGoogle, MarcoAcceso } from '@/components/acceso/MarcoAcceso';
import { Icono } from '@/components/ui/Icono';
import { registrar, type ResultadoRegistro } from './acciones';

const INICIAL: ResultadoRegistro = { ok: false, errores: {} };

export function FormularioRegistro() {
  const desdeDemo = useSearchParams().get('desde') === 'demo';
  const [estado, accion, enviando] = useActionState(registrar, INICIAL);
  const [abierto] = useState(() => Date.now());
  // Si viene de la demo y completó el asistente, se lleva sus respuestas (no los datos de ejemplo).
  // Este formulario solo se pinta en el navegador (está dentro de <Suspense> por useSearchParams).
  const [previos] = useState(() => {
    if (!desdeDemo || typeof window === 'undefined') return null;
    try {
      const d = datosAsistenteDeDemo(localStorage);
      // Solo el nombre que escribió en el asistente (el nombre completo de la demo es de ejemplo).
      return d ? { json: JSON.stringify(d), nombre: d.name } : null;
    } catch {
      return null;
    }
  });
  const asistente = previos?.json ?? '';
  const [nombre, setNombre] = useState(previos?.nombre ?? '');
  const [acepta, setAcepta] = useState(false);
  const [avisoGoogle, setAvisoGoogle] = useState('');

  const google = async () => {
    if (!acepta) return setAvisoGoogle('Primero marca que aceptas la política de privacidad.');
    const { error } = await supabaseNavegador().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?privacidad=1` },
    });
    if (error) setAvisoGoogle('No hemos podido conectar con Google. Inténtalo de nuevo.');
  };

  if (estado.ok)
    return (
      <MarcoAcceso>
        <section className="card acceso-tarjeta">
          <span className="tl-ic sage grande">
            <Icono n="mail" />
          </span>
          <h1>Revisa tu correo</h1>
          <p>
            Te hemos enviado un mensaje a <b>{estado.email}</b> para confirmar tu email. Mira también en la carpeta de spam.
          </p>
          <div className="warn butter">
            Después, tu cuenta quedará <b>pendiente de aprobación</b>. Cuando se apruebe, podrás entrar con tu email y tu contraseña. Mientras,
            puedes seguir probando la demostración.
          </div>
          <div className="r-actions">
            {desdeDemo && (
              <Link href="/inicio" className="btn">
                Volver a la demo
              </Link>
            )}
            <Link href="/entrar" className="btn ghost">
              Ir a Entrar
            </Link>
          </div>
        </section>
      </MarcoAcceso>
    );

  const e = estado.errores;

  return (
    <MarcoAcceso>
      <section className="card acceso-tarjeta">
        <h1>Crear usuario</h1>
        <p className="muted" style={{ margin: 0 }}>
          Con tu cuenta, tus datos se guardan de forma segura y puedes usar nebúla desde cualquier dispositivo.
          {desdeDemo && ' Empezarás con tu espacio vacío, sin los datos de ejemplo.'}
        </p>
        {!supabaseConfigurado && <div className="warn butter">El registro todavía no está conectado a la base de datos.</div>}
        {e.general && (
          <div className="warn rose" role="alert">
            {e.general}
          </div>
        )}
        <form action={accion} className="acceso-form" noValidate>
          <label className="field">
            <span>Nombre y apellidos</span>
            <input
              className="input"
              name="fullName"
              autoComplete="name"
              required
              maxLength={120}
              value={nombre}
              onChange={(ev) => setNombre(ev.target.value)}
              aria-invalid={Boolean(e.fullName)}
              aria-describedby={e.fullName ? 'err-nombre' : undefined}
            />
            {e.fullName && <small id="err-nombre" className="error">{e.fullName}</small>}
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(e.email)} aria-describedby={e.email ? 'err-email' : undefined} />
            {e.email && <small id="err-email" className="error">{e.email}</small>}
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={Boolean(e.password)}
              aria-describedby="ayuda-clave"
            />
            <small id="ayuda-clave" className={e.password ? 'error' : 'muted'}>
              {e.password ?? 'Al menos 8 caracteres.'}
            </small>
          </label>
          {/* Campo trampa contra registros automáticos: oculto para las personas. */}
          <div className="trampa" aria-hidden="true">
            <label>
              Tu web
              <input name="web" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <input type="hidden" name="t" value={abierto} />
          <input type="hidden" name="asistente" value={asistente} />
          <label className="toggle">
            <input type="checkbox" name="acepta" checked={acepta} onChange={(ev) => setAcepta(ev.target.checked)} />
            <span>
              He leído y acepto la{' '}
              <Link href="/privacidad" className="text-link" target="_blank">
                política de privacidad
              </Link>
            </span>
          </label>
          {e.acepta && <small className="error">{e.acepta}</small>}
          <button className="btn primary ancho" type="submit" disabled={enviando || !supabaseConfigurado}>
            {enviando ? 'Creando tu cuenta…' : 'Crear usuario'}
          </button>
        </form>
        <div className="separador">
          <span>o</span>
        </div>
        <BotonGoogle onClick={google} texto="Registrarme con Google" disabled={!supabaseConfigurado} />
        {avisoGoogle && <small className="error">{avisoGoogle}</small>}
        <p className="muted centrado" style={{ margin: 0 }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/entrar" className="text-link">
            Entrar
          </Link>
        </p>
      </section>
      {desdeDemo && (
        <Link href="/inicio" className="text-link centrado">
          ← Volver a la demostración
        </Link>
      )}
    </MarcoAcceso>
  );
}
