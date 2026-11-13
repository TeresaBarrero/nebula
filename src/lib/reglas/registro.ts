export type DatosRegistro = {
  fullName: string;
  email: string;
  password: string;
  acepta: boolean;
  /** Campo trampa: las personas no lo ven; si viene relleno es un programa de spam. */
  trampa: string;
  /** Milisegundos desde que se abrió el formulario. */
  tiempo: number;
};

export type ErroresRegistro = Partial<Record<'fullName' | 'email' | 'password' | 'acepta' | 'general', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Comprueba el formulario de registro. Devuelve los errores en lenguaje llano (vacío = todo bien). */
export function validarRegistro(d: DatosRegistro): ErroresRegistro {
  const e: ErroresRegistro = {};
  if (d.trampa || d.tiempo < 2000) {
    e.general = 'No hemos podido completar el registro. Espera unos segundos y vuelve a intentarlo.';
    return e;
  }
  if (d.fullName.trim().length < 2) e.fullName = 'Escribe tu nombre.';
  if (d.fullName.length > 120) e.fullName = 'El nombre es demasiado largo.';
  if (!EMAIL.test(d.email.trim())) e.email = 'Revisa el email: parece que no está bien escrito.';
  if (d.password.length < 8) e.password = 'La contraseña tiene que tener al menos 8 caracteres.';
  if (d.password.length > 72) e.password = 'La contraseña no puede tener más de 72 caracteres.';
  if (!d.acepta) e.acepta = 'Para crear tu cuenta tienes que aceptar la política de privacidad.';
  return e;
}
