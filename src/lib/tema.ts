import type { Tema } from '@/lib/datos/tipos';

/** Aplica el tema y lo recuerda en este navegador (lo lee el script de layout.tsx antes de pintar). */
export function aplicarTema(t: Tema): void {
  const d = document.documentElement;
  if (t === 'system') d.removeAttribute('data-theme');
  else d.setAttribute('data-theme', t);
  try {
    if (t === 'system') localStorage.removeItem('nebula-tema');
    else localStorage.setItem('nebula-tema', t);
  } catch {}
}

export function aplicarCompacto(on: boolean): void {
  const d = document.documentElement;
  if (on) d.setAttribute('data-compact', '1');
  else d.removeAttribute('data-compact');
  try {
    if (on) localStorage.setItem('nebula-compacto', '1');
    else localStorage.removeItem('nebula-compacto');
  } catch {}
}

/** ¿Se está viendo en oscuro ahora mismo? */
export function esOscuro(t: Tema): boolean {
  return t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
}
