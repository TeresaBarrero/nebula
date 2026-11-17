import { googleConfigurado, urlAutorizacion } from '@/lib/servidor/google';
import { espacioDeSesion, origenDe } from '@/lib/servidor/espacio';

/** Lleva a Google para dar permiso al calendario. */
export async function GET(req: Request) {
  const origen = origenDe(req);
  const sesion = await espacioDeSesion();
  if (!sesion) return Response.redirect(`${origen}/entrar`, 303);
  if (!googleConfigurado()) return Response.redirect(`${origen}/perfil?google=sin-configurar`, 303);
  return Response.redirect(urlAutorizacion(origen, sesion.ws), 303);
}
