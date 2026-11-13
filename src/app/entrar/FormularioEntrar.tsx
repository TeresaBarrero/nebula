'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { activarDemo, salirDeDemo } from '@/lib/demo-cookie';
import { supabaseConfigurado } from '@/lib/supabase/config';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { BotonGoogle, MarcoAcceso } from '@/components/acceso/MarcoAcceso';
import { Icono } from '@/components/ui/Icono';

const AVISOS: Record<string, [string, string]> = {
  confirmado: ['sage', 'Tu email está confirmado. Ya puedes entrar con tu contraseña.'],
  enlace: ['rose', 'Ese enlace ya se ha usado o ha caducado. Entra con tu contraseña o pide uno nuevo.'],
  google: ['rose', 'No hemos podido entrar con Google. Inténtalo de nuevo.'],
};

export function FormularioEntrar() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<[string, string] | null>(AVISOS[params.get('aviso') ?? ''] ?? null);

  const origen = () => window.location.origin;

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: email.trim(), password: clave });
    setOcupado(false);
    if (error) {
      setMensaje([
        'rose',
        /confirm/i.test(error.message)
          ? 'Aún no has confirmado tu email. Busca en tu correo el mensaje de nebúla (mira también en spam).'
          : 'El email o la contraseña no son correctos.',
      ]);
      return;
    }
    salirDeDemo();
    router.replace('/inicio');
    router.refresh();
  };

  const enlace = async () => {
    if (!email.trim()) return setMensaje(['butter', 'Escribe tu email y te enviamos un enlace para entrar sin contraseña.']);
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${origen()}/auth/callback` },
    });
    setOcupado(false);
    setMensaje(
      error && /rate|seconds/i.test(error.message)
        ? ['rose', 'Has pedido varios enlaces seguidos. Espera un minuto y vuelve a probar.']
        : ['sage', `Si ${email.trim()} tiene cuenta, te llegará un enlace para entrar. Mira también en spam.`],
    );
  };

  const google = async () => {
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origen()}/auth/callback` },
    });
    if (error) {
      setOcupado(false);
      setMensaje(AVISOS.google);
    }
  };

  const demo = () => {
    activarDemo();
    router.push('/inicio');
  };

  return (
    <MarcoAcceso>
      <section className="card acceso-tarjeta">
        <h1>Entrar</h1>
        {mensaje && (
          <div className={`warn ${mensaje[0]}`} role="status">
            {mensaje[1]}
          </div>
        )}
        {supabaseConfigurado ? (
          <>
            <form onSubmit={entrar} className="acceso-form">
              <label className="field">
                <span>Email</span>
                <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="field">
                <span>Contraseña</span>
                <input className="input" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
              </label>
              <button className="btn primary ancho" type="submit" disabled={ocupado || !clave}>
                Entrar
              </button>
              <button type="button" className="text-link centrado" onClick={enlace} disabled={ocupado}>
                Prefiero que me envíes un enlace por email
              </button>
            </form>
            <div className="separador">
              <span>o</span>
            </div>
            <BotonGoogle onClick={google} texto="Entrar con Google" disabled={ocupado} />
            <p className="muted centrado" style={{ margin: 0 }}>
              ¿Aún no tienes cuenta?{' '}
              <Link href="/registro" className="text-link">
                Crear usuario
              </Link>
            </p>
          </>
        ) : (
          <div className="warn butter">
            El acceso con cuenta todavía no está conectado a la base de datos. Mientras, puedes probar la demostración.
          </div>
        )}
      </section>

      <button type="button" className="card acceso-demo" onClick={demo}>
        <span className="tl-ic butter">
          <Icono n="eye" />
        </span>
        <span style={{ flex: 1, textAlign: 'left' }}>
          <b>Probar la demostración</b>
          <span className="muted">Sin registrarte, con datos de ejemplo. Tus cambios se guardan solo en este navegador.</span>
        </span>
        <Icono n="right" />
      </button>
    </MarcoAcceso>
  );
}
