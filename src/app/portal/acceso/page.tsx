'use client';

import { useState } from 'react';

/** Pedir un enlace nuevo al portal: llega al email del contacto. */
export default function Acceso() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  return (
    <div className="portal" style={{ position: 'static', minHeight: '100dvh' }}>
      <div className="pt-wrap">
        <header className="pt-head">
          <span className="logo" style={{ fontSize: 30 }}>
            nebúla
          </span>
          <span className="muted">Portal del cliente</span>
        </header>
        <form
          className="pt-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setOcupado(true);
            const r = await fetch('/api/portal/acceso', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null);
            const j = r ? await r.json().catch(() => null) : null;
            setMensaje(j?.mensaje ?? 'No se ha podido enviar. Inténtalo de nuevo.');
            setOcupado(false);
          }}
        >
          <h3>Entra en tu portal</h3>
          <p className="muted">Escribe tu email y te enviaremos un enlace para entrar, sin contraseña.</p>
          <label className="field">
            <span>Tu email</span>
            <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" className="btn primary" disabled={ocupado} style={{ marginTop: 12 }}>
            Enviarme el enlace
          </button>
          {mensaje && (
            <p className="muted" role="status" style={{ marginTop: 12 }}>
              {mensaje}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
