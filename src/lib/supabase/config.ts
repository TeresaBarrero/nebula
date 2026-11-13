// Claves PÚBLICAS de Supabase: están hechas para verse en el navegador (la seguridad la ponen las reglas RLS).
// Si existen variables de entorno (.env.local o Vercel), mandan ellas; si no, se usa el proyecto de nebúla.
// La clave SECRETA (sb_secret_…) nunca va aquí: solo en .env.local, para scripts y pruebas.
const URL_PROYECTO = 'https://avyczuogqeylcodwmpsm.supabase.co';
const CLAVE_PUBLICA_PROYECTO = 'sb_publishable_ilEd0O7CD6w_L3JO25xGyQ_9Z7toII8';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || URL_PROYECTO;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || CLAVE_PUBLICA_PROYECTO;

/** false si faltan las claves: entonces solo funciona la demo. */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Cookie que indica que se está usando el modo demostración. */
export const COOKIE_DEMO = 'nebula_demo';
