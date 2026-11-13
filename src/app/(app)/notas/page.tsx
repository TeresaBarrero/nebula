'use client';

import Link from 'next/link';
import { useState } from 'react';
import { COLORES_NOTA, NOMBRE_COLOR } from '@/lib/catalogos/crm';
import type { ColorNota } from '@/lib/datos/entidades';
import { relativa } from '@/lib/reglas/fechas';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

export default function Notas() {
  const { c, hoy, crear, actualizar, borrar } = useDatos();
  const abrir = useFormularios();
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [color, setColor] = useState<ColorNota>('butter');
  const [contacto, setContacto] = useState('');
  const [proyecto, setProyecto] = useState('');

  const notas = [...c.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const ordenar = <T extends { name: string }>(xs: T[]) => [...xs].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const guardar = async () => {
    const t = texto.trim();
    if (!t) return document.getElementById('nota-texto')?.focus();
    const ok = await crear('notes', { id: nuevoId(), text: t.slice(0, 10000), color, pinned: false, contactId: contacto || null, projectId: proyecto || null, date: hoy, createdAt: ahoraISO() });
    if (ok) {
      setTexto('');
      toast('Nota guardada');
    }
  };

  return (
    <>
      <Cabecera antetitulo="Ideas" titulo="Notas rápidas">
        Apunta cualquier cosa y vincúlala a un contacto o proyecto si quieres. Las fijadas aparecen en Inicio.
      </Cabecera>
      <section className="card note-new">
        <textarea
          id="nota-texto"
          className="input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void guardar();
            }
          }}
          placeholder="Escribe una nota… (Ctrl + Intro para guardar)"
          aria-label="Nueva nota"
          maxLength={10000}
        />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="swatches" role="radiogroup" aria-label="Color de la nota">
            {COLORES_NOTA.map((cl) => (
              <button
                key={cl}
                type="button"
                role="radio"
                aria-checked={color === cl}
                className={`sw ${cl} ${color === cl ? 'on' : ''}`}
                onClick={() => setColor(cl)}
                aria-label={`Color ${NOMBRE_COLOR[cl]}`}
              />
            ))}
          </div>
          <select className="input" style={{ width: 'auto' }} value={contacto} onChange={(e) => setContacto(e.target.value)} aria-label="Contacto">
            <option value="">Sin contacto</option>
            {ordenar(c.contacts).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select className="input" style={{ width: 'auto', maxWidth: '100%' }} value={proyecto} onChange={(e) => setProyecto(e.target.value)} aria-label="Proyecto">
            <option value="">Sin proyecto</option>
            {ordenar(c.projects).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <div className="spacer" />
          <button type="button" className="btn primary" onClick={() => void guardar()}>
            <Icono n="plus" />
            Guardar nota
          </button>
        </div>
      </section>
      {notas.length ? (
        <div className="notes">
          {notas.map((n) => {
            const ct = c.contacts.find((x) => x.id === n.contactId);
            const p = c.projects.find((x) => x.id === n.projectId);
            return (
              <article key={n.id} className={`note ${n.color} ${n.pinned ? 'pinned' : ''}`}>
                <p>{n.text}</p>
                <div className="note-f">
                  <div className="chips">
                    {ct && (
                      <Link className="chip link" href={`/contactos?id=${ct.id}`}>
                        <Icono n="user" />
                        {ct.name}
                      </Link>
                    )}
                    {p && (
                      <Link className="chip link" href={`/proyectos?p=${p.id}`}>
                        <Icono n="folder" />
                        {p.name}
                      </Link>
                    )}
                    <span className="chip">{relativa(n.date, hoy)}</span>
                  </div>
                  <div className="note-act">
                    <button
                      type="button"
                      aria-label={n.pinned ? 'Desfijar' : 'Fijar en Inicio'}
                      aria-pressed={n.pinned}
                      title={n.pinned ? 'Desfijar' : 'Fijar en Inicio'}
                      onClick={() => void actualizar('notes', n.id, { pinned: !n.pinned }).then((ok) => ok && toast(n.pinned ? 'Nota desfijada' : 'Nota fijada en Inicio'))}
                    >
                      <Icono n="pin" />
                    </button>
                    <button type="button" aria-label="Editar nota" title="Editar" onClick={() => abrir('note', { id: n.id })}>
                      <Icono n="edit" />
                    </button>
                    <button type="button" aria-label="Eliminar nota" title="Eliminar" onClick={() => void borrar('notes', n.id, 'Nota eliminada')}>
                      <Icono n="trash" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card empty">Todavía no tienes notas. Escribe la primera arriba.</div>
      )}
    </>
  );
}
