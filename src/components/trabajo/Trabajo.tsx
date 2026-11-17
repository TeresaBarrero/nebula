'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import { preguntasBrief } from '@/lib/catalogos/trabajo';
import type { Cronometro, Entregable, Iguala, Id, Proyecto } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { relativa } from '@/lib/reglas/fechas';
import { mesDe, nombreMes } from '@/lib/reglas/recurrentes';
import { briefDe, cobroDeRondas, destinoDe, duracion, enviarVersion, entradaDeCronometro, horas, horasDeMas, pedirCambios, rondasDe } from '@/lib/reglas/trabajo';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { useNebula } from '@/components/app/Nebula';
import { useDinero } from '@/components/dinero/Dinero';
import { useEjecutor } from '@/components/app/ejecutor';
import { alAprobar } from '@/lib/automatizaciones';
import { Ayuda } from '@/components/ui/Ayuda';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';

type AccionesTrabajo = {
  cronometro: Cronometro | null;
  /** Empieza a cronometrar (si había otro en marcha, lo para y apunta sus horas). */
  iniciar: (o: Partial<Omit<Cronometro, 'start'>>) => Promise<void>;
  parar: () => Promise<void>;
  /** Pregunta en qué vas a trabajar y empieza. */
  elegirYEmpezar: () => void;
  abrirBrief: (p: Proyecto) => void;
  enviarBrief: (p: Proyecto) => Promise<void>;
  enviarVersion: (v: Entregable) => Promise<void>;
  pedirCambios: (v: Entregable) => void;
  aprobar: (v: Entregable) => Promise<void>;
  cobrarRondas: (v: Entregable) => Promise<void>;
  cobrarHorasDeMas: (r: Iguala) => Promise<void>;
};

const Ctx = createContext<AccionesTrabajo | null>(null);

export function useTrabajo(): AccionesTrabajo {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTrabajo fuera de ProveedorTrabajo');
  return v;
}

/** Cronómetro, briefing y rondas de cambios, disponibles desde cualquier pantalla (SPEC §4.15, §6.6, §7.7). */
export function ProveedorTrabajo({ children }: { children: ReactNode }) {
  const { c, hoy, crear, actualizar, borrar } = useDatos();
  const { perfil, ajustes, guardarPerfil } = useNebula();
  const dinero = useDinero();
  const toast = useToast();
  const ejecutor = useEjecutor();
  const [eligiendo, setEligiendo] = useState(false);
  const [brief, setBrief] = useState<Id | null>(null);
  const [cambios, setCambios] = useState<Id | null>(null);
  const cronometro = perfil.activeTimer;

  const parar = async (callado = false) => {
    const t = perfil.activeTimer;
    if (!t) return;
    const e = entradaDeCronometro(t, new Date(), hoy, c.tasks, nuevoId());
    if (!(await guardarPerfil({ activeTimer: null }))) return;
    if (!(await crear('timeEntries', e))) return;
    if (!callado) toast(`${duracion(e.minutes)} apuntados en ${destinoDe(c, e)}`, { label: 'Deshacer', fn: () => void borrar('timeEntries', e.id, 'Horas quitadas') });
  };

  const iniciar: AccionesTrabajo['iniciar'] = async (o) => {
    if (perfil.activeTimer) await parar(true);
    const t: Cronometro = { start: ahoraISO(), projectId: o.projectId ?? null, retainerId: o.retainerId ?? null, taskId: o.taskId ?? null, note: o.note ?? '' };
    if (await guardarPerfil({ activeTimer: t })) toast(`Cronómetro en marcha: ${destinoDe(c, t)}`);
  };

  const proyectoDe = (v: Entregable) => c.projects.find((p) => p.id === v.projectId);

  const acc: AccionesTrabajo = {
    cronometro,
    iniciar,
    parar: () => parar(),
    elegirYEmpezar: () => setEligiendo(true),
    abrirBrief: (p) => setBrief(p.id),
    enviarBrief: async (p) => {
      if (await actualizar('projects', p.id, { brief: { ...briefDe(p), status: 'enviado', sentDate: hoy } }))
        toast('Briefing marcado como enviado. Cuando llegue el portal del cliente (Fase 4), lo rellenará allí.');
    },
    enviarVersion: async (v) => {
      const ch = enviarVersion(v, hoy);
      if (await actualizar('deliverables', v.id, ch)) toast(`Versión ${ch.versions!.length} enviada. Queda «Esperando al cliente»`);
    },
    pedirCambios: (v) => setCambios(v.id),
    aprobar: async (v) => {
      // Automatización «approved»: si era el último, el proyecto queda entregado con su factura final en borrador.
      const r = await alAprobar(v, ejecutor.contexto(), ejecutor.ej);
      toast(r === 'proyecto-entregado' ? 'Todo aprobado: proyecto entregado y factura final preparada' : `«${v.name}» aprobado`);
    },
    cobrarRondas: async (v) => {
      const p = proyectoDe(v);
      const cobro = cobroDeRondas(v, p, ajustes.extraRound);
      if (!cobro) return;
      const persona = c.contacts.find((x) => x.id === p?.contactId);
      const id = await dinero.anadirAlBorrador({ companyId: persona?.companyId ?? null, contactId: persona?.id ?? null, projectId: p?.id ?? null, linea: cobro.linea });
      if (!id) return;
      await actualizar('deliverables', v.id, { billedExtra: cobro.billedExtra });
      toast(`Añadido a un borrador de factura (${eur(cobro.linea.qty * cobro.linea.price)})`, { label: 'Ver factura', fn: () => dinero.ver(id) });
    },
    cobrarHorasDeMas: async (r) => {
      const extra = horasDeMas(c, r, hoy);
      if (!extra) return;
      const id = await dinero.anadirAlBorrador({ companyId: r.companyId, contactId: r.contactId, linea: { desc: `Horas extra de ${nombreMes(hoy)} · ${r.name}`, qty: extra, price: ajustes.rate } });
      if (!id) return;
      await actualizar('retainers', r.id, { extraBilled: mesDe(hoy) });
      toast(`${horas(extra * 60)} de más añadidas a un borrador de factura`, { label: 'Ver factura', fn: () => dinero.ver(id) });
    },
  };

  const pBrief = c.projects.find((p) => p.id === brief);
  const vCambios = c.deliverables.find((v) => v.id === cambios);
  return (
    <Ctx value={acc}>
      {children}
      {eligiendo && <ElegirCronometro alCerrar={() => setEligiendo(false)} alEmpezar={(o) => void iniciar(o)} />}
      {pBrief && <VentanaBrief p={pBrief} alCerrar={() => setBrief(null)} />}
      {vCambios && <VentanaCambios v={vCambios} alCerrar={() => setCambios(null)} />}
    </Ctx>
  );
}

function ElegirCronometro({ alCerrar, alEmpezar }: { alCerrar: () => void; alEmpezar: (o: Partial<Cronometro>) => void }) {
  const { c } = useDatos();
  const [destino, setDestino] = useState(() => {
    const p = c.projects.find((x) => x.status !== 'entregado' && x.status !== 'pausa');
    return p ? `p:${p.id}` : 'i:';
  });
  const [nota, setNota] = useState('');
  return (
    <Modal
      titulo="¿En qué vas a trabajar?"
      alCerrar={alCerrar}
      ancho={480}
      comoFormulario={() => {
        const [t, id] = destino.split(':');
        alCerrar();
        alEmpezar({ projectId: t === 'p' ? id : null, retainerId: t === 'r' ? id : null, note: nota.trim().slice(0, 300) });
      }}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn primary">
            <Icono n="play" />
            Empezar
          </button>
        </>
      }
    >
      <div className="modal-b">
        <label className="field full">
          <span>Proyecto o iguala</span>
          <select className="input" data-autofocus value={destino} onChange={(e) => setDestino(e.target.value)}>
            <optgroup label="Proyectos">
              {c.projects
                .filter((p) => p.status !== 'entregado' && p.status !== 'pausa')
                .map((p) => (
                  <option key={p.id} value={`p:${p.id}`}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Igualas">
              {c.retainers
                .filter((r) => r.active)
                .map((r) => (
                  <option key={r.id} value={`r:${r.id}`}>
                    {r.name} · {c.companies.find((e) => e.id === r.companyId)?.name ?? ''}
                  </option>
                ))}
            </optgroup>
            <option value="i:">Trabajo interno (administración, ventas…)</option>
          </select>
        </label>
        <label className="field full">
          <span>¿Qué vas a hacer? (opcional)</span>
          <input className="input" value={nota} maxLength={300} placeholder="p. ej. Diseño de la home" onChange={(e) => setNota(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

/** Briefing: preguntas comunes + las de su disciplina. */
function VentanaBrief({ p, alCerrar }: { p: Proyecto; alCerrar: () => void }) {
  const { actualizar } = useDatos();
  const toast = useToast();
  const b = briefDe(p);
  const qs = preguntasBrief(p.discipline);
  const [r, setR] = useState<Record<string, string>>(() => ({ ...b.answers }));
  const guardar = async (completo: boolean) => {
    const answers = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.trim().slice(0, 2000)]).filter(([, v]) => v));
    const status = completo ? 'completado' : b.status;
    if (await actualizar('projects', p.id, { brief: { ...b, answers, status } })) {
      alCerrar();
      toast(completo ? 'Briefing completado' : 'Briefing guardado');
    }
  };
  return (
    <Modal
      titulo={`Briefing · ${p.name}`}
      alCerrar={alCerrar}
      ancho={860}
      comoFormulario={() => void guardar(false)}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn">
            Guardar
          </button>
          <button type="button" className="btn primary" onClick={() => void guardar(true)}>
            Guardar y dar por completo
          </button>
        </>
      }
    >
      <div className="modal-b">
        <p className="muted full" style={{ margin: 0 }}>
          Preguntas para {p.discipline ? DISCIPLINAS[p.discipline].label.toLowerCase() : 'el proyecto'}. Deja en blanco lo que no sepas todavía.
        </p>
        {qs.map(([k, q], i) => (
          <label className="field" key={k}>
            <span>{q}</span>
            <textarea className="input" rows={2} maxLength={2000} data-autofocus={i === 0 || undefined} value={r[k] ?? ''} onChange={(e) => setR((x) => ({ ...x, [k]: e.target.value }))} />
          </label>
        ))}
      </div>
    </Modal>
  );
}

/** «¿Qué cambios pide?»: añade una ronda y avisa si ya es extra. */
function VentanaCambios({ v, alCerrar }: { v: Entregable; alCerrar: () => void }) {
  const { c, hoy, actualizar } = useDatos();
  const { ajustes } = useNebula();
  const toast = useToast();
  const t = useTrabajo();
  const p = c.projects.find((x) => x.id === v.projectId);
  const r = rondasDe(v, p);
  const [texto, setTexto] = useState('');
  const guardar = async () => {
    const ch = pedirCambios(v, texto, hoy);
    if (!(await actualizar('deliverables', v.id, ch))) return;
    alCerrar();
    const despues = rondasDe({ ...v, ...ch }, p);
    if (despues.porCobrar > 0) toast('Ronda extra: no estaba incluida en el presupuesto', { label: 'Cobrarla', fn: () => void t.cobrarRondas({ ...v, ...ch }) });
    else toast('Cambios apuntados');
  };
  return (
    <Modal
      titulo="¿Qué cambios pide?"
      alCerrar={alCerrar}
      ancho={520}
      comoFormulario={() => void guardar()}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn primary">
            Guardar cambios pedidos
          </button>
        </>
      }
    >
      <div className="modal-b block">
        {r.usadas >= r.incluidas ? (
          <div className="warn rose">
            Esta será la ronda {r.usadas + 1} y el presupuesto incluía {r.incluidas}. Podrás cobrarla aparte ({eur(ajustes.extraRound)}). <Ayuda k="rondas" />
          </div>
        ) : (
          <div className="warn mist">
            Ronda {r.usadas + 1} de {r.incluidas} incluidas en el presupuesto.
          </div>
        )}
        <textarea className="input" data-autofocus rows={4} maxLength={1000} value={texto} placeholder="p. ej. Cambiar la foto principal y acortar el titular" onChange={(e) => setTexto(e.target.value)} />
        {v.sentAt && <p className="muted" style={{ margin: 0 }}>Enviado {relativa(v.sentAt, hoy).toLowerCase()}.</p>}
      </div>
    </Modal>
  );
}
