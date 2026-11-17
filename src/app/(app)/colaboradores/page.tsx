'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DISPONIBILIDAD } from '@/lib/catalogos/crm';
import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import type { Contacto } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { sumarDias } from '@/lib/reglas/fechas';
import { enMarcha } from '@/lib/reglas/proyectos';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { useNebula } from '@/components/app/Nebula';
import { Avatar, Pill, PillDisciplina, useCopiar } from '@/components/crm/comunes';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';

/** Colaboradores: especialidad, tarifa, disponibilidad, proyectos y lo pagado (SPEC §6.16). */
export default function Colaboradores() {
  const { c, hoy } = useDatos();
  const { ajustes } = useNebula();
  const abrir = useFormularios();
  const [especialidad, setEspecialidad] = useState('all');
  const [asignar, setAsignar] = useState<Contacto | null>(null);
  const todos = c.contacts.filter((x) => x.type === 'Colaborador');
  const lista = todos.filter((x) => especialidad === 'all' || x.specialty === especialidad).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const desde = sumarDias(hoy, -180);
  const pagado = c.expenses.filter((g) => g.date >= desde && todos.some((x) => x.id === g.contactId)).reduce((a, g) => a + g.base, 0);
  const conTarifa = todos.filter((x) => x.rate);

  return (
    <>
      <Cabecera
        antetitulo="Tu equipo extendido"
        titulo="Colaboradores"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir('contact', { type: 'Colaborador' })}>
            <Icono n="plus" />
            Nuevo colaborador
          </button>
        }
      >
        Freelances con los que trabajas: especialidad, tarifa, disponibilidad y en qué proyectos están.
      </Cabecera>
      <div className="stats">
        <div className="stat sage">
          <span className="k">Disponibles ahora</span>
          <span className="v num">{todos.filter((x) => x.availability === 'disponible').length}</span>
          <span className="s">de {todos.length} colaboradores</span>
        </div>
        <div className="stat peach">
          <span className="k">Les has pagado · 6 meses</span>
          <span className="v num">{eur(pagado)}</span>
          <span className="s">Sale de tus gastos</span>
        </div>
        <div className="stat lilac">
          <span className="k">Trabajando contigo</span>
          <span className="v num">{todos.filter((x) => c.projects.some((p) => enMarcha(p) && p.collaborators.includes(x.id))).length}</span>
          <span className="s">En proyectos en marcha</span>
        </div>
        <div className="stat butter">
          <span className="k">Tarifa media</span>
          <span className="v num">{eur(conTarifa.reduce((a, x) => a + (x.rate ?? 0), 0) / (conTarifa.length || 1))}/h</span>
          <span className="s">Tu tarifa: {eur(ajustes.rate)}/h</span>
        </div>
      </div>
      <div className="toolbar">
        <select className="input" style={{ width: 'auto' }} value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} aria-label="Especialidad">
          <option value="all">Todas las especialidades</option>
          {Object.entries(DISCIPLINAS).map(([k, d]) => (
            <option key={k} value={k}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="p-grid">
        {lista.map((x) => (
          <TarjetaColaborador key={x.id} x={x} alAsignar={() => setAsignar(x)} />
        ))}
        {!lista.length && <div className="card empty">{todos.length ? 'No hay colaboradores con esta especialidad.' : 'Aún no tienes colaboradores. Añade a los freelances con los que trabajas.'}</div>}
      </div>
      {asignar && <VentanaAsignar x={asignar} alCerrar={() => setAsignar(null)} />}
    </>
  );
}

function TarjetaColaborador({ x, alAsignar }: { x: Contacto; alAsignar: () => void }) {
  const { c } = useDatos();
  const copiar = useCopiar();
  const proyectos = c.projects.filter((p) => enMarcha(p) && p.collaborators.includes(x.id));
  const pagado = c.expenses.filter((g) => g.contactId === x.id).reduce((a, g) => a + g.base, 0);
  const disp = DISPONIBILIDAD[x.availability ?? 'disponible'];
  return (
    <article className="r-card">
      <div className="c-head" style={{ gap: 12 }}>
        <Avatar id={x.id} nombre={x.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>{x.name}</h3>
          <div className="client">{x.role}</div>
        </div>
        <Pill cls={disp.cls}>{disp.label}</Pill>
      </div>
      <div className="p-top">
        <PillDisciplina d={x.specialty} />
        <Pill cls="mist">{x.rate ? `${eur(x.rate)}/h` : 'Sin tarifa'}</Pill>
      </div>
      <div className="sec-lbl">Proyectos en marcha</div>
      <div className="tags">
        {proyectos.map((p) => (
          <Link key={p.id} className="chip link" href={`/proyectos?p=${p.id}`}>
            <Icono n="folder" />
            {p.name}
          </Link>
        ))}
        {!proyectos.length && <span className="chip">Ninguno ahora mismo</span>}
      </div>
      <div className="p-meta">
        <span className="chip">Le has pagado {eur(pagado)}</span>
        {x.notes && <span className="chip">{x.notes}</span>}
      </div>
      <div className="r-actions">
        {x.email && (
          <button type="button" className="btn sm" onClick={() => copiar(x.email)}>
            <Icono n="mail" />
            Email
          </button>
        )}
        <button type="button" className="btn sm" onClick={alAsignar}>
          <Icono n="plus" />
          Asignar a proyecto
        </button>
        <Link className="btn sm ghost" href={`/contactos?id=${x.id}`}>
          Ficha
        </Link>
      </div>
    </article>
  );
}

function VentanaAsignar({ x, alCerrar }: { x: Contacto; alCerrar: () => void }) {
  const { c, actualizar } = useDatos();
  const toast = useToast();
  const opciones = c.projects.filter((p) => enMarcha(p) && !p.collaborators.includes(x.id));
  const [p, setP] = useState(opciones[0]?.id ?? '');
  return (
    <Modal
      titulo={`Asignar a ${x.name.split(' ')[0]}`}
      alCerrar={alCerrar}
      ancho={460}
      comoFormulario={async () => {
        const proyecto = c.projects.find((y) => y.id === p);
        if (!proyecto) return alCerrar();
        if (await actualizar('projects', proyecto.id, { collaborators: [...proyecto.collaborators, x.id] })) {
          alCerrar();
          toast(`${x.name} añadido al equipo de «${proyecto.name}»`);
        }
      }}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={!opciones.length}>
            Asignar
          </button>
        </>
      }
    >
      <div className="modal-b">
        {opciones.length ? (
          <label className="field full">
            <span>Proyecto en marcha</span>
            <select className="input" data-autofocus value={p} onChange={(e) => setP(e.target.value)}>
              {opciones.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="muted full">Ya está en todos tus proyectos en marcha.</p>
        )}
      </div>
    </Modal>
  );
}
