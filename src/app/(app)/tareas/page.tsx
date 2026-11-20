'use client';

import { useState } from 'react';
import { CUADRANTES, type Cuadrante } from '@/lib/catalogos/crm';
import { enMarcha } from '@/lib/reglas/proyectos';
import { cuadranteDe, porFecha } from '@/lib/reglas/tareas';
import { tareaNueva } from '@/components/app/acciones';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { FilaTarea } from '@/components/crm/comunes';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

const CUADROS = Object.keys(CUADRANTES) as Cuadrante[];
const banderas = (q: Cuadrante) => ({ urgent: q === 'q1' || q === 'q3', important: q === 'q1' || q === 'q2' });

/** Tareas: matriz urgente / importante con arrastrar y soltar (SPEC §6.7). */
export default function Tareas() {
  const { c, crear, actualizar } = useDatos();
  const abrir = useFormularios();
  const toast = useToast();
  const [proyecto, setProyecto] = useState('all');
  const [encima, setEncima] = useState<Cuadrante | null>(null);

  const ts = c.tasks.filter((t) => (proyecto === 'all' ? true : proyecto === 'none' ? !t.projectId : t.projectId === proyecto));
  const abiertas = ts.filter((t) => !t.done).sort(porFecha);
  const hechas = ts.filter((t) => t.done).sort((a, b) => (b.due ?? '').localeCompare(a.due ?? ''));
  const filtroProyecto = c.projects.some((p) => p.id === proyecto) ? proyecto : null;

  const soltar = (e: React.DragEvent, q: Cuadrante) => {
    e.preventDefault();
    setEncima(null);
    const t = c.tasks.find((x) => x.id === e.dataTransfer.getData('text/plain'));
    if (!t || cuadranteDe(t) === q) return;
    void actualizar('tasks', t.id, banderas(q)).then((ok) => ok && toast(`Movida a «${CUADRANTES[q].label}»`));
  };

  const anadir = async (q: Cuadrante, input: HTMLInputElement) => {
    const titulo = input.value.trim().slice(0, 300);
    if (!titulo) return;
    const p = c.projects.find((x) => x.id === filtroProyecto);
    if (await crear('tasks', tareaNueva({ title: titulo, ...banderas(q), projectId: p?.id ?? null, contactId: p?.contactId ?? null }))) {
      input.value = '';
      toast('Tarea añadida');
    }
  };

  return (
    <>
      <Cabecera
        antetitulo="Prioridades"
        titulo="Tareas"
        acciones={
          <>
            <select className="input" style={{ width: 'auto' }} value={proyecto} onChange={(e) => setProyecto(e.target.value)} aria-label="Filtrar por proyecto">
              <option value="all">Todos los proyectos</option>
              <option value="none">Sin proyecto</option>
              {c.projects.filter(enMarcha).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn primary" onClick={() => abrir('task', filtroProyecto ? { projectId: filtroProyecto } : {})}>
              <Icono n="plus" />
              Nueva tarea
            </button>
          </>
        }
      >
        Arrastra una tarea a otro cuadro para cambiar su prioridad, o ábrela y marca «Urgente» o «Importante».
      </Cabecera>

      <nav className="indice-cuadros" aria-label="Ir a un cuadro de prioridad">
        {CUADROS.map((q) => (
          <a key={q} href={`#cuadro-${q}`} className={`pill ${CUADRANTES[q].cls}`}>
            {CUADRANTES[q].label}
            <span className="num">{abiertas.filter((t) => cuadranteDe(t) === q).length}</span>
          </a>
        ))}
      </nav>

      <div className="matrix">
        {CUADROS.map((q) => {
          const lista = abiertas.filter((t) => cuadranteDe(t) === q);
          const Q = CUADRANTES[q];
          return (
            <section
              key={q}
              id={`cuadro-${q}`}
              className={`quad ${Q.cls} ${encima === q ? 'over' : ''}`}
              aria-label={Q.label}
              onDragOver={(e) => {
                e.preventDefault();
                if (encima !== q) setEncima(q);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setEncima(null);
              }}
              onDrop={(e) => soltar(e, q)}
            >
              <div className="quad-h">
                <h2>{Q.label}</h2>
                <span>
                  {Q.hint} · {lista.length}
                </span>
              </div>
              <div className="list">
                {lista.map((t) => (
                  <FilaTarea key={t.id} t={t} arrastrable />
                ))}
                {!lista.length && (
                  <div className="empty" style={{ color: 'inherit', opacity: 0.7 }}>
                    Suelta aquí una tarea
                  </div>
                )}
              </div>
              <div className="quad-add">
                <input
                  placeholder="+ Añadir tarea"
                  aria-label={`Añadir tarea a ${Q.label}`}
                  maxLength={300}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void anadir(q, e.currentTarget);
                    }
                  }}
                />
              </div>
            </section>
          );
        })}
      </div>

      <details className="done-box mist" open={hechas.length < 8 || undefined}>
        <summary>
          <Icono n="right" />
          Hechas <span className="badge">{hechas.length}</span>
        </summary>
        <div className="list" style={{ paddingBottom: 10 }}>
          {hechas.map((t) => (
            <FilaTarea key={t.id} t={t} />
          ))}
          {!hechas.length && <div className="empty">Todavía no has terminado ninguna.</div>}
        </div>
      </details>
    </>
  );
}
