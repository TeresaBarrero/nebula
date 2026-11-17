'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CUADRANTES, ESTADOS_CONTACTO, FASES_PROYECTO, FLUJO, colorAvatar, type Pastel } from '@/lib/catalogos/crm';
import { DISCIPLINAS, type Disciplina } from '@/lib/catalogos/disciplinas';
import type { Documento, EstadoContacto, Proyecto, Tarea } from '@/lib/datos/entidades';
import { diasHasta, fechaCorta, relativa } from '@/lib/reglas/fechas';
import { cuadranteDe, marcarTarea, bloqueante, REPETICIONES } from '@/lib/reglas/tareas';
import { iniciales } from '@/lib/reglas/textos';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

export function Pill({ cls, children }: { cls: Pastel | string; children: React.ReactNode }) {
  return <span className={`pill ${cls}`}>{children}</span>;
}

export function PillDisciplina({ d }: { d: Disciplina | null | undefined }) {
  if (!d || !DISCIPLINAS[d]) return null;
  return <Pill cls={DISCIPLINAS[d].cls}>{DISCIPLINAS[d].label}</Pill>;
}

export function PillEstadoContacto({ s }: { s: EstadoContacto }) {
  return <Pill cls={ESTADOS_CONTACTO[s].cls}>{ESTADOS_CONTACTO[s].label}</Pill>;
}

export function Avatar({ id, nombre, tam = '', cuadrado = false }: { id: string; nombre: string; tam?: '' | 'lg' | 'xl'; cuadrado?: boolean }) {
  return (
    <span className={`avatar ${tam} ${cuadrado ? 'sq' : ''} ${colorAvatar(id)}`} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  );
}

/** Barra de fases del proyecto (stepper del prototipo). */
export function BarraFases({ p }: { p: Proyecto }) {
  const idx = FLUJO.indexOf(p.status);
  return (
    <div className="stepper" title={FASES_PROYECTO[p.status].label} aria-label={`Fase: ${FASES_PROYECTO[p.status].label}`}>
      {FLUJO.map((k, i) => (
        <span key={k} className={idx >= 0 && i <= idx ? 'on' : ''} />
      ))}
    </div>
  );
}

/** Copia un texto y avisa. */
export function useCopiar() {
  const toast = useToast();
  return (v: string) => {
    if (!v) return;
    navigator.clipboard?.writeText(v).then(
      () => toast(`Copiado: ${v}`),
      () => toast(v),
    );
  };
}

/** Fila de tarea con casilla, fecha (roja si va atrasada), proyecto, contacto, repetición y candado. */
export function FilaTarea({ t, sinProyecto, sinContacto, punto, arrastrable }: { t: Tarea; sinProyecto?: boolean; sinContacto?: boolean; punto?: boolean; arrastrable?: boolean }) {
  const { c, hoy, crear, actualizar, borrar } = useDatos();
  const abrir = useFormularios();
  const toast = useToast();
  const p = c.projects.find((x) => x.id === t.projectId);
  const contacto = c.contacts.find((x) => x.id === t.contactId);
  const responsable = c.contacts.find((x) => x.id === t.assigneeId);
  const b = bloqueante(t, c.tasks);
  const atrasada = !t.done && t.due && diasHasta(t.due, hoy) < 0;
  const q = CUADRANTES[cuadranteDe(t)];

  const marcar = async () => {
    const r = marcarTarea(t, c.tasks, hoy, nuevoId, (f) => fechaCorta(f));
    if (!r.ok) return toast(r.aviso);
    await actualizar('tasks', t.id, r.cambios);
    if (r.siguiente) await crear('tasks', { ...r.siguiente, createdAt: ahoraISO() });
    if (!r.cambios.done) return;
    toast(r.mensaje, {
      label: 'Deshacer',
      fn: () => {
        void actualizar('tasks', t.id, { done: false, nextCreated: t.nextCreated });
        if (r.siguiente) void borrar('tasks', r.siguiente.id, 'Repetición quitada');
      },
    });
  };

  return (
    <div
      className={`task ${t.done ? 'done' : ''}`}
      draggable={arrastrable || undefined}
      onDragStart={
        arrastrable
          ? (e) => {
              e.dataTransfer.setData('text/plain', t.id);
              e.dataTransfer.effectAllowed = 'move';
            }
          : undefined
      }
    >
      <button
        type="button"
        className={`check ${t.done ? 'on' : ''} ${b ? 'blocked' : ''}`}
        onClick={marcar}
        aria-label={t.done ? `Marcar «${t.title}» como pendiente` : `Completar «${t.title}»`}
      >
        {t.done && <Icono n="tick" />}
      </button>
      <div className="task-body">
        <button type="button" className="task-t" onClick={() => abrir('task', { id: t.id })}>
          {t.title}
        </button>
        <div className="task-m">
          {t.due && (
            <span className={`chip ${atrasada ? 'late' : ''}`}>
              <Icono n="clock" />
              {atrasada ? 'Atrasada · ' : ''}
              {relativa(t.due, hoy)}
            </span>
          )}
          {p && !sinProyecto && (
            <Link className="chip link" href={`/proyectos?p=${p.id}`}>
              <Icono n="folder" />
              {p.name}
            </Link>
          )}
          {contacto && !sinContacto && (
            <Link className="chip link" href={`/contactos?id=${contacto.id}`}>
              <Icono n="user" />
              {contacto.name}
            </Link>
          )}
          {t.repeat && (
            <span className="chip">
              <Icono n="repeat" />
              {REPETICIONES[t.repeat].label}
            </span>
          )}
          {b && (
            <span className="chip late">
              <Icono n="lock" />
              Espera a «{b.title}»
            </span>
          )}
          {responsable && (
            <span className="chip">
              <Icono n="spark" />
              {responsable.name.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
      {punto && <span className="qdot" title={q.label} style={{ background: q.dot }} />}
    </div>
  );
}

const tamano = (b: number) => (b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const extension = (n: string) => (n.split('.').pop() || '').slice(0, 4).toUpperCase();
const colorDoc = (m: string): Pastel => (m.includes('pdf') ? 'rose' : m.startsWith('image') ? 'lilac' : m.includes('sheet') || m.includes('excel') ? 'sage' : 'butter');

/** Documentos vinculados con «Subir», abrir y eliminar (filesBox del prototipo). */
export function CajaDocumentos({ docs, vinculo }: { docs: Documento[]; vinculo: Pick<Documento, 'contactId' | 'companyId' | 'projectId'> }) {
  const { hoy, subirDocumentos, abrirDocumento, borrar } = useDatos();
  const [subiendo, setSubiendo] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const orden = [...docs].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="paperclip" />
          Documentos
        </h2>
        <label className={`upload ${subiendo ? 'ocupado' : ''}`}>
          <Icono n="plus" />
          {subiendo ? 'Subiendo…' : 'Subir'}
          <input
            type="file"
            multiple
            aria-label="Subir documentos"
            disabled={subiendo}
            onChange={async (e) => {
              const fs = e.target.files;
              if (!fs?.length) return;
              setSubiendo(true);
              await subirDocumentos(fs, vinculo);
              setSubiendo(false);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <div className="files">
        {orden.map((d) => (
          <div className="file" key={d.id}>
            <span className={`fi ${colorDoc(d.mime)}`}>{extension(d.name)}</span>
            <button type="button" className="fn fn-boton" onClick={() => void abrirDocumento(d)} title={`Abrir ${d.name}`}>
              <b>{d.name}</b>
              <span className="chip">
                {tamano(d.size)} · {relativa(d.date, hoy)}
              </span>
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={confirmar === d.id ? `Confirmar: eliminar ${d.name}` : `Eliminar ${d.name}`}
              title={confirmar === d.id ? 'Pulsa otra vez para eliminar' : 'Eliminar'}
              onClick={() => {
                if (confirmar !== d.id) return setConfirmar(d.id);
                setConfirmar(null);
                void borrar('files', d.id, 'Documento eliminado');
              }}
            >
              <Icono n="trash" className={confirmar === d.id ? 'peligro' : ''} />
            </button>
          </div>
        ))}
        {!orden.length && <div className="drop-hint">Contratos, briefs, fotos… Pulsa «Subir» para guardarlos aquí.</div>}
      </div>
    </section>
  );
}
