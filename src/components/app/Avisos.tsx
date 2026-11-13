'use client';

import { useEffect, useRef } from 'react';

/** Panel de la campana (SPEC §7.9). Los avisos se calculan a partir de los datos desde la Fase 1. */
export function Avisos({ alCerrar }: { alCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || document.getElementById('bellBtn')?.contains(t)) return;
      alCerrar();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    ref.current?.focus();
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [alCerrar]);

  return (
    <div className="notif" ref={ref} role="dialog" aria-label="Avisos" tabIndex={-1}>
      <div className="notif-h">
        <b>Avisos</b>
      </div>
      <div className="notif-l">
        <div className="empty">
          No tienes avisos.
          <br />
          Aquí aparecerán tus tareas atrasadas, reuniones de hoy, facturas fuera de plazo y más.
        </div>
      </div>
    </div>
  );
}
