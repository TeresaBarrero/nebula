/**
 * Lista de interesados: mientras nebúla sea una demo de portfolio, quien quiera usarla deja aquí sus datos.
 * Cuando se abra al público, se vuelve a activar el registro (REGISTRO_ABIERTO en src/lib/lanzamiento.ts).
 */

export const DEDICACIONES = ['Diseño gráfico', 'Diseño web', 'Marketing', 'Comunicación', 'Varias cosas', 'Otra'] as const;
export const FORMAS_TRABAJO = ['Autónomo/a', 'Agencia o estudio pequeño', 'Otra'] as const;

export type DatosInteres = {
  name: string;
  email: string;
  discipline: string;
  kind: string;
  comment: string;
  acepta: boolean;
  /** Campo trampa: las personas no lo ven; si viene relleno es un programa de spam. */
  trampa: string;
  /** Milisegundos desde que se abrió el formulario. */
  tiempo: number;
};

export type ErroresInteres = Partial<Record<'name' | 'email' | 'acepta' | 'general', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Comprueba el formulario «Me interesa». Devuelve los errores en lenguaje llano (vacío = todo bien). */
export function validarInteres(d: DatosInteres): ErroresInteres {
  const e: ErroresInteres = {};
  if (d.trampa || d.tiempo < 2000) {
    e.general = 'No hemos podido guardar tus datos. Espera unos segundos y vuelve a intentarlo.';
    return e;
  }
  const nombre = d.name.trim();
  if (nombre.length < 2) e.name = 'Escribe tu nombre.';
  if (nombre.length > 120) e.name = 'El nombre es demasiado largo.';
  const email = d.email.trim();
  if (!EMAIL.test(email) || email.length > 200) e.email = 'Revisa el email: parece que no está bien escrito.';
  if (!d.acepta) e.acepta = 'Para apuntarte tienes que aceptar la política de privacidad.';
  return e;
}

/** Datos limpios para guardar: recorta, pasa el email a minúsculas y descarta opciones que no existen. */
export function limpiarInteres(d: DatosInteres) {
  return {
    name: d.name.trim().slice(0, 120),
    email: d.email.trim().toLowerCase().slice(0, 200),
    discipline: (DEDICACIONES as readonly string[]).includes(d.discipline) ? d.discipline : '',
    kind: (FORMAS_TRABAJO as readonly string[]).includes(d.kind) ? d.kind : '',
    comment: d.comment.trim().slice(0, 1000),
  };
}

/** Correo que te llega a ti cuando alguien se apunta. */
export function avisoInteres(i: ReturnType<typeof limpiarInteres>): { subject: string; body: string } {
  const lineas = [
    `${i.name} quiere usar nebúla.`,
    '',
    `Email: ${i.email}`,
    i.discipline ? `Se dedica a: ${i.discipline}` : null,
    i.kind ? `Trabaja como: ${i.kind}` : null,
    i.comment ? `\nLo que le gustaría:\n${i.comment}` : null,
    '',
    'Tienes la lista completa en nebúla → Perfil → Interesados.',
  ].filter((l): l is string => l !== null);
  return { subject: `Nueva persona interesada en nebúla: ${i.name}`, body: lineas.join('\n') };
}
