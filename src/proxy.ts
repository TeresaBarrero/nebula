import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_DEMO, SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from '@/lib/supabase/config';
import { esRutaPublica } from '@/lib/rutas';

/**
 * Se ejecuta antes de cada página:
 * 1. Renueva la sesión de Supabase si ha caducado (y la guarda en cookies).
 * 2. Si no hay sesión ni modo demostración, manda a «Entrar».
 * Es solo una comprobación rápida: la seguridad de verdad está en la base de datos (RLS).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let conSesion = false;

  if (supabaseConfigurado) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista, cabeceras) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(cabeceras ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    conSesion = Boolean(data?.claims?.sub);
  }

  const enDemo = request.cookies.get(COOKIE_DEMO)?.value === '1';
  const ruta = request.nextUrl.pathname;

  const redirigir = (destino: string) => {
    const r = NextResponse.redirect(new URL(destino, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (ruta === '/') return redirigir(conSesion || enDemo ? '/inicio' : '/entrar');
  if (!esRutaPublica(ruta) && !conSesion && !enDemo) return redirigir('/entrar');
  if (ruta === '/pendiente' && !conSesion) return redirigir('/entrar');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icono|apple-icon|manifest.webmanifest|sw.js|.*\\.(?:png|svg|jpg|jpeg|webp|ico|txt)$).*)'],
};
