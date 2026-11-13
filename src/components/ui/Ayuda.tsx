import { AYUDA, type ClaveAyuda } from '@/lib/catalogos/ayuda';

/**
 * Ayuda «?»: burbuja al pasar el ratón o al enfocar (también con el dedo). SPEC §9.3.
 * Usa los textos de HELP (`k`) o un texto propio (`texto`).
 */
export function Ayuda(props: { k: ClaveAyuda } | { texto: string }) {
  const t = 'k' in props ? AYUDA[props.k] : props.texto;
  return (
    <span className="help" tabIndex={0} role="note" aria-label={t}>
      ?<span className="tip">{t}</span>
    </span>
  );
}
