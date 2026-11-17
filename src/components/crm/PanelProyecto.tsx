'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DISPONIBILIDAD, ESTADOS_ENTREGABLE, FASES_PROYECTO, FLUJO, PRIORIDADES } from '@/lib/catalogos/crm';
import { PLANTILLAS } from '@/lib/catalogos/plantillas';
import type { Entregable, EstadoEntregable, Proyecto } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { fechaCorta, relativa } from '@/lib/reglas/fechas';
import { empresaDe } from '@/lib/reglas/historial';
import { faseAlReanudar, progreso } from '@/lib/reglas/proyectos';
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
              <dt>Horas previstas</dt>
              <dd className="num">{p.hoursBudget ? `${p.hoursBudget} h` : '—'}</dd>
            </div>
            <div>
              <dt>
                Rondas <Ayuda k="rondas" />
              </dt>
              <dd className="num">{p.roundsIncluded} incluidas</dd>
            </div>
            <div>
              <dt>Tareas</dt>
              <dd className="num">
                {g.hechas} de {g.total}
              </dd>
            </div>
          </dl>

          <Entregables p={p} />
          <TareasProyecto p={p} />
          <Equipo p={p} />
          <CajaDocumentos docs={c.files.filter((d) => d.projectId === p.id)} vinculo={{ projectId: p.id, contactId: p.contactId, companyId: contacto?.companyId ?? null }} />
          <SeccionHistorial filtro={{ projectId: p.id }} limite={10} registrar={{ contactId: p.contactId, projectId: p.id }} />
          <p className="foot-note" style={{ marginTop: 0 }}>
            Facturas y gastos del proyecto llegan en la Fase 2; briefing, rondas de cambios y horas, en la Fase 3; el contrato, en la Fase 4.
          </p>
        </div>
      </aside>
    </Capa>
  );
}

function Entregables({ p }: { p: Proyecto }) {
  const { c, hoy, crear, actualizar, borrar } = useDatos();
  const toast = useToast();
  const [nombre, setNombre] = useState('');
  const lista = c.deliverables.filter((d) => d.projectId === p.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const anadir = async () => {
    const n = nombre.trim().slice(0, 200);
    if (!n) return;
    const ok = await crear('deliverables', { id: nuevoId(), projectId: p.id, name: n, status: 'en_curso', sentAt: null, approvedAt: null, billedExtra: 0, createdAt: ahoraISO() });
    if (ok) setNombre('');
  };
  const cambiarEstado = async (d: Entregable, status: EstadoEntregable) => {
    const cambios: Partial<Entregable> = { status };
    if (status === 'enviado') cambios.sentAt = hoy;
    if (status === 'aprobado') cambios.approvedAt = hoy;
    if (status === 'en_curso' || status === 'cambios') cambios.approvedAt = null;
    if (await actualizar('deliverables', d.id, cambios)) toast(`«${d.name}»: ${ESTADOS_ENTREGABLE[status].label.toLowerCase()}`);
  };

  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="layers" />
          Entregables
        </h2>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {lista.map((d) => (
          <div className="dlv" key={d.id}>
            <div className="dlv-h">
              <b>{d.name}</b>
              <Pill cls={ESTADOS_ENTREGABLE[d.status].cls}>{ESTADOS_ENTREGABLE[d.status].label}</Pill>
            </div>
            <div className="dlv-m">
              {d.status === 'enviado' && d.sentAt && <span className="chip">Enviado {relativa(d.sentAt, hoy).toLowerCase()}</span>}
              {d.status === 'aprobado' && d.approvedAt && <span className="chip">Aprobado {relativa(d.approvedAt, hoy).toLowerCase()}</span>}
              <select
                className="input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: 12.5 }}
                value={d.status}
                aria-label={`Estado de ${d.name}`}
                onChange={(e) => void cambiarEstado(d, e.target.value as EstadoEntregable)}
              >
                {Object.entries(ESTADOS_ENTREGABLE).map(([k, s]) => (
                  <option key={k} value={k}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="button" className="icon-btn" aria-label={`Eliminar ${d.name}`} title="Eliminar" onClick={() => void borrar('deliverables', d.id, 'Entregable eliminado')}>
                <Icono n="trash" />
              </button>
            </div>
          </div>
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
