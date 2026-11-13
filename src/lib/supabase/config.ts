// Claves públicas de Supabase (se pueden ver en el navegador; la seguridad la ponen las reglas RLS).
// Se leen de .env.local en tu ordenador y de las variables de entorno en Vercel.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** false mientras no se hayan copiado las claves: entonces solo funciona la demo. */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Cookie que indica que se está usando el modo demostración. */
export const COOKIE_DEMO = 'nebula_demo';
