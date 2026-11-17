'use client';

import { useEffect, useMemo, useRef } from 'react';
import { calcularAvisos, sinLeer } from '@/lib/reglas/avisos';
import { Icono } from '@/components/ui/Icono';
import { useIrA } from './acciones';
import { useDatos } from './Datos';

/** Avisos calculados a partir de los datos y cuántos quedan sin leer. */
export function useAvisos() {
  const { c, hoy } = useDatos();
  const avisos = useMemo(() => calcularAvisos(c, hoy), [c, hoy]);
  return { avisos, pendientes: sinLeer(avisos, c.notificationReads), leidos: c.notificationReads };
}

/** Panel de la campana (SPEC §7.9). */
export function Avisos({ alCerrar }: { alCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { marcarLeidos } = useDatos();
  const { avisos, pendientes, leidos } = useAvisos();
  const irA = useIrA();

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || document.getElementById('bellBtn')?.contains(t)) return;
      alCerrar();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.modal') && alCerrar();
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
        {pendientes > 0 && (
          <button type="button" className="text-link" onClick={() => void marcarLeidos(avisos.map((a) => a.clave))}>
            Marcar todo como leído
          </button>
        )}
      </div>
      <div className="notif-l">
        {avisos.map((a) => {
          const nuevo = !leidos.includes(a.clave);
          return (
            <button
              type="button"
              key={a.clave}
              className={`notif-i ${nuevo ? 'unread' : ''}`}
              aria-label={`${nuevo ? 'Sin leer: ' : ''}${a.texto}. ${a.sub}`}
              onClick={() => {
                void marcarLeidos([a.clave]);
                alCerrar();
                irA(a.destino);
              }}
            >
              <span className={`tl-ic ${a.cls}`}>
                <Icono n={a.icono} />
              </span>
              <span>
                <p>{a.texto}</p>
                {a.sub && <small>{a.sub}</small>}
              </span>
            </button>
          );
        })}
        {!avisos.length && (
          <div className="empty">
            No tienes avisos.
            <br />
            Aquí aparecerán tus tareas atrasadas, las reuniones de hoy y lo que espera respuesta.
          </div>
        )}
      </div>
    </div>
  );
}
