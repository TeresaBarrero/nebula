'use client';

import { useEffect, useRef } from 'react';
import type { NombreIcono } from '@/lib/catalogos/iconos';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';
import { useFormularios } from './formularios/Formulario';
import type { TipoForm } from './formularios/definiciones';
import { useDinero } from '@/components/dinero/Dinero';

// Mismo orden y colores que el menú «+» del prototipo, con la fase en que cada cosa se podrá crear.
const OPCIONES: [string, NombreIcono, string, number, TipoForm?][] = [
  ['Nota', 'note', 'butter', 1, 'note'],
  ['Gasto', 'wallet', 'peach', 2, 'expense'],
  ['Factura', 'receipt', 'sand', 2],
  ['Proyecto', 'folder', 'butter', 1, 'project'],
  ['Oportunidad', 'funnel', 'lilac', 1, 'deal'],
  ['Contacto', 'users', 'sage', 1, 'contact'],
  ['Apuntar horas', 'timer', 'sage', 3, 'time'],
  ['Publicación', 'megaphone', 'rose', 3, 'post'],
  ['Reunión', 'calendar', 'lilac', 1, 'event'],
  ['Tarea', 'check', 'peach', 1, 'task'],
];

/** Botón flotante «+» para crear cualquier cosa (SPEC §3). */
export function BotonCrear({ abierto, setAbierto }: { abierto: boolean; setAbierto: (v: boolean) => void }) {
  const toast = useToast();
  const abrir = useFormularios();
  const dinero = useDinero();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto, setAbierto]);

  return (
    <div className={`fab ${abierto ? 'open' : ''}`} ref={ref}>
      {abierto && (
        <div className="fab-menu" role="menu">
          {OPCIONES.map(([label, icono, color, fase, tipo], i) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              style={{ animationDelay: `${(OPCIONES.length - 1 - i) * 18}ms` }}
              onClick={() => {
                setAbierto(false);
                if (tipo) abrir(tipo);
                else if (label === 'Factura') dinero.nueva('factura');
                else toast(`Crear ${label.toLowerCase()} llega en la Fase ${fase}`);
              }}
            >
              <span className={`ic ${color}`}>
                <Icono n={icono} />
              </span>
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="fab-btn"
        onClick={() => setAbierto(!abierto)}
        aria-label={abierto ? 'Cerrar el menú de crear' : 'Crear'}
        aria-expanded={abierto}
      >
        <Icono n="plus" />
      </button>
    </div>
  );
}
