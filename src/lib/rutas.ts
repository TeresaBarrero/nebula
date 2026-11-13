/** Páginas que se pueden abrir sin sesión ni demo. */
const PUBLICAS = ['/entrar', '/registro', '/pendiente', '/privacidad', '/auth'];

export function esRutaPublica(ruta: string): boolean {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + '/'));
}
