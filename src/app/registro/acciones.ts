'use server';

import { headers } from 'next/headers';
import { limpiarDatosAsistente } from '@/lib/datos/asistente';
import { validarRegistro, type ErroresRegistro } from '@/lib/reglas/registro';
import { supabaseConfigurado } from '@/lib/supabase/config';
import { supabaseServidor } from '@/lib/supabase/servidor';

export type ResultadoRegistro = { ok: boolean; errores: ErroresRegistro; email?: string };

/** Crea la cuenta en Supabase. Queda pendiente de confirmar el email y de tu aprobación. */
export async function registrar(_previo: ResultadoRegistro, f: FormData): Promise<ResultadoRegistro> {
  if (!supabaseConfigurado) return { ok: false, errores: { general: 'El registro todavía no está disponible.' } };

  const datos = {
    fullName: String(f.get('fullName') ?? '').trim(),
    email: String(f.get('email') ?? '').trim().toLowerCase(),
    password: String(f.get('password') ?? ''),
    acepta: f.get('acepta') === 'on',
    trampa: String(f.get('web') ?? ''),
    tiempo: Date.now() - Number(f.get('t') ?? Date.now()),
  };
  const errores = validarRegistro(datos);
  if (Object.keys(errores).length) return { ok: false, errores };

  let asistente = null;
  try {
    asistente = limpiarDatosAsistente(JSON.parse(String(f.get('asistente') || 'null')));
  } catch {}

  const h = await headers();
  const origen = process.env.NEXT_PUBLIC_SITE_URL || h.get('origin') || `https://${h.get('host')}`;

  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signUp({
    email: datos.email,
    password: datos.password,
    options: {
      emailRedirectTo: `${origen}/auth/callback?confirmado=1`,
      data: { full_name: datos.fullName, acepta_privacidad: true, ...(asistente ? { asistente } : {}) },
    },
  });

  if (error) {
    const msg = /rate|too many/i.test(error.message)
      ? 'Se han hecho demasiados intentos. Espera unos minutos y vuelve a probar.'
      : /password/i.test(error.message)
        ? 'Esa contraseña no es válida: prueba con una más larga o menos común.'
        : 'No hemos podido crear tu cuenta. Inténtalo de nuevo en un rato.';
    return { ok: false, errores: { general: msg } };
  }
  // Por seguridad, Supabase responde igual si el email ya existía: no decimos si hay cuenta o no.
  return { ok: true, errores: {}, email: datos.email };
}
