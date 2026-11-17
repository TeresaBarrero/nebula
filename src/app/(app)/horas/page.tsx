'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DISPONIBILIDAD } from '@/lib/catalogos/crm';
import type { Id } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { aFecha, fechaCorta, lunesDe, relativa, sumarDias } from '@/lib/reglas/fechas';
import { enMarcha } from '@/lib/reglas/proyectos';
import { capacidadDe, cargaDe, colorCarga, destinoDe, duracion, eurHoraReal, horas, horasProyecto, hueco, minutos, minutosIguala, semanas } from '@/lib/reglas/trabajo';
import { iniciales } from '@/lib/reglas/textos';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { useNebula } from '@/components/app/Nebula';
import { Avatar } from '@/components/crm/comunes';
import { useTrabajo } from '@/components/trabajo/Trabajo';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const diaLargo = (f: string) => mayuscula(new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(aFecha(f)));
const COLOR = { ok: 'var(--sage-strong)', casi: 'var(--peach-strong)', pasa: 'var(--danger)' };

/** Horas y carga (SPEC §6.8 y §7.8). */
export default function HorasYCarga() {
  const [pestana, setPestana] = useState<'horas' | 'carga'>('horas');
  const abrir = useFormularios();
  const t = useTrabajo();
  return (
    <>
      <Cabecera
        antetitulo="Trabajo"
        titulo="Horas y carga"
        acciones={
          <>
            <button type="button" className="btn" onClick={() => abrir('time')}>
              <Icono n="plus" />
              Apuntar horas
            </button>
            {!t.cronometro && (
              <button type="button" className="btn primary" onClick={t.elegirYEmpezar}>
                <Icono n="play" />
                Iniciar cronómetro
              </button>
            )}
          </>
        }
      >
        {pestana === 'horas'
          ? 'Usa el cronómetro de arriba o apunta las horas a mano. Así sabrás cuánto ganas de verdad por hora en cada proyecto.'
          : 'Cuántas horas tienes comprometidas las próximas semanas, tú y tus colaboradores, según las tareas con fecha y sus horas estimadas.'}
      </Cabecera>
      <div className="seg" role="group" aria-label="Qué ver" style={{ alignSelf: 'flex-start' }}>
        <button type="button" className={pestana === 'horas' ? 'on' : ''} aria-pressed={pestana === 'horas'} onClick={() => setPestana('horas')}>
          <Icono n="timer" />
          Horas trabajadas
        </button>
        <button type="button" className={pestana === 'carga' ? 'on' : ''} aria-pressed={pestana === 'carga'} onClick={() => setPestana('carga')}>
          <Icono n="layers" />
          Carga de trabajo
        </button>
      </div>
      {pestana === 'horas' ? <Horas /> : <Carga />}
    </>
  );
}

function Horas() {
  const { c, hoy } = useDatos();
  const { ajustes } = useNebula();
  const abrir = useFormularios();
  const lunes = lunesDe(hoy);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(lunes, i);
    return { f, min: minutos(c.timeEntries, (e) => e.date === f), letra: ['L', 'M', 'X', 'J', 'V', 'S', 'D'][i] };
  });
  const semana = dias.reduce((a, d) => a + d.min, 0);
  const paraClientes = minutos(c.timeEntries, (e) => e.billable && e.date >= lunes && e.date <= sumarDias(lunes, 6));
  const maxDia = Math.max(240, ...dias.map((d) => d.min));
  const eurh = eurHoraReal(c, hoy);
  const activas = c.retainers.filter((r) => r.active);
  const recientes = c.timeEntries.filter((e) => e.date >= sumarDias(hoy, -13) && e.date <= hoy).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const porDia = [...recientes.reduce((m, e) => m.set(e.date, [...(m.get(e.date) ?? []), e]), new Map<string, typeof recientes>())];
  const proyectos = c.projects.filter((p) => enMarcha(p) || c.timeEntries.some((e) => e.projectId === p.id && e.date > sumarDias(hoy, -30)));

  return (
    <>
      <div className="stats">
        <div className="stat peach">
          <span className="k">Esta semana</span>
          <span className="v num">{horas(semana)}</span>
          <span className="s">{horas(paraClientes)} para clientes</span>
        </div>
        <div className="stat sage">
          <span className="k">
            Precio por hora real <Ayuda k="eurh" />
          </span>
          <span className="v num">{eurh ? eur(eurh) : '—'}</span>
          <span className="s">Últimos 6 meses · tu tarifa: {eur(ajustes.rate)}/h</span>
        </div>
        <div className="stat lilac">
          <span className="k">Horas de igualas este mes</span>
          <span className="v num">{horas(activas.reduce((a, r) => a + minutosIguala(c, r, hoy), 0))}</span>
          <span className="s">de {activas.reduce((a, r) => a + r.hours, 0)} h incluidas</span>
        </div>
        <div className="stat butter">
          <span className="k">Trabajo interno · 30 días</span>
          <span className="v num">{horas(minutos(c.timeEntries, (e) => !e.billable && e.date > sumarDias(hoy, -30)))}</span>
          <span className="s">Administración, ventas, formación</span>
        </div>
      </div>
      <div className="grid g-rep">
        <section className="card">
          <div className="card-h">
            <h2>Esta semana</h2>
            <span className="chip num">{horas(semana)}</span>
          </div>
          <div className="week" role="img" aria-label={dias.map((d) => `${diaLargo(d.f)}: ${horas(d.min)}`).join('; ')}>
            {dias.map((d) => (
              <div key={d.f} className={`col ${d.f === hoy ? 'today' : ''}`}>
                <span className="chip num">{d.min ? horas(d.min) : ''}</span>
                <div className="bar" style={{ height: `${Math.max(2, (d.min / maxDia) * 100)}%` }} />
                <b>{d.letra}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-h">
            <h2>Horas por proyecto</h2>
          </div>
          <div className="hbar">
            {proyectos.map((p) => {
              const h = horasProyecto(c, p);
              return (
                <Link key={p.id} href={`/proyectos?p=${p.id}`} className="row enlace-fila" style={{ gridTemplateColumns: 'minmax(0,1fr) 90px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 4 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span className="num muted">
                        {horas(h.min).replace(' h', '')}/{p.hoursBudget || '—'} h
                      </span>
                    </div>
                    <div className="track">
                      <i style={{ width: `${Math.min(100, h.pct)}%`, background: h.sePasa ? 'var(--danger)' : 'var(--sage-strong)' }} />
                    </div>
                  </div>
                  <b className="num" style={{ textAlign: 'right', color: h.eurh && h.eurh < ajustes.rate ? 'var(--danger)' : 'inherit' }}>
                    {h.eurh ? `${eur(h.eurh)}/h` : '—'}
                  </b>
                </Link>
              );
            })}
            {!proyectos.length && <div className="empty">Sin proyectos en marcha.</div>}
          </div>
          <p className="foot-note">A la derecha, lo que estás ganando por hora en cada proyecto con lo facturado hasta ahora (en rojo si es menos que tu tarifa).</p>
        </section>
      </div>
      <section className="card">
        <div className="card-h">
          <h2>Últimas dos semanas</h2>
        </div>
        {porDia.map(([d, es]) => (
          <div key={d}>
            <div className="day-h">
              <b>{diaLargo(d)}</b>
              <span className="num">{horas(minutos(es ?? []))}</span>
            </div>
            <div className="list">
              {(es ?? []).map((e) => (
                <button type="button" key={e.id} className="follow fila-boton" onClick={() => abrir('time', { id: e.id })}>
                  <span className="sdot" style={{ background: e.billable ? 'var(--sage-strong)' : 'var(--faint)' }} title={e.billable ? 'Para cliente' : 'Interno'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{destinoDe(c, e)}</b>
                    <div className="chip">{e.note}</div>
                  </div>
                  <b className="num">{duracion(e.minutes)}</b>
                </button>
              ))}
            </div>
          </div>
        ))}
        {!porDia.length && <div className="empty">Aún no has apuntado horas estas dos semanas.</div>}
      </section>
    </>
  );
}

function Carga() {
  const { c, hoy } = useDatos();
  const { perfil, ajustes } = useNebula();
  const abrir = useFormularios();
  const ss = semanas(hoy);
  const [sel, setSel] = useState<{ persona: Id | null; semana: number } | null>(null);
  const [necesito, setNecesito] = useState('10');
  const personas = [{ id: null as Id | null, nombre: 'Tú', x: null }, ...c.contacts.filter((x) => x.type === 'Colaborador').map((x) => ({ id: x.id as Id | null, nombre: x.name, x }))];
  const n = Math.max(0, Number(necesito.replace(',', '.')) || 0);
  const h = hueco(c, n, hoy, ajustes.capacity);
  const elegida = sel ? cargaDe(c, sel.persona, ss[sel.semana]) : null;
  const horasIgualas = c.retainers.filter((r) => r.active).reduce((a, r) => a + r.hours, 0) / 4.3;

  return (
    <>
      <section className="card">
        <div className="card-h">
          <h2>Próximas 4 semanas</h2>
          <div className="legend">
            <span>
              <i style={{ background: COLOR.ok }} />
              Con hueco
            </span>
            <span>
              <i style={{ background: COLOR.casi }} />
              Casi lleno
            </span>
            <span>
              <i style={{ background: COLOR.pasa }} />
              Te pasas
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="wl">
            <thead>
              <tr>
                <th>Persona</th>
                {ss.map((s) => (
                  <th key={s.i}>Semana del {fechaCorta(s.a)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personas.map((p) => {
                const cap = capacidadDe(p.x, ajustes.capacity);
                return (
                  <tr key={p.id ?? 'yo'} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {p.id ? (
                          <Avatar id={p.id} nombre={p.nombre} />
                        ) : (
                          <span className="avatar peach" aria-hidden="true">
                            {iniciales(perfil.fullName || perfil.name)}
                          </span>
                        )}
                        <div>
                          <b>{p.nombre}</b>
                          <div className="chip">
                            {cap} h/semana{p.x ? ` · ${DISPONIBILIDAD[p.x.availability ?? 'disponible'].label.toLowerCase()}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    {ss.map((s) => {
                      const l = cargaDe(c, p.id, s);
                      const r = cap ? l.h / cap : l.h ? 2 : 0;
                      const on = sel?.persona === p.id && sel?.semana === s.i;
                      return (
                        <td key={s.i}>
                          <button
                            type="button"
                            className={`wl-cell ${on ? 'on' : ''}`}
                            aria-pressed={on}
                            aria-label={`${p.nombre}, semana del ${fechaCorta(s.a)}: ${l.h} de ${cap} horas`}
                            onClick={() => setSel(on ? null : { persona: p.id, semana: s.i })}
                          >
                            <span className="num">
                              {String(l.h).replace('.', ',')} h <small>de {cap}</small>
                            </span>
                            <span className="track">
                              <i style={{ width: `${Math.min(100, r * 100)}%`, background: COLOR[colorCarga(l.h, cap)] }} />
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sel && elegida ? (
          <>
            <div className="sec-lbl">
              {sel.persona ? c.contacts.find((x) => x.id === sel.persona)?.name : 'Tú'} · semana del {fechaCorta(ss[sel.semana].a)}
            </div>
            <div className="list">
              {elegida.tareas.map((t) => (
                <button type="button" key={t.id} className="follow fila-boton" onClick={() => abrir('task', { id: t.id })}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{t.title}</b>
                    <div className="chip">
                      {relativa(t.due, hoy)}
                      {t.projectId ? ` · ${c.projects.find((p) => p.id === t.projectId)?.name ?? ''}` : ''}
                    </div>
                  </div>
                  <b className="num">{t.estimate} h</b>
                </button>
              ))}
              {!elegida.tareas.length && <div className="empty">Sin tareas con fecha esta semana.</div>}
              {!sel.persona && horasIgualas > 0 && <div className="chip" style={{ padding: '8px 4px' }}>+ {horas(horasIgualas * 60)} de igualas a la semana</div>}
            </div>
          </>
        ) : (
          <p className="foot-note">Pulsa una celda para ver sus tareas. Las horas de tus igualas se reparten entre las semanas.</p>
        )}
      </section>
      <section className="card">
        <div className="card-h">
          <h2>
            <Icono n="spark" />
            ¿Puedes aceptar un proyecto nuevo?
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Necesitaría</span>
          <input className="input num" type="number" min="0" step="1" inputMode="decimal" value={necesito} onChange={(e) => setNecesito(e.target.value)} style={{ width: 90 }} aria-label="Horas por semana" />
          <span>horas a la semana.</span>
        </div>
        <div className={`warn ${h.primera ? 'sage' : 'rose'}`} style={{ marginTop: 12 }} aria-live="polite">
          {h.primera
            ? h.primera.s.i === 0
              ? `Sí: esta semana tienes ${Math.round(h.primera.libres)} h libres.`
              : `Tienes hueco a partir de la semana del ${fechaCorta(h.primera.s.a)} (${Math.round(h.primera.libres)} h libres).`
            : `En las próximas 4 semanas no tienes ${n} h libres a la semana.`}
          {h.ayudantes.length > 0 && (
            <>
              {' '}
              Puedes apoyarte en{' '}
              {h.ayudantes.map((a, i) => (
                <span key={a.x.id}>
                  {i > 0 ? ', ' : ''}
                  <b>{a.x.name}</b> ({Math.round(a.libres)} h libres)
                </span>
              ))}
              .
            </>
          )}
        </div>
        <p className="foot-note">Tu capacidad ({ajustes.capacity} h/semana) se cambia en Perfil.</p>
      </section>
    </>
  );
}
