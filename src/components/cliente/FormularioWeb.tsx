'use client';

import { useState } from 'react';
import { TRAMOS_PRESUPUESTO } from '@/lib/catalogos/cliente';
import { DISCIPLINAS, type Disciplina } from '@/lib/catalogos/disciplinas';

export type EnvioLead = { nombre: string; email: string; empresa: string; telefono: string; disciplina: string; presupuesto: number; mensaje: string; acepta: boolean; web: string; t: number };

/**
 * El formulario que ve un visitante de tu web (SPEC §6.21). Se usa en la página pública (/formulario/…)
 * y en la vista previa de la app. `web` es un campo trampa oculto para robots.
 */
export function FormularioWeb({ disciplinas, alEnviar }: { disciplinas: Disciplina[]; alEnviar: (e: EnvioLead) => Promise<{ ok: boolean; mensaje: string }> }) {
  const [inicio] = useState(() => Date.now());
  const [v, setV] = useState({ nombre: '', email: '', empresa: '', telefono: '', disciplina: disciplinas[0] ?? 'grafico', presupuesto: TRAMOS_PRESUPUESTO[1][0], mensaje: '', acepta: false, web: '' });
  const [r, setR] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const cambia = (o: Partial<typeof v>) => setV((x) => ({ ...x, ...o }));
  if (r?.ok)
    return (
      <div className="lead-form" role="status">
        <h3>¡Mensaje enviado!</h3>
        <p>{r.mensaje}</p>
      </div>
    );
  return (
    <form
      className="lead-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.nombre.trim() || !v.email.trim()) return setR({ ok: false, mensaje: 'Rellena tu nombre y tu email.' });
        if (!v.acepta) return setR({ ok: false, mensaje: 'Hay que aceptar la protección de datos.' });
        setOcupado(true);
        setR(await alEnviar({ ...v, t: inicio }));
        setOcupado(false);
      }}
    >
      <h3>¿Hablamos de tu proyecto?</h3>
      <div className="fgrid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <label className="field">
          <span>Nombre</span>
          <input className="input" required maxLength={160} autoComplete="name" value={v.nombre} onChange={(e) => cambia({ nombre: e.target.value })} />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" required maxLength={200} autoComplete="email" value={v.email} onChange={(e) => cambia({ email: e.target.value })} />
        </label>
        <label className="field">
          <span>Empresa (opcional)</span>
          <input className="input" maxLength={200} autoComplete="organization" value={v.empresa} onChange={(e) => cambia({ empresa: e.target.value })} />
        </label>
        <label className="field">
          <span>Teléfono (opcional)</span>
          <input className="input" type="tel" maxLength={40} autoComplete="tel" value={v.telefono} onChange={(e) => cambia({ telefono: e.target.value })} />
        </label>
        <label className="field">
          <span>¿Qué necesitas?</span>
          <select className="input" value={v.disciplina} onChange={(e) => cambia({ disciplina: e.target.value as Disciplina })}>
            {disciplinas.map((k) => (
              <option key={k} value={k}>
                {DISCIPLINAS[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Presupuesto aproximado</span>
          <select className="input" value={v.presupuesto} onChange={(e) => cambia({ presupuesto: Number(e.target.value) })}>
            {TRAMOS_PRESUPUESTO.map(([n, l]) => (
              <option key={n} value={n}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field full">
          <span>Cuéntame un poco más</span>
          <textarea className="input" rows={3} maxLength={3000} value={v.mensaje} onChange={(e) => cambia({ mensaje: e.target.value })} />
        </label>
        <label style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
          Web
          <input tabIndex={-1} autoComplete="off" value={v.web} onChange={(e) => cambia({ web: e.target.value })} />
        </label>
        <label className="toggle full" style={{ gridColumn: '1/-1' }}>
          <input type="checkbox" checked={v.acepta} onChange={(e) => cambia({ acepta: e.target.checked })} />
          Acepto que guardéis mis datos para responderme
        </label>
      </div>
      {r && !r.ok && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          {r.mensaje}
        </p>
      )}
      <button className="btn primary" type="submit" disabled={ocupado}>
        Enviar mensaje
      </button>
    </form>
  );
}
