'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { DEDICACIONES, FORMAS_TRABAJO, type ErroresInteres } from '@/lib/reglas/interesados';
import { MarcoAcceso } from '@/components/acceso/MarcoAcceso';
import { Icono } from '@/components/ui/Icono';

/** «Me interesa»: mientras nebúla es una demo, quien quiera usarla se apunta aquí. */
export function FormularioInteres() {
  const desdeDemo = useSearchParams().get('desde') === 'demo';
  const [abierto] = useState(() => Date.now());
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [e, setErrores] = useState<ErroresInteres>({});
  const [acepta, setAcepta] = useState(false);

  const enviar = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    setEnviando(true);
    const r = (await fetch('/api/interesados', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: f.get('name'),
        email: f.get('email'),
        discipline: f.get('discipline'),
        kind: f.get('kind'),
        comment: f.get('comment'),
        acepta,
        trampa: f.get('web'),
        tiempo: Date.now() - abierto,
      }),
    })
      .then((x) => x.json())
      .catch(() => null)) as { ok: boolean; errores?: ErroresInteres } | null;
    setEnviando(false);
    if (r?.ok) return setListo(true);
    setErrores(r?.errores ?? { general: 'No hemos podido guardar tus datos. Revisa tu conexión e inténtalo de nuevo.' });
  };

  if (listo)
    return (
      <MarcoAcceso>
        <section className="card acceso-tarjeta">
          <span className="tl-ic sage grande">
            <Icono n="tick" />
          </span>
          <h1>¡Apuntado!</h1>
          <p>Gracias por tu interés. Cuando nebúla esté lista para usarse de verdad, te escribiremos a tu email.</p>
          <div className="r-actions">
            <Link href={desdeDemo ? '/inicio' : '/entrar'} className="btn primary">
              {desdeDemo ? 'Volver a la demo' : 'Probar la demostración'}
            </Link>
          </div>
        </section>
      </MarcoAcceso>
    );

  return (
    <MarcoAcceso>
      <section className="card acceso-tarjeta">
        <h1>Me interesa nebúla</h1>
        <p className="muted" style={{ margin: 0 }}>
          nebúla está en fase de demostración. Si te gustaría usarla para tu trabajo, déjanos tus datos y te avisaremos cuando esté disponible.
        </p>
        {e.general && (
          <div className="warn rose" role="alert">
            {e.general}
          </div>
        )}
        <form onSubmit={enviar} className="acceso-form" noValidate>
          <label className="field">
            <span>Nombre</span>
            <input className="input" name="name" autoComplete="name" required maxLength={120} aria-invalid={Boolean(e.name)} aria-describedby={e.name ? 'err-nombre' : undefined} />
            {e.name && <small id="err-nombre" className="error">{e.name}</small>}
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" autoComplete="email" required maxLength={200} aria-invalid={Boolean(e.email)} aria-describedby={e.email ? 'err-email' : undefined} />
            {e.email && <small id="err-email" className="error">{e.email}</small>}
          </label>
          <label className="field">
            <span>¿A qué te dedicas?</span>
            <select className="input" name="discipline" defaultValue="">
              <option value="">Prefiero no decirlo</option>
              {DEDICACIONES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>¿Cómo trabajas?</span>
            <select className="input" name="kind" defaultValue="">
              <option value="">Prefiero no decirlo</option>
              {FORMAS_TRABAJO.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>¿Qué te gustaría que hiciera nebúla por ti? (opcional)</span>
            <textarea className="input" name="comment" rows={3} maxLength={1000} />
          </label>
          {/* Campo trampa contra envíos automáticos: oculto para las personas. */}
          <div className="trampa" aria-hidden="true">
            <label>
              Tu web
              <input name="web" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={acepta} onChange={(ev) => setAcepta(ev.target.checked)} />
            <span>
              He leído y acepto la{' '}
              <Link href="/privacidad" className="text-link" target="_blank">
                política de privacidad
              </Link>
            </span>
          </label>
          {e.acepta && <small className="error">{e.acepta}</small>}
          <button className="btn primary ancho" type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Apuntarme'}
          </button>
        </form>
      </section>
      <Link href={desdeDemo ? '/inicio' : '/entrar'} className="text-link centrado">
        ← {desdeDemo ? 'Volver a la demostración' : 'Volver'}
      </Link>
    </MarcoAcceso>
  );
}
