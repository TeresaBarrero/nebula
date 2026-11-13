'use client';

import { useMemo, useState } from 'react';
import { APUNTES, PLANTILLAS_CORREO, type PlantillaCorreo } from '@/lib/catalogos/crm';
import type { Contacto, TipoApunte } from '@/lib/datos/entidades';
import { relativa } from '@/lib/reglas/fechas';
import { historial, type Filtro } from '@/lib/reglas/historial';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { useNebula } from '@/components/app/Nebula';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';

/** Historial unificado con registro rápido (nota, llamada, email, reunión). SPEC §6.4 y §7.11. */
export function SeccionHistorial({ filtro, titulo = 'Historial', limite = 14, registrar }: { filtro: Filtro; titulo?: string; limite?: number; registrar?: { contactId: string } }) {
  const { c, hoy, crear } = useDatos();
  const toast = useToast();
  const [tipo, setTipo] = useState<TipoApunte>('llamada');
  const [texto, setTexto] = useState('');
  const [todos, setTodos] = useState(false);
  const items = useMemo(() => historial(c, filtro, hoy), [c, filtro, hoy]);

  const apuntar = async () => {
    const t = texto.trim();
    if (!t || !registrar) return;
    // Se vincula al proyecto en marcha de esa persona, si lo hay (como el prototipo).
    const p = c.projects.find((x) => x.contactId === registrar.contactId && !['entregado', 'pausa'].includes(x.status));
    const ok = await crear('activities', { id: nuevoId(), type: tipo, text: t.slice(0, 5000), date: hoy, contactId: registrar.contactId, projectId: p?.id ?? null, createdAt: ahoraISO() });
    if (ok) {
      setTexto('');
      toast('Apuntado en el historial');
    }
  };

  const visibles = todos ? items : items.slice(0, limite);
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="clock" />
          {titulo}
        </h2>
      </div>
      {registrar && (
        <form
          className="log"
          onSubmit={(e) => {
            e.preventDefault();
            void apuntar();
          }}
        >
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoApunte)} aria-label="Tipo de apunte">
            {Object.entries(APUNTES).map(([k, a]) => (
              <option key={k} value={k}>
                {a.label}
              </option>
            ))}
          </select>
          <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué ha pasado? p. ej. «Acepta el presupuesto»" aria-label="Registrar actividad" maxLength={5000} />
          <button className="btn primary" type="submit">
            Apuntar
          </button>
        </form>
      )}
      {items.length ? (
        <div className="timeline">
          {visibles.map((i) => (
            <div className="tl" key={i.clave}>
              <div className={`tl-ic ${i.cls}`}>
                <Icono n={i.icono} />
              </div>
              <div className="tl-b">
                <b>{i.titulo}</b>
                <p>{i.texto}</p>
              </div>
              <div className="tl-d">{relativa(i.fecha, hoy)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Todavía no hay actividad. Registra una llamada o una nota para empezar el historial.</div>
      )}
      {items.length > limite && (
        <button type="button" className="text-link" onClick={() => setTodos(!todos)}>
          {todos ? 'Ver menos' : `Ver todo (${items.length})`}
        </button>
      )}
    </section>
  );
}

/**
 * Escribir un correo con plantilla (SPEC §6.4). Hasta conectar Gmail/Outlook (Fase 5) se abre en tu programa de correo
 * y queda apuntado en el historial.
 */
export function EscribirCorreo({ contacto, alCerrar }: { contacto: Contacto; alCerrar: () => void }) {
  const { perfil } = useNebula();
  const { hoy, crear } = useDatos();
  const toast = useToast();
  const rellenar = (s: string) => s.replaceAll('{nombre}', contacto.name.split(' ')[0]).replaceAll('{yo}', perfil.name);
  const [plantilla, setPlantilla] = useState<PlantillaCorreo>('libre');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');

  const elegir = (p: PlantillaCorreo) => {
    setPlantilla(p);
    setAsunto(rellenar(PLANTILLAS_CORREO[p].s));
    setCuerpo(rellenar(PLANTILLAS_CORREO[p].b));
  };

  const enviar = async () => {
    if (!asunto.trim()) return toast('Escribe el asunto');
    const enlace = `mailto:${encodeURIComponent(contacto.email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = enlace;
    await crear('activities', { id: nuevoId(), type: 'email', text: `Enviado: ${asunto.trim()}`.slice(0, 5000), date: hoy, contactId: contacto.id, projectId: null, createdAt: ahoraISO() });
    alCerrar();
    toast('Abierto en tu programa de correo y apuntado en su historial');
  };

  return (
    <Modal
      titulo={`Escribir a ${contacto.name}`}
      alCerrar={alCerrar}
      comoFormulario={() => void enviar()}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={!contacto.email}>
            <Icono n="send" />
            Abrir en mi correo
          </button>
        </>
      }
    >
      <div className="modal-b">
        <label className="field">
          <span>Para</span>
          <input className="input" value={contacto.email || 'Sin email'} disabled />
        </label>
        <label className="field">
          <span>Plantilla</span>
          <select className="input" value={plantilla} onChange={(e) => elegir(e.target.value as PlantillaCorreo)}>
            {Object.entries(PLANTILLAS_CORREO).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field full">
          <span>Asunto</span>
          <input className="input" data-autofocus value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={200} />
        </label>
        <label className="field full">
          <span>Mensaje</span>
          <textarea className="input" rows={8} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
        </label>
        <p className="muted full" style={{ margin: 0, fontSize: 12.5 }}>
          {contacto.email
            ? 'Se abrirá tu programa de correo con el mensaje listo. Conectar Gmail u Outlook para enviarlo desde aquí llega en la Fase 5.'
            : 'Este contacto no tiene email. Añádelo desde «Editar».'}
        </p>
      </div>
    </Modal>
  );
}
