'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Capas abiertas, de abajo arriba: solo la de arriba atiende Esc y Tab (p. ej. un formulario sobre el panel de un proyecto). */
const pila: object[] = [];

const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Capa con fondo oscurecido. Gestiona Esc, el foco dentro y su devolución al cerrar.
 * El contenido (modal, paleta, asistente…) lo pone quien la usa.
 */
export function Capa({
  children,
  alCerrar,
  cerrarConFondo = true,
  className = 'overlay',
}: {
  children: ReactNode;
  /** Si no se pasa, Esc y el fondo no cierran (p. ej. el asistente inicial). */
  alCerrar?: () => void;
  cerrarConFondo?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Se guarda en una referencia para no reiniciar el foco en cada render.
  const cerrar = useRef(alCerrar);
  useEffect(() => {
    cerrar.current = alCerrar;
  });

  useEffect(() => {
    const yo = {};
    pila.push(yo);
    const previo = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const primero = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(ENFOCABLES);
    primero?.focus();

    const tecla = (e: KeyboardEvent) => {
      if (pila[pila.length - 1] !== yo) return;
      if (e.key === 'Escape' && cerrar.current) {
        e.stopPropagation();
        cerrar.current();
      }
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll<HTMLElement>(ENFOCABLES)];
        if (!f.length) return;
        const [a, z] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', tecla, true);
    return () => {
      document.removeEventListener('keydown', tecla, true);
      pila.splice(pila.indexOf(yo), 1);
      if (previo && document.contains(previo)) previo.focus();
    };
  }, []);

  return createPortal(
    <div
      ref={ref}
      className={className}
      onMouseDown={(e) => {
        if (cerrarConFondo && alCerrar && e.target === e.currentTarget) alCerrar();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Modal con cabecera, cuerpo y pie, como en el prototipo. */
export function Modal({
  titulo,
  alCerrar,
  children,
  pie,
  ancho,
  comoFormulario,
}: {
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: number;
  comoFormulario?: (datos: FormData) => void;
}) {
  const contenido = (
    <>
      <div className="modal-h">
        <h2>{titulo}</h2>
        <button type="button" className="icon-btn" onClick={alCerrar} aria-label="Cerrar">
          <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {children}
      {pie && <div className="modal-f">{pie}</div>}
    </>
  );
  return (
    <Capa alCerrar={alCerrar}>
      {comoFormulario ? (
        <form
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          style={ancho ? { maxWidth: ancho } : undefined}
          onSubmit={(e) => {
            e.preventDefault();
            comoFormulario(new FormData(e.currentTarget));
          }}
        >
          {contenido}
        </form>
      ) : (
        <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={ancho ? { maxWidth: ancho } : undefined}>
          {contenido}
        </div>
      )}
    </Capa>
  );
}
