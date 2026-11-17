'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DISPONIBILIDAD, ESTADOS_ENTREGABLE, FASES_PROYECTO, FLUJO, PRIORIDADES } from '@/lib/catalogos/crm';
import { ESTADOS_BRIEF, preguntasBrief } from '@/lib/catalogos/trabajo';
import { briefDe, duracion, historiaEntregable, horas, horasProyecto, portfolioDe, rondasDe, versionesDe } from '@/lib/reglas/trabajo';
import { useNebula } from '@/components/app/Nebula';
import { useTrabajo } from '@/components/trabajo/Trabajo';
import { PLANTILLAS } from '@/lib/catalogos/plantillas';
import type { Entregable, Proyecto } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { diasHasta, fechaCorta, relativa } from '@/lib/reglas/fechas';
import { empresaDe } from '@/lib/reglas/historial';
import { dineroProyecto } from '@/lib/reglas/facturas';
import { faseAlReanudar, progreso } from '@/lib/reglas/proyectos';
import { CajaFacturas, CajaGastos } from '@/components/dinero/Listas';
import { porFecha } from '@/lib/reglas/tareas';
import { tareaNueva, useAccionesCrm } from '@/components/app/acciones';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Ayuda } from '@/components/ui/Ayuda';
import { Icono } from '@/components/ui/Icono';
import { Capa } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';
import { Avatar, CajaDocumentos, FilaTarea, Pill, PillDisciplina } from './comunes';
import { SeccionHistorial } from './Historial';

/** Panel del proyecto: cajón lateral con fases, cifras, entregables, tareas, equipo, documentos e historial (SPEC §6.6). */
export function PanelProyecto({ p, alCerrar }: { p: Proyecto; alCerrar: () => void }) {
  const { c } = useDatos();
  const abrir = useFormularios();
  const { cambiarFase } = useAccionesCrm();
  const contacto = c.contacts.find((x) => x.id === p.contactId);
  const oportunidad = c.deals.find((d) => d.projectId === p.id);
  const idx = FLUJO.indexOf(p.status);
  const g = progreso(c.tasks, p.id);
  const pausa = p.status === 'pausa';
  const m = dineroProyecto(c, p.id);
  const hp = horasProyecto(c, p);
  const { ajustes } = useNebula();

  return (
    <Capa alCerrar={alCerrar} className="overlay drawer-ov">
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={p.name}>
        <div className="drawer-h">
          <div>
            <div className="tags" style={{ marginBottom: 8 }}>
              <PillDisciplina d={p.discipline} />
              <Pill cls={FASES_PROYECTO[p.status].cls}>{FASES_PROYECTO[p.status].label}</Pill>
              <Pill cls={PRIORIDADES[p.priority].cls}>Prioridad {PRIORIDADES[p.priority].label.toLowerCase()}</Pill>
            </div>
            <h2>{p.name}</h2>
            {contacto && (
              <Link className="chip link" href={`/contactos?id=${contacto.id}`} style={{ marginTop: 6 }}>
                <Icono n="user" />
                {contacto.name}
                {empresaDe(c, contacto) ? ` · ${empresaDe(c, contacto)}` : ''}
              </Link>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="icon-btn" onClick={() => abrir('project', { id: p.id })} aria-label="Editar proyecto" title="Editar">
              <Icono n="edit" />
            </button>
            <button type="button" className="icon-btn" onClick={alCerrar} aria-label="Cerrar" data-autofocus>
              <Icono n="x" />
            </button>
          </div>
        </div>
        <div className="drawer-b">
          {p.description && <p style={{ margin: 0 }}>{p.description}</p>}
          {oportunidad && (
            <button type="button" className="chip link" style={{ alignSelf: 'flex-start' }} onClick={() => abrir('deal', { id: oportunidad.id })}>
              <Icono n="funnel" />
              Viene de la oportunidad «{oportunidad.title}»
            </button>
          )}

          <div>
            <div className="sec-lbl">¿En qué fase está? Pulsa para cambiarla</div>
            <div className="phases">
              {FLUJO.map((k, i) => (
                <button
                  type="button"
                  key={k}
                  className={pausa ? '' : i < idx ? 'done' : i === idx ? 'cur' : ''}
                  aria-pressed={p.status === k}
                  onClick={() => void cambiarFase(p, k)}
                >
                  {FASES_PROYECTO[k].label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="text-link"
              style={{ marginTop: 8, display: 'inline-flex', gap: 6, alignItems: 'center' }}
              onClick={() => void cambiarFase(p, pausa ? faseAlReanudar(p) : 'pausa')}
            >
              <Icono n={pausa ? 'play' : 'stop'} />
              {pausa ? 'Reanudar el proyecto' : 'Poner en pausa'}
            </button>
          </div>

          <dl className="kv">
            <div>
              <dt>Empieza</dt>
              <dd>{fechaCorta(p.start)}</dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd>{fechaCorta(p.end)}</dd>
            </div>
            <div>
              <dt>Presupuesto</dt>
              <dd className="num">{eur(p.budget)}</dd>
            </div>
            <div>
              <dt>Facturado</dt>
              <dd className="num">{eur(m.facturado)}</dd>
            </div>
            <div>
              <dt>Gastos</dt>
              <dd className="num">{eur(m.gastos)}</dd>
            </div>
            <div>
              <dt>
                Te queda <Ayuda k="margen" />
              </dt>
              <dd className="num" style={{ color: m.margen < 0 ? 'var(--danger)' : 'var(--ok)' }}>
                {eur(m.margen)}
              </dd>
            </div>
            <div>
              <dt>Horas</dt>
              <dd className="num" style={{ color: hp.sePasa ? 'var(--danger)' : 'inherit' }}>
                {horas(hp.min)} de {p.hoursBudget || '—'} h
              </dd>
            </div>
            <div>
              <dt>
                € por hora <Ayuda k="eurh" />
              </dt>
              <dd className="num" style={{ color: hp.eurh && hp.eurh < ajustes.rate ? 'var(--danger)' : 'inherit' }}>
                {hp.eurh ? eur(hp.eurh) : '—'}
              </dd>
            </div>
            <div>
              <dt>Tareas</dt>
              <dd className="num">
                {g.hechas} de {g.total}
              </dd>
            </div>
          </dl>

          <SeccionBrief p={p} />
          <Entregables p={p} />
          <TareasProyecto p={p} />
          <HorasProyecto p={p} />
          <Equipo p={p} />
          <CajaFacturas facturas={c.invoices.filter((f) => f.projectId === p.id)} nueva={{ projectId: p.id, contactId: p.contactId, companyId: contacto?.companyId ?? null }} />
          <CajaGastos gastos={c.expenses.filter((x) => x.projectId === p.id)} nuevo={{ projectId: p.id }} />
          <CajaDocumentos docs={c.files.filter((d) => d.projectId === p.id)} vinculo={{ projectId: p.id, contactId: p.contactId, companyId: contacto?.companyId ?? null }} />
          {p.status === 'entregado' && <SeccionPortfolio p={p} />}
          <SeccionHistorial filtro={{ projectId: p.id }} limite={10} registrar={{ contactId: p.contactId, projectId: p.id }} />
          <p className="foot-note" style={{ marginTop: 0 }}>
            El contrato del proyecto y el portal del cliente llegan en la Fase 4.
          </p>
        </div>
      </aside>
    </Capa>
  );
}

function SeccionBrief({ p }: { p: Proyecto }) {
  const { hoy } = useDatos();
  const t = useTrabajo();
  const b = briefDe(p);
  const qs = preguntasBrief(p.discipline);
  const rellenas = qs.filter(([k]) => b.answers[k]);
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="brief" />
          Briefing
        </h2>
        <Pill cls={ESTADOS_BRIEF[b.status].cls}>{ESTADOS_BRIEF[b.status].label}</Pill>
      </div>
      {b.status === 'completado' && rellenas.length ? (
        <>
          <dl className="info" style={{ gridTemplateColumns: '1fr', marginTop: 0, paddingTop: 0, border: 0 }}>
            {rellenas.slice(0, 3).map(([k, q]) => (
              <div key={k}>
                <dt>{q}</dt>
                <dd>{b.answers[k]}</dd>
              </div>
            ))}
          </dl>
          <div className="r-actions">
            <button type="button" className="btn sm" onClick={() => t.abrirBrief(p)}>
              <Icono n="eye" />
              Ver brief completo ({rellenas.length}/{qs.length})
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: '0 0 10px' }}>
            {b.status === 'enviado'
              ? `Se lo enviaste al cliente ${relativa(b.sentDate, hoy).toLowerCase()}. Puedes rellenarlo tú si te lo cuenta en una reunión.`
              : 'Las preguntas clave antes de empezar: objetivo, público, tono, referencias, entregables…'}
          </p>
          <div className="r-actions">
            <button type="button" className="btn sm primary" onClick={() => t.abrirBrief(p)}>
              <Icono n="edit" />
              Rellenar briefing
            </button>
            {b.status !== 'enviado' && (
              <button type="button" className="btn sm" onClick={() => void t.enviarBrief(p)}>
                <Icono n="send" />
                Enviárselo al cliente
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Entregables({ p }: { p: Proyecto }) {
  const { c, crear } = useDatos();
  const [nombre, setNombre] = useState('');
  const lista = c.deliverables.filter((d) => d.projectId === p.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const anadir = async () => {
    const n = nombre.trim().slice(0, 200);
    if (!n) return;
    const ok = await crear('deliverables', {
      id: nuevoId(), projectId: p.id, name: n, status: 'en_curso', sentAt: null, approvedAt: null, billedExtra: 0, versions: [], feedback: [], createdAt: ahoraISO(),
    });
    if (ok) setNombre('');
  };

  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="layers" />
          Entregables y revisiones <Ayuda k="rondas" />
        </h2>
        <span className="chip">{p.roundsIncluded} rondas incluidas</span>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {lista.map((d) => (
          <BloqueEntregable key={d.id} d={d} p={p} />
        ))}
        {!lista.length && <div className="empty">Añade lo que vas a entregar: wireframes, logotipo, piezas…</div>}
      </div>
      <form
        className="inline-add"
        onSubmit={(e) => {
          e.preventDefault();
          void anadir();
        }}
      >
        <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nuevo entregable y pulsa Intro" aria-label="Nuevo entregable" maxLength={200} />
        <button type="submit" className="btn" aria-label="Añadir entregable">
          <Icono n="plus" />
        </button>
      </form>
    </section>
  );
}

/** Un entregable con su versión, rondas usadas/incluidas y acciones (dlvBlock del prototipo, SPEC §7.7). */
function BloqueEntregable({ d, p }: { d: Entregable; p: Proyecto }) {
  const { hoy, borrar } = useDatos();
  const t = useTrabajo();
  const r = rondasDe(d, p);
  const v = versionesDe(d).length;
  const hist = historiaEntregable(d, p);
  const espera = d.status === 'enviado' && d.sentAt ? -diasHasta(d.sentAt, hoy) : 0;
  return (
    <div className="dlv">
      <div className="dlv-h">
        <b>{d.name}</b>
        <Pill cls={ESTADOS_ENTREGABLE[d.status].cls}>{ESTADOS_ENTREGABLE[d.status].label}</Pill>
      </div>
      <div className="dlv-m">
        <span className="chip">{v ? `Versión ${v}` : 'Aún sin enviar'}</span>
        <span className={`chip num ${r.extra ? 'late' : ''}`}>
          Rondas de cambios: {r.usadas} de {r.incluidas}
        </span>
        {r.extra > 0 && <Pill cls="rose">{r.extra === 1 ? '1 ronda extra' : `${r.extra} rondas extra`}</Pill>}
        {espera >= 5 && <span className="chip late">Lleva {espera} días sin respuesta</span>}
      </div>
      <div className="r-actions">
        {d.status !== 'aprobado' && d.status !== 'enviado' && (
          <button type="button" className="btn sm" onClick={() => void t.enviarVersion(d)}>
            <Icono n="send" />
            Enviar versión {v + 1}
          </button>
        )}
        {d.status === 'enviado' && (
          <>
            <button type="button" className="btn sm" onClick={() => t.pedirCambios(d)}>
              <Icono n="talk" />
              Pide cambios
            </button>
            <button type="button" className="btn sm" onClick={() => void t.aprobar(d)}>
              <Icono n="tick" />
              Lo aprueba
            </button>
          </>
        )}
        {r.porCobrar > 0 && (
          <button type="button" className="btn sm primary" onClick={() => void t.cobrarRondas(d)}>
            <Icono n="euro" />
            Cobrar {r.porCobrar === 1 ? '1 ronda extra' : `${r.porCobrar} rondas extra`}
          </button>
        )}
        <button type="button" className="icon-btn" aria-label={`Eliminar ${d.name}`} title="Eliminar" onClick={() => void borrar('deliverables', d.id, 'Entregable eliminado')}>
          <Icono n="trash" />
        </button>
      </div>
      {hist.length > 0 && (
        <details className="vers">
          <summary>Ver historial</summary>
          {hist.map((h, i) => (
            <div className="ver" key={i}>
              <span className="sdot" style={{ background: `var(--${h.cls}-ink)` }} />
              <span>{h.texto}</span>
              <span className="chip">{relativa(h.fecha, hoy)}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

function HorasProyecto({ p }: { p: Proyecto }) {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const t = useTrabajo();
  const h = horasProyecto(c, p);
  const entradas = c.timeEntries.filter((e) => e.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="timer" />
          Horas
        </h2>
        <span className={`chip num ${h.sePasa ? 'late' : ''}`}>
          {horas(h.min)} de {p.hoursBudget || '—'} h previstas
        </span>
      </div>
      <div className="progress" style={{ marginBottom: 10 }}>
        <i style={{ width: `${Math.min(100, h.pct)}%`, background: h.sePasa ? 'var(--danger)' : 'var(--sage-strong)' }} />
      </div>
      {h.sePasa && (
        <div className="warn rose" style={{ marginBottom: 10 }}>
          Has pasado de las horas previstas. Si el cliente ha pedido cosas nuevas, puedes presupuestarlas aparte.
        </div>
      )}
      <div className="list">
        {entradas.slice(0, 4).map((e) => (
          <button type="button" key={e.id} className="follow fila-boton" onClick={() => abrir('time', { id: e.id })}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{e.note || 'Trabajo'}</b>
              <div className="chip">{relativa(e.date, hoy)}</div>
            </div>
            <b className="num">{duracion(e.minutes)}</b>
          </button>
        ))}
      </div>
      <div className="r-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn sm primary" onClick={() => void t.iniciar({ projectId: p.id })}>
          <Icono n="play" />
          Cronometrar
        </button>
        <button type="button" className="btn sm" onClick={() => abrir('time', { projectId: p.id })}>
          <Icono n="plus" />
          Apuntar horas
        </button>
      </div>
    </section>
  );
}

function SeccionPortfolio({ p }: { p: Proyecto }) {
  const abrir = useFormularios();
  const pf = portfolioDe(p);
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="star" />
          Portfolio
        </h2>
      </div>
      {pf.featured ? (
        <>
          <p style={{ margin: '0 0 8px' }}>{pf.summary}</p>
          <Pill cls={pf.permission ? 'sage' : 'rose'}>{pf.permission ? 'Permiso del cliente' : 'Falta el permiso del cliente'}</Pill>
        </>
      ) : (
        <p className="muted" style={{ margin: '0 0 8px' }}>
          ¿Ha quedado bien? Conviértelo en un caso de éxito para enseñarlo.
        </p>
      )}
      <div className="r-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn sm" onClick={() => abrir('case', { id: p.id })}>
          <Icono n="star" />
          {pf.featured ? 'Editar caso' : 'Crear caso de éxito'}
        </button>
      </div>
    </section>
  );
}

function TareasProyecto({ p }: { p: Proyecto }) {
  const { c, crear } = useDatos();
  const toast = useToast();
  const { ponerPlantilla } = useAccionesCrm();
  const [titulo, setTitulo] = useState('');
  const [plantilla, setPlantilla] = useState<string>(p.discipline && p.discipline in PLANTILLAS ? p.discipline : '');
  const tareas = c.tasks.filter((t) => t.projectId === p.id).sort(porFecha);
  const g = progreso(c.tasks, p.id);

  const anadir = async () => {
    const t = titulo.trim().slice(0, 300);
    if (!t) return;
    if (await crear('tasks', tareaNueva({ title: t, projectId: p.id, contactId: p.contactId }))) setTitulo('');
  };

  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="check" />
          Tareas
        </h2>
        <span className="chip num">
          {g.hechas}/{g.total} hechas
        </span>
      </div>
      <div className="progress" style={{ marginBottom: 8 }}>
        <i style={{ width: `${g.pct}%` }} />
      </div>
      <div className="list">
        {tareas.map((t) => (
          <FilaTarea key={t.id} t={t} sinProyecto punto />
        ))}
        {!tareas.length && (
          <div className="empty">
            Aún no hay tareas. Puedes empezar con una plantilla:
            <div className="inline-add" style={{ justifyContent: 'center' }}>
              <select className="input" style={{ width: 'auto' }} value={plantilla} onChange={(e) => setPlantilla(e.target.value)} aria-label="Plantilla">
                <option value="">Elige una plantilla…</option>
                {Object.entries(PLANTILLAS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn"
                disabled={!plantilla}
                onClick={async () => {
                  if (await ponerPlantilla(p, plantilla)) toast('Plantilla aplicada: tareas y entregables creados');
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>
      <form
        className="inline-add"
        onSubmit={(e) => {
          e.preventDefault();
          void anadir();
        }}
      >
        <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nueva tarea y pulsa Intro" aria-label="Nueva tarea del proyecto" maxLength={300} />
        <button type="submit" className="btn" aria-label="Añadir tarea">
          <Icono n="plus" />
        </button>
      </form>
    </section>
  );
}

function Equipo({ p }: { p: Proyecto }) {
  const { c, actualizar } = useDatos();
  const toast = useToast();
  const equipo = p.collaborators.map((id) => c.contacts.find((x) => x.id === id)).filter((x) => x !== undefined);
  const otros = c.contacts.filter((x) => x.type === 'Colaborador' && !p.collaborators.includes(x.id));
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="spark" />
          Equipo
        </h2>
      </div>
      <div className="list">
        {equipo.map((x) => (
          <div className="follow" key={x.id}>
            <Avatar id={x.id} nombre={x.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/contactos?id=${x.id}`} className="text-link">
                <b>{x.name}</b>
              </Link>
              <div className="chip">
                {x.role}
                {x.rate ? ` · ${eur(x.rate)}/h` : ''}
              </div>
            </div>
            <Pill cls={DISPONIBILIDAD[x.availability ?? 'disponible'].cls}>{DISPONIBILIDAD[x.availability ?? 'disponible'].label}</Pill>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Quitar a ${x.name} del equipo`}
              onClick={() => void actualizar('projects', p.id, { collaborators: p.collaborators.filter((id) => id !== x.id) })}
            >
              <Icono n="x" />
            </button>
          </div>
        ))}
        {!equipo.length && <div className="empty">Trabajas sin colaboradores en este proyecto.</div>}
      </div>
      {otros.length > 0 && (
        <select
          className="input"
          style={{ marginTop: 8 }}
          value=""
          aria-label="Añadir colaborador"
          onChange={async (e) => {
            const id = e.target.value;
            const x = c.contacts.find((y) => y.id === id);
            if (x && (await actualizar('projects', p.id, { collaborators: [...p.collaborators, id] }))) toast(`${x.name} añadido al equipo`);
          }}
        >
          <option value="">+ Añadir colaborador…</option>
          {otros.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} · {o.role} ({DISPONIBILIDAD[o.availability ?? 'disponible'].label.toLowerCase()})
            </option>
          ))}
        </select>
      )}
    </section>
  );
}
