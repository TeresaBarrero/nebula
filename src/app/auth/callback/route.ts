import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_DEMO, supabaseConfigurado } from '@/lib/supabase/config';
import { supabaseServidor } from '@/lib/supabase/servidor';

/**
 * Vuelta desde los enlaces de email (confirmar cuenta, entrar sin contraseña) y desde Google.
 * Crea la sesión y lleva a Inicio (o a «pendiente», si la cuenta aún no está aprobada).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const ir = (ruta: string) => {
    const r = NextResponse.redirect(new URL(ruta, url.origin));
    r.cookies.set(COOKIE_DEMO, '', { path: '/', maxAge: 0 });
    return r;
  };
  if (!supabaseConfigurado) return ir('/entrar');

  const supabase = await supabaseServidor();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const tipo = url.searchParams.get('type') as EmailOtpType | null;

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && tipo) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;

  if (!ok) {
    // Si el enlace de confirmación se abre en otro navegador, el email queda confirmado igualmente,
    // pero no se puede iniciar sesión aquí: se pide entrar con la contraseña.
    if (url.searchParams.get('confirmado')) return ir('/entrar?aviso=confirmado');
    return ir(url.searchParams.get('error') ? '/entrar?aviso=google' : '/entrar?aviso=enlace');
  }

  if (url.searchParams.get('privacidad') === '1') await supabase.rpc('accept_privacy');
  return ir('/inicio');
}
