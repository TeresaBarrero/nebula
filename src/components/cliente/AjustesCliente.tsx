'use client';

import { useState } from 'react';
import { alLlegarLead } from '@/lib/automatizaciones';
import { esDisciplina } from '@/lib/catalogos/disciplinas';
import { huecosReserva, slugDe } from '@/lib/reglas/cliente';
import { relativa } from '@/lib/reglas/fechas';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { useEjecutor } from '@/components/app/ejecutor';
import { useNebula } from '@/components/app/Nebula';
import { useCopiar } from '@/components/crm/comunes';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';
import { FormularioWeb } from './FormularioWeb';
import { Reservas } from './Reservas';

/** Perfil → «Para tus clientes»: nombre público, cobros online, página de reservas, formulario web y correos enviados. */
export function AjustesCliente() {
  const { ajustes, guardarAjustes } = useNebula();
  const { c, hoy } = useDatos();
  const toast = useToast();
  const copiar = useCopiar();
  const ejecutor = useEjecutor();
  const [slug, setSlug] = useState(ajustes.publicSlug || slugDe(ajustes.business || ajustes.legalName || 'mi-estudio'));
  const [probar, setProbar] = useState<'reservas' | 'formulario' | null>(null);
  const origen = typeof location === 'undefined' ? '' : location.origin;
  const b = ajustes.booking;
  const hayNombre = Boolean(ajustes.publicSlug);
  const guardar = async (o: Parameters<typeof guardarAjustes>[0], ok: string) => {
    if (await guardarAjustes(o)) toast(ok);
  };
  const codigo = `<iframe src="${origen}/formulario/${ajustes.publicSlug}" style="width:100%;min-height:640px;border:0" title="Formulario de contacto"></iframe>`;
  const ultimos = [...c.outgoingEmails].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 8);

  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="link" />
          Para tus clientes
        </h2>
      </div>
      <div className="pref" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <b>Tu nombre público</b>
          <span>Se usa en las direcciones de tu página de reservas y de tu formulario.</span>
        </div>
        <form
          style={{ display: 'flex', gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            const s = slugDe(slug);
            setSlug(s);
            void guardar({ publicSlug: s }, 'Nombre público guardado');
          }}
        >
          <input className="input" style={{ width: 190 }} value={slug} maxLength={40} aria-label="Nombre público" onChange={(e) => setSlug(e.target.value)} />
          <button type="submit" className="btn sm">
            Guardar
          </button>
        </form>
      </div>
      <div className="pref">
        <div>
          <b>Cobro con tarjeta en el portal</b>
          <span>«Pagar ahora» con Stripe. Mientras esté en modo pruebas, nadie paga de verdad.</span>
        </div>
        <button
          type="button"
          className={`switch ${ajustes.payOnline.card ? 'on' : ''}`}
          role="switch"
          aria-checked={ajustes.payOnline.card}
          aria-label="Cobro con tarjeta"
          onClick={() => void guardar({ payOnline: { ...ajustes.payOnline, card: !ajustes.payOnline.card } }, 'Cobro con tarjeta actualizado')}
        />
      </div>
      <div className="pref" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <b>Página de reservas</b>
          <span>{hayNombre ? `${origen}/reservar/${ajustes.publicSlug}` : 'Primero guarda tu nombre público.'}</span>
        </div>
        <button
          type="button"
          className={`switch ${b.on ? 'on' : ''}`}
          role="switch"
          aria-checked={b.on}
          aria-label="Página de reservas"
          disabled={!hayNombre}
          onClick={() => void guardar({ booking: { ...b, on: !b.on } }, b.on ? 'Página de reservas desactivada' : 'Página de reservas activada')}
        />
      </div>
      {b.on && hayNombre && (
        <div className="r-actions" style={{ margin: '4px 0 12px' }}>
          <label className="field" style={{ minWidth: 120 }}>
            <span>Duración</span>
            <select className="input" value={b.duration} onChange={(e) => void guardar({ booking: { ...b, duration: Number(e.target.value) } }, 'Duración guardada')}>
              {[15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} minutos
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Desde</span>
            <input className="input" type="time" value={b.from} onChange={(e) => e.target.value && void guardar({ booking: { ...b, from: e.target.value } }, 'Horario guardado')} />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input className="input" type="time" value={b.to} onChange={(e) => e.target.value && void guardar({ booking: { ...b, to: e.target.value } }, 'Horario guardado')} />
          </label>
          <button type="button" className="btn sm" onClick={() => copiar(`${origen}/reservar/${ajustes.publicSlug}`)}>
            <Icono n="copy" />
            Copiar enlace
          </button>
          <button type="button" className="btn sm" onClick={() => (ejecutor.demo ? setProbar('reservas') : window.open(`/reservar/${ajustes.publicSlug}`, '_blank'))}>
            <Icono n="eye" />
            Probarla
          </button>
        </div>
      )}
      <div className="pref" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <b>Formulario para tu web</b>
          <span>Cada mensaje llega a Oportunidades con su contacto (y la tarea de llamar en 24 h).</span>
        </div>
        <button
          type="button"
          className={`switch ${ajustes.leadFormOn ? 'on' : ''}`}
          role="switch"
          aria-checked={ajustes.leadFormOn}
          aria-label="Formulario para tu web"
          disabled={!hayNombre}
          onClick={() => void guardar({ leadFormOn: !ajustes.leadFormOn }, ajustes.leadFormOn ? 'Formulario desactivado' : 'Formulario activado')}
        />
      </div>
      {ajustes.leadFormOn && hayNombre && (
        <div className="stack" style={{ gap: 8, margin: '4px 0 12px' }}>
          <p className="muted" style={{ margin: 0 }}>
            Copia este código y pégalo en tu web (WordPress, Webflow, Wix…) donde quieras que salga el formulario:
          </p>
          <textarea className="input" readOnly rows={3} value={codigo} aria-label="Código para tu web" style={{ fontFamily: 'monospace', fontSize: 12 }} />
          <div className="r-actions">
            <button type="button" className="btn sm" onClick={() => copiar(codigo)}>
              <Icono n="copy" />
              Copiar código
            </button>
            <button type="button" className="btn sm" onClick={() => (ejecutor.demo ? setProbar('formulario') : window.open(`/formulario/${ajustes.publicSlug}`, '_blank'))}>
              <Icono n="eye" />
              Probarlo
            </button>
          </div>
        </div>
      )}
      <div className="sec-lbl">Últimos correos a tus clientes</div>
      <div className="list">
        {ultimos.map((m) => (
          <details key={m.id} className="follow" style={{ display: 'block' }}>
            <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`pill ${m.status === 'enviado' ? 'sage' : m.status === 'error' ? 'rose' : 'mist'}`}>{m.status === 'enviado' ? 'Enviado' : m.status === 'error' ? 'Error' : 'Simulado'}</span>
              <b style={{ flex: 1, minWidth: 0 }}>{m.subject}</b>
              <span className="chip">
                {m.to} · {relativa(m.createdAt.slice(0, 10), hoy)}
              </span>
            </summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, margin: '8px 0 0' }}>{m.body}</pre>
            {m.error && <p className="muted">{m.error}</p>}
          </details>
        ))}
        {!ultimos.length && <div className="empty">Aún no has enviado correos desde nebúla.</div>}
      </div>
      <p className="foot-note">«Simulado» = el correo no ha salido porque aún no está configurado el servicio de correo (o estás en la demo).</p>
      {probar === 'reservas' && <ProbarReservas alCerrar={() => setProbar(null)} />}
      {probar === 'formulario' && <ProbarFormulario alCerrar={() => setProbar(null)} />}
    </section>
  );
}

/** En la demo: la página de reservas, creando la reunión en tu calendario de ejemplo. */
function ProbarReservas({ alCerrar }: { alCerrar: () => void }) {
  const { c, hoy, crear } = useDatos();
  const { ajustes } = useNebula();
  return (
    <Modal titulo="Así ve un cliente tu página de reservas" alCerrar={alCerrar} ancho={640}>
      <div className="modal-b block">
        <Reservas
          estudio={ajustes.business || ajustes.legalName}
          duracion={ajustes.booking.duration}
          huecos={huecosReserva(ajustes.booking, c.events, hoy)}
          alReservar={async (e) => {
            const ok = await crear('events', { id: nuevoId(), title: `Reserva: ${e.nombre}${e.motivo ? ` · ${e.motivo}` : ''}`.slice(0, 200), date: e.fecha, time: e.hora, contactId: null, projectId: null, source: 'reserva', createdAt: ahoraISO() });
            return ok ? { ok: true, mensaje: 'Reserva hecha: ya está en tu calendario con la etiqueta «Reservada desde tu enlace».' } : { ok: false, mensaje: 'No se ha podido reservar' };
          }}
        />
      </div>
    </Modal>
  );
}

/** En la demo: el formulario web, que crea contacto, oportunidad y tarea en tus datos de ejemplo. */
function ProbarFormulario({ alCerrar }: { alCerrar: () => void }) {
  const { ajustes } = useNebula();
  const ejecutor = useEjecutor();
  return (
    <Modal titulo="Pruébalo como si fueras un visitante de tu web" alCerrar={alCerrar} ancho={680}>
      <div className="modal-b block">
        <FormularioWeb
          disciplinas={ajustes.disciplines.length ? ajustes.disciplines : ['grafico']}
          alEnviar={async (e) => {
            const id = await alLlegarLead(
              { nombre: e.nombre, email: e.email, empresa: e.empresa, telefono: e.telefono, mensaje: e.mensaje, presupuesto: e.presupuesto, disciplina: esDisciplina(e.disciplina) ? e.disciplina : 'grafico' },
              ejecutor.contexto(),
              ejecutor.ej,
            );
            return id ? { ok: true, mensaje: 'Ya lo tienes en Oportunidades (con «Desde tu web») y en Contactos.' } : { ok: false, mensaje: 'No se ha podido enviar' };
          }}
        />
      </div>
    </Modal>
  );
}
