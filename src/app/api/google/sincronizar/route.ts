import { sincronizar } from '@/lib/servidor/google';
import { espacioDeSesion, json, servicio } from '@/lib/servidor/espacio';

/** «Sincronizar ahora» desde Perfil o el Calendario. */
export async function POST() {
  const sesion = await espacioDeSesion();
  const sb = servicio();
  if (!sesion || !sb) return json({ ok: false, error: 'Sin sesión o sin configurar' }, 401);
  return json(await sincronizar(sb, sesion.ws));
}
