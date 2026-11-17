'use client';

import { useState } from 'react';
import { FASES_PROYECTO, FLUJO } from '@/lib/catalogos/crm';
import { preguntasBrief } from '@/lib/catalogos/trabajo';
import type { Id } from '@/lib/datos/entidades';
import { etiquetaMes, pendientesPortal, problemaFirma, type DatosPortal } from '@/lib/reglas/cliente';
import { eur, eur2 } from '@/lib/reglas/dinero';
import { fechaCorta, relativa } from '@/lib/reglas/fechas';
import { Icono } from '@/components/ui/Icono';
import { PapelContrato, PapelInforme } from './Papeles';

export type AccionesPortal = {
  firmar: (contratoId: Id, nombre: string) => Promise<string | null>;
  brief: (proyectoId: Id, respuestas: Record<string, string>) => Promise<string | null>;
  aprobar: (entregableId: Id) => Promise<string | null>;
  cambios: (entregableId: Id, texto: string) => Promise<string | null>;
  presupuesto: (id: Id, acepta: boolean) => Promise<string | null>;
  /** Devuelve la dirección de pago (o null si no hay pago online). */
  pagar?: (facturaId: Id) => Promise<string | null>;
};

type Vista = { t: 'inicio' } | { t: 'firmar'; id: Id } | { t: 'brief'; id: Id } | { t: 'informe'; id: Id };

/**
 * Portal del cliente (SPEC §6.17): pendientes, contratos para firmar, briefings, entregables para revisar,
 * presupuestos, facturas (Pagar ahora), informes y proyectos con su fase.
 * `acciones` = null → solo se mira (vista previa con cuenta real).
 */
export function PortalVista({ d, acciones, hoy, aviso }: { d: NonNullable<DatosPortal>; acciones: AccionesPortal | null; hoy: string; aviso?: (m: string) => void }) {
  const [vista, setVista] = useState<Vista>({ t: 'inicio' });
  const [ocupado, setOcupado] = useState(false);
  const [cambiosDe, setCambiosDe] = useState<Id | null>(null);
  const [texto, setTexto] = useState('');
  const pend = pendientesPortal(d);
  const decir = (m: string | null) => m && aviso?.(m);

  const hacer = async (fn: () => Promise<string | null>, volver = true) => {
    if (!acciones) return decir('En la vista previa no puedes actuar como el cliente.');
    setOcupado(true);
    decir(await fn());
    setOcupado(false);
    if (volver) setVista({ t: 'inicio' });
  };

  const atras = (
    <button type="button" className="text-link pt-back" onClick={() => setVista({ t: 'inicio' })}>
      <Icono n="left" />
      Volver
    </button>
  );

  if (vista.t === 'firmar') {
    const k = d.contratos.find((x) => x.id === vista.id);
    if (!k) return atras;
    return (
      <>
        {atras}
        <PapelContrato k={k} clausulas={k.clausulas} emisor={d.emisor} para={{ name: d.empresa.name, nif: d.empresa.nif, address: d.empresa.address }} />
        {k.status === 'enviado' && <Firmar alFirmar={(n) => hacer(() => acciones!.firmar(k.id, n))} nombre={d.persona?.name ?? ''} ocupado={ocupado} />}
      </>
    );
  }
  if (vista.t === 'brief') {
    const p = d.briefings.find((x) => x.id === vista.id);
    if (!p) return atras;
    return (
      <>
        {atras}
        <Briefing p={p} ocupado={ocupado} alEnviar={(r) => hacer(() => acciones!.brief(p.id, r))} />
      </>
    );
  }
  if (vista.t === 'informe') {
    const rp = d.informes.find((x) => x.id === vista.id);
    if (!rp) return atras;
    return (
      <>
        {atras}
        <PapelInforme rp={rp} estudio={d.estudio} cliente={d.empresa.name} colorMarca={d.empresa.color} />
      </>
    );
  }

  const sec = (titulo: string, n: number, contenido: React.ReactNode) =>
    n > 0 ? (
      <section className="pt-sec">
        <h2>
          {titulo} <span className="badge">{n}</span>
        </h2>
        {contenido}
      </section>
    ) : null;
  const firmar = d.contratos.filter((k) => k.status === 'enviado');
  const facturas = d.facturas.slice(0, 8);

  return (
    <>
      <div className="pt-hello">
        <h1>Hola{d.persona ? `, ${d.persona.name.split(' ')[0]}` : ''}</h1>
        <p>{pend ? <>Tienes <b>{pend}</b> {pend === 1 ? 'cosa pendiente' : 'cosas pendientes'} con nosotros.</> : 'Todo al día. ¡Gracias!'}</p>
      </div>
      {sec(
        'Contratos para firmar',
        firmar.length,
        firmar.map((k) => (
          <div className="pt-card row" key={k.id}>
            <span className="tl-ic butter">
              <Icono n="pen" />
            </span>
            <div>
              <b>{k.title}</b>
              <span className="muted">Enviado {relativa(k.sentAt, hoy).toLowerCase()}</span>
            </div>
            <button type="button" className="btn primary sm" onClick={() => setVista({ t: 'firmar', id: k.id })}>
              Leer y firmar
            </button>
          </div>
        )),
      )}
      {sec(
        'Briefings para rellenar',
        d.briefings.length,
        d.briefings.map((p) => (
          <div className="pt-card row" key={p.id}>
            <span className="tl-ic lilac">
              <Icono n="brief" />
            </span>
            <div>
              <b>{p.name}</b>
              <span className="muted">Unas preguntas para empezar con buen pie</span>
            </div>
            <button type="button" className="btn primary sm" onClick={() => setVista({ t: 'brief', id: p.id })}>
              Rellenar
            </button>
          </div>
        )),
      )}
      {sec(
        'Para revisar',
        d.entregables.length,
        d.entregables.map((v) => {
          const quedan = v.rondas.incluidas - v.rondas.usadas;
          return (
            <div className="pt-card" key={v.id}>
              <div className="row">
                <span className="tl-ic peach">
                  <Icono n="layers" />
                </span>
                <div>
                  <b>
                    {v.name}
                    {v.version ? ` · versión ${v.version}` : ''}
                  </b>
                  <span className="muted">
                    {v.proyecto} ·{' '}
                    {quedan > 0
                      ? `te quedan ${quedan} ${quedan === 1 ? 'ronda' : 'rondas'} de cambios incluidas`
                      : `las rondas incluidas están usadas; la siguiente cuesta ${eur(d.pago.extraRound)} + IVA`}
                  </span>
                </div>
              </div>
              <div className="pt-preview">
                <Icono n="eye" /> Te hemos enviado el archivo para revisar
              </div>
              {cambiosDe === v.id ? (
                <>
                  <textarea className="input" rows={3} value={texto} maxLength={1000} placeholder="¿Qué te gustaría cambiar?" onChange={(e) => setTexto(e.target.value)} aria-label="Cambios que pides" />
                  <div className="r-actions">
                    <button type="button" className="btn ghost sm" onClick={() => setCambiosDe(null)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={ocupado || !texto.trim()}
                      onClick={() =>
                        void hacer(async () => {
                          const r = await acciones!.cambios(v.id, texto);
                          setCambiosDe(null);
                          setTexto('');
                          return r;
                        }, false)
                      }
                    >
                      Enviar cambios
                    </button>
                  </div>
                </>
              ) : (
                <div className="r-actions">
                  <button type="button" className="btn primary sm" disabled={ocupado} onClick={() => void hacer(() => acciones!.aprobar(v.id), false)}>
                    <Icono n="tick" />
                    Aprobar
                  </button>
                  <button type="button" className="btn sm" onClick={() => setCambiosDe(v.id)}>
                    <Icono n="talk" />
                    Pedir cambios
                  </button>
                </div>
              )}
            </div>
          );
        }),
      )}
      {sec(
        'Presupuestos',
        d.presupuestos.length,
        d.presupuestos.map((q) => (
          <div className="pt-card" key={q.id}>
            <div className="row">
              <span className="tl-ic sand">
                <Icono n="receipt" />
              </span>
              <div>
                <b>
                  {q.lines[0]?.desc ?? ''}
                  {q.lines.length > 1 ? ` y ${q.lines.length - 1} más` : ''}
                </b>
                <span className="muted">
                  {q.number} · válido hasta el {fechaCorta(q.due)}
                </span>
              </div>
              <b className="num">{eur2(q.total)}</b>
            </div>
            <div className="r-actions">
              <button type="button" className="btn primary sm" disabled={ocupado} onClick={() => void hacer(() => acciones!.presupuesto(q.id, true), false)}>
                Aceptar
              </button>
              <button type="button" className="btn sm" disabled={ocupado} onClick={() => void hacer(() => acciones!.presupuesto(q.id, false), false)}>
                No, gracias
              </button>
            </div>
          </div>
        )),
      )}
      {sec(
        'Facturas',
        facturas.length,
        facturas.map((f) => {
          const fuera = f.estado === 'vencida';
          return (
            <div className="pt-card" key={f.id}>
              <div className="row">
                <span className={`tl-ic ${f.pending > 0 ? (fuera ? 'rose' : 'butter') : 'sage'}`}>
                  <Icono n="euro" />
                </span>
                <div>
                  <b>
                    {f.number} · {f.lines[0]?.desc ?? ''}
                  </b>
                  <span className="muted">{f.pending > 0 ? (fuera ? `Venció el ${fechaCorta(f.due)}` : `Vence el ${fechaCorta(f.due)}`) : 'Pagada. ¡Gracias!'}</span>
                </div>
                <b className="num">{eur2(f.pending > 0 ? f.pending : f.total)}</b>
              </div>
              {f.pending > 0 && (
                <div className="pay-opts">
                  {acciones?.pagar && (
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={ocupado}
                      onClick={async () => {
                        setOcupado(true);
                        const url = await acciones.pagar!(f.id);
                        setOcupado(false);
                        if (url) location.href = url;
                      }}
                    >
                      <Icono n="card" />
                      Pagar con tarjeta
                    </button>
                  )}
                  {d.pago.iban && <span className="chip">{acciones?.pagar ? 'o ' : ''}transferencia a {d.pago.iban} (indica el número de factura)</span>}
                </div>
              )}
            </div>
          );
        }),
      )}
      {sec(
        'Informes',
        d.informes.length,
        d.informes.map((r) => (
          <div className="pt-card row" key={r.id}>
            <span className="tl-ic lilac">
              <Icono n="chart" />
            </span>
            <div>
              <b>Informe de {etiquetaMes(r.month)}</b>
              <span className="muted">{r.iguala?.name}</span>
            </div>
            <button type="button" className="btn sm" onClick={() => setVista({ t: 'informe', id: r.id })}>
              Ver
            </button>
          </div>
        )),
      )}
      {sec(
        'Tus proyectos',
        d.proyectos.length,
        d.proyectos.map((p) => {
          const idx = FLUJO.indexOf(p.status);
          return (
            <div className="pt-card" key={p.id}>
              <div className="row">
                <span className="tl-ic sage">
                  <Icono n="folder" />
                </span>
                <div>
                  <b>{p.name}</b>
                  <span className="muted">
                    Ahora: {FASES_PROYECTO[p.status].label} · entrega prevista {fechaCorta(p.end)}
                  </span>
                </div>
              </div>
              <div className="stepper" aria-label={`Fase: ${FASES_PROYECTO[p.status].label}`}>
                {FLUJO.map((k, i) => (
                  <span key={k} className={idx >= 0 && i <= idx ? 'on' : ''} />
                ))}
              </div>
            </div>
          );
        }),
      )}
    </>
  );
}

function Firmar({ alFirmar, nombre, ocupado }: { alFirmar: (nombre: string) => void; nombre: string; ocupado: boolean }) {
  const [n, setN] = useState('');
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="pt-card">
      <h3>Firmar el contrato</h3>
      <div className="fgrid" style={{ gridTemplateColumns: '1fr' }}>
        <label className="field">
          <span>Escribe tu nombre completo como firma</span>
          <input className="input sig-in" value={n} maxLength={160} placeholder={nombre} onChange={(e) => setN(e.target.value)} autoComplete="name" />
        </label>
        <label className="toggle">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          He leído el contrato y acepto sus condiciones
        </label>
      </div>
      {error && (
        <p className="muted" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      <p className="muted" style={{ fontSize: 12 }}>
        Al firmar se guardan la fecha, tu dirección IP, tu navegador y una huella del documento, como prueba de la firma.
      </p>
      <button
        type="button"
        className="btn primary"
        disabled={ocupado}
        style={{ marginTop: 12 }}
        onClick={() => {
          const p = problemaFirma(n, ok);
          setError(p);
          if (!p) alFirmar(n.trim().replace(/\s+/g, ' '));
        }}
      >
        <Icono n="pen" />
        Firmar
      </button>
    </section>
  );
}

function Briefing({ p, ocupado, alEnviar }: { p: NonNullable<DatosPortal>['briefings'][number]; ocupado: boolean; alEnviar: (r: Record<string, string>) => void }) {
  const [r, setR] = useState<Record<string, string>>(() => ({ ...p.answers }));
  return (
    <section className="pt-card">
      <h3>Briefing · {p.name}</h3>
      <p className="muted">Cuanto más nos cuentes, mejor saldrá. Deja en blanco lo que no sepas.</p>
      <div className="fgrid" style={{ gridTemplateColumns: '1fr' }}>
        {preguntasBrief(p.discipline).map(([k, q]) => (
          <label className="field" key={k}>
            <span>{q}</span>
            <textarea className="input" rows={2} maxLength={2000} value={r[k] ?? ''} onChange={(e) => setR((x) => ({ ...x, [k]: e.target.value }))} />
          </label>
        ))}
      </div>
      <button type="button" className="btn primary" disabled={ocupado} style={{ marginTop: 12 }} onClick={() => alEnviar(r)}>
        Enviar briefing
      </button>
    </section>
  );
}
