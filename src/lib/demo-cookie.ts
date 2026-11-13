import { COOKIE_DEMO } from '@/lib/supabase/config';

/** ¿Está activo el modo demostración en este navegador? */
export function enDemo(): boolean {
  return typeof document !== 'undefined' && document.cookie.split('; ').includes(`${COOKIE_DEMO}=1`);
}

export function activarDemo(): void {
  document.cookie = `${COOKIE_DEMO}=1; path=/; max-age=31536000; SameSite=Lax`;
}

export function salirDeDemo(): void {
  document.cookie = `${COOKIE_DEMO}=; path=/; max-age=0; SameSite=Lax`;
}
