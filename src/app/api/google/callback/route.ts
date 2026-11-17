import { canjearCodigo, leerEstado, sincronizar } from '@/lib/servidor/google';
import { espacioDeSesion, origenDe, servicio } from '@/lib/servidor/espacio';

/** Google vuelve aquí con el permiso: se guarda cifrado y se hace la primera sincronización. */
export async function GET(req: Request) {
  const origen = origenDe(req);
  const u = new URL(req.url);
  const ws = leerEstado(u.searchParams.get('state') ?? '');
  const sesion = await espacioDeSesion();
  const sb = servicio();
  if (!ws || !sesion || sesion.ws !== ws || !sb || u.searchParams.get('error')) return Response.redirect(`${origen}/perfil?google=error`, 303);
  const r = await canjearCodigo(u.searchParams.get('code') ?? '', origen);
  if (!r) return Response.redirect(`${origen}/perfil?google=error`, 303);
  const { error } = await sb.rpc('guardar_integracion', { p_ws: ws, p_provider: 'gcal', p_email: r.email, p_token: r.refresh });
  if (error) return Response.redirect(`${origen}/perfil?google=error`, 303);
  await sincronizar(sb, ws);
  return Response.redirect(`${origen}/perfil?google=ok`, 303);
}
