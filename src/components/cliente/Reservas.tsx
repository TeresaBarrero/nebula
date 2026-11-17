'use client';

import { useState } from 'react';
import type { Fecha } from '@/lib/datos/entidades';
import { aFecha } from '@/lib/reglas/fechas';
import { Icono } from '@/components/ui/Icono';

export type EnvioReserva = { fecha: Fecha; hora: string; nombre: string; email: string; motivo: string; acepta: boolean; web: string };
const dia = (f: Fecha) => {
  const s = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(aFecha(f));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Página de reservas tal y como la ve quien reserva (SPEC §6.18). La usan la página pública y la vista previa. */
export function Reservas({
  estudio,
  duracion,
  huecos,
  alReservar,
}: {
  estudio: string;
  duracion: number;
  huecos: { fecha: Fecha; horas: string[] }[];
  alReservar: (e: EnvioReserva) => Promise<{ ok: boolean; mensaje: string }>;
}) {
  const [sel, setSel] = useState<{ fecha: Fecha; hora: string } | null>(null);
  const [v, setV] = useState({ nombre: '', email: '', motivo: '', acepta: false, web: '' });
  const [r, setR] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (r?.ok)
    return (
      <div className="warn sage" role="status">
        {r.mensaje}
      </div>
    );
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="book-h">
        <span className="avatar lg peach" aria-hidden="true">
          <Icono n="calendar" />
        </span>
        <div>
          <b>{estudio}</b>
          <div className="muted">Reunión de {duracion} minutos · videollamada o en persona</div>
        </div>
      </div>
      {sel ? (
        <form
          className="stack"
          style={{ gap: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!v.nombre.trim() || !v.email.trim()) return setR({ ok: false, mensaje: 'Rellena tu nombre y tu email.' });
            if (!v.acepta) return setR({ ok: false, mensaje: 'Hay que aceptar la protección de datos.' });
            setOcupado(true);
            const res = await alReservar({ ...sel, ...v });
            setR(res);
            setOcupado(false);
            if (!res.ok && /libre/.test(res.mensaje)) setSel(null);
          }}
        >
          <div className="warn sage">
            Has elegido el {dia(sel.fecha).toLowerCase()} a las {sel.hora}.
          </div>
          <div className="fgrid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
            <label className="field">
              <span>Tu nombre</span>
              <input className="input" required maxLength={160} autoComplete="name" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} />
            </label>
            <label className="field">
              <span>Tu email</span>
              <input className="input" type="email" required maxLength={200} autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
            </label>
            <label className="field full">
              <span>¿De qué quieres hablar?</span>
              <input className="input" maxLength={300} value={v.motivo} onChange={(e) => setV({ ...v, motivo: e.target.value })} />
            </label>
            <label style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
              Web
              <input tabIndex={-1} autoComplete="off" value={v.web} onChange={(e) => setV({ ...v, web: e.target.value })} />
            </label>
            <label className="toggle full" style={{ gridColumn: '1/-1' }}>
              <input type="checkbox" checked={v.acepta} onChange={(e) => setV({ ...v, acepta: e.target.checked })} />
              Acepto que guardéis mis datos para gestionar la reunión
            </label>
          </div>
          {r && !r.ok && (
            <p role="alert" style={{ color: 'var(--danger)', margin: 0 }}>
              {r.mensaje}
            </p>
          )}
          <div className="r-actions">
            <button type="button" className="btn ghost" onClick={() => setSel(null)}>
              <Icono n="left" />
              Cambiar hora
            </button>
            <button type="submit" className="btn primary" disabled={ocupado}>
              Confirmar reserva
            </button>
          </div>
        </form>
      ) : (
        <div className="slots">
          {huecos.map((x) => (
            <div key={x.fecha}>
              <b>{dia(x.fecha)}</b>
              {x.horas.map((h) => (
                <button type="button" key={h} className="btn sm" onClick={() => setSel({ fecha: x.fecha, hora: h })}>
                  {h}
                </button>
              ))}
              {!x.horas.length && <span className="chip">Sin huecos</span>}
            </div>
          ))}
          {!huecos.length && <p className="muted">No hay huecos libres en los próximos días.</p>}
        </div>
      )}
    </div>
  );
}
