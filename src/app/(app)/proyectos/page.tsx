'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { FASES_PROYECTO, PRIORIDADES } from '@/lib/catalogos/crm';
import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import type { Prioridad, Proyecto } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { diasHasta, fechaCorta, relativa } from '@/lib/reglas/fechas';
import { empresaDe } from '@/lib/reglas/historial';
import { enMarcha, progreso } from '@/lib/reglas/proyectos';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { BarraFases, Pill, PillDisciplina } from '@/components/crm/comunes';
import { PanelProyecto } from '@/components/crm/PanelProyecto';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

type Pestana = 'activos' | 'pausa' | 'entregado' | 'all';
const PESTANAS: [Pestana, string, (p: Proyecto) => boolean][] = [
  ['activos', 'En marcha', enMarcha],
  ['pausa', 'En pausa', (p) => p.status === 'pausa'],
  ['entregado', 'Entregados', (p) => p.status === 'entregado'],
  ['all', 'Todos', () => true],
];
const ORDEN: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };

export default function Pagina() {
  return (
    <Suspense>
      <Proyectos />
    </Suspense>
  );
}

/** Proyectos: pestañas por estado, filtro por disciplina, tarjetas y panel de cada proyecto (SPEC §6.6). */
function Proyectos() {
  const { c } = useDatos();
  const abrir = useFormularios();
  const router = useRouter();
  const abierto = useSearchParams().get('p');
  const [pestana, setPestana] = useState<Pestana>('activos');
  const [disciplina, setDisciplina] = useState('all');

  const filtro = PESTANAS.find((x) => x[0] === pestana)![2];
  const lista = c.projects
    .filter(filtro)
    .filter((p) => disciplina === 'all' || p.discipline === disciplina)
    .sort((a, b) => ORDEN[a.priority] - ORDEN[b.priority] || (a.end ?? '9').localeCompare(b.end ?? '9'));
  const panel = c.projects.find((p) => p.id === abierto);

  return (
    <>
      <Cabecera
        antetitulo="Trabajo"
        titulo="Proyectos"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir('project')}>
            <Icono n="plus" />
            Nuevo proyecto
          </button>
        }
      >
        Cada proyecto avanza por fases: briefing, investigación, concepto, diseño y desarrollo, revisiones y entrega.
      </Cabecera>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filtrar por estado">
          {PESTANAS.map(([k, l, f]) => (
            <button key={k} type="button" className={pestana === k ? 'on' : ''} aria-pressed={pestana === k} onClick={() => setPestana(k)}>
              {l} <span className="n">{c.projects.filter(f).length}</span>
            </button>
          ))}
        </div>
        <select className="input" style={{ width: 'auto' }} value={disciplina} onChange={(e) => setDisciplina(e.target.value)} aria-label="Filtrar por disciplina">
          <option value="all">Todas las disciplinas</option>
          {Object.entries(DISCIPLINAS).map(([k, d]) => (
            <option key={k} value={k}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="p-grid">
        {lista.map((p) => (
          <TarjetaProyecto key={p.id} p={p} alAbrir={() => router.push(`/proyectos?p=${p.id}`, { scroll: false })} />
        ))}
        {!lista.length && (
          <div className="card empty">
            {c.projects.length ? 'No hay proyectos aquí.' : 'Aún no tienes proyectos. Crea uno con una plantilla, o gana una oportunidad y se creará solo.'}
          </div>
        )}
      </div>
      {panel && <PanelProyecto key={panel.id} p={panel} alCerrar={() => router.replace('/proyectos', { scroll: false })} />}
    </>
  );
}

function TarjetaProyecto({ p, alAbrir }: { p: Proyecto; alAbrir: () => void }) {
  const { c, hoy } = useDatos();
  const contacto = c.contacts.find((x) => x.id === p.contactId);
  const g = progreso(c.tasks, p.id);
  const retrasado = enMarcha(p) && p.end && diasHasta(p.end, hoy) < 0;
  const esperando = c.deliverables.filter((d) => d.projectId === p.id && d.status === 'enviado').length;
  return (
    <button type="button" className="p-card" onClick={alAbrir}>
      <div className="p-top">
        <PillDisciplina d={p.discipline} />
        <Pill cls={FASES_PROYECTO[p.status].cls}>{FASES_PROYECTO[p.status].label}</Pill>
        {p.priority === 'urgente' && <Pill cls={PRIORIDADES.urgente.cls}>{PRIORIDADES.urgente.label}</Pill>}
      </div>
      <div>
        <h3>{p.name}</h3>
        <div className="client">{contacto ? `${contacto.name}${empresaDe(c, contacto) ? ' · ' + empresaDe(c, contacto) : ''}` : 'Sin cliente'}</div>
      </div>
      <BarraFases p={p} />
      <div className="p-meta">
        <span className="chip">
          <Icono n="timer" />
          {p.hoursBudget ? `${p.hoursBudget} h previstas` : 'Sin horas previstas'}
        </span>
        <span className="chip">
          <Icono n="check" />
          {g.hechas}/{g.total} tareas
        </span>
        {esperando > 0 && (
          <span className="chip">
            <Icono n="send" />
            {esperando} esperando al cliente
          </span>
        )}
      </div>
      <div className="p-meta">
        <span className="chip">
          <Icono n="calendar" />
          {fechaCorta(p.start)} → {fechaCorta(p.end)}
        </span>
        <span className={`chip ${retrasado ? 'late' : ''}`}>
          {retrasado ? 'Retrasado' : p.status === 'entregado' ? 'Entregado' : p.end ? `Entrega ${relativa(p.end, hoy).toLowerCase()}` : 'Sin fecha de entrega'}
        </span>
      </div>
      <div className="p-foot">
        <div>
          <b className="num">{eur(p.budget)}</b>
          <div className="chip">Presupuesto sin IVA</div>
        </div>
        <span className="text-link">Abrir →</span>
      </div>
    </button>
  );
}
