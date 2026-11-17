'use client';

import Link from 'next/link';
import type { Reunion } from '@/lib/datos/entidades';
import { aFecha, diasHasta, relativa } from '@/lib/reglas/fechas';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Icono } from '@/components/ui/Icono';

/** Reunión con su fecha en un cuadradito (eventRow del prototipo). */
export function FilaReunion({ e }: { e: Reunion }) {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const contacto = c.contacts.find((x) => x.id === e.contactId);
  const d = aFecha(e.date);
  return (
    <div className="ev">
      <div className={`ev-date ${diasHasta(e.date, hoy) === 0 ? 'peach' : 'mist'}`} aria-hidden="true">
        <b>{d.getDate()}</b>
        <span>{new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d).replace('.', '')}</span>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <button type="button" className="task-t" style={{ fontWeight: 600 }} onClick={() => abrir('event', { id: e.id })}>
          {e.title}
        </button>
        {e.source === 'google' && (
          <span className="pill sage" style={{ margin: '2px 0' }}>
            <Icono n="calendar" />
            De Google Calendar
          </span>
        )}
        {e.source === 'reserva' && (
          <span className="pill lilac" style={{ margin: '2px 0' }}>
            <Icono n="link" />
            Reservada desde tu enlace
          </span>
        )}
        <span className="chip">
          <Icono n="clock" />
          {relativa(e.date, hoy)} · {e.time || 'Todo el día'}
          {contacto && (
            <>
              {' · '}
              <Link className="text-link" href={`/contactos?id=${contacto.id}`}>
                {contacto.name}
              </Link>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
