import { ICONOS, type NombreIcono } from '@/lib/catalogos/iconos';

/** Icono del prototipo. Siempre decorativo: el texto o el aria-label lo pone el botón que lo contiene. */
export function Icono({ n, className = '' }: { n: NombreIcono; className?: string }) {
  return (
    <svg
      className={`i ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONOS[n] }}
    />
  );
}
