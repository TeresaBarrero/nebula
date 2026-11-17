/** Páginas que se pueden abrir sin sesión ni demo. */
// Portal del cliente, reservas y formulario web son para tus clientes; las rutas /api comprueban sus permisos dentro.
const PUBLICAS = ['/entrar', '/registro', '/pendiente', '/privacidad', '/auth', '/portal', '/reservar', '/formulario', '/api'];

export function esRutaPublica(ruta: string): boolean {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + '/'));
}
