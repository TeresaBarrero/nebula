'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CUADRANTES, FASES_ABIERTAS, FASES_OPORTUNIDAD, FASES_PROYECTO } from '@/lib/catalogos/crm';
import { eur } from '@/lib/reglas/dinero';
import { cifrasFacturas, resumenFiscal } from '@/lib/reglas/facturas';
import { diasHasta, relativa } from '@/lib/reglas/fechas';
import { ingresosFijos } from '@/lib/reglas/recurrentes';
import { empresaDe } from '@/lib/reglas/historial';
import { cifrasOportunidades, enMarcha } from '@/lib/reglas/proyectos';
import { leerTareaRapida } from '@/lib/reglas/tareaRapida';
import { cuadranteDe } from '@/lib/reglas/tareas';
import { fechaLarga, saludo } from '@/lib/reglas/textos';
import { tareaNueva } from '@/components/app/acciones';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { useNebula } from '@/components/app/Nebula';
import { BarraFases, FilaTarea, Pill } from '@/components/crm/comunes';
import { FilaReunion } from '@/components/crm/FilaReunion';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Inicio: saludo, tarea rápida y lo importante del día (SPEC §6.2). */
export default function Inicio() {
  const { perfil } = useNebula();
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const ahora = new Date();

  const paraHoy = c.tasks.filter((t) => !t.done && t.due && t.due <= hoy).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));
  const reunionesHoy = c.events.filter((e) => e.date === hoy);
  const proximas = c.events
    .filter((e) => diasHasta(e.date, hoy) >= 0 && diasHasta(e.date, hoy) <= 10)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 4);
  const esperando = c.deliverables
    .filter((d) => d.status === 'enviado')
    .map((d) => ({ d, dias: d.sentAt ? -diasHasta(d.sentAt, hoy) : 0, p: c.projects.find((p) => p.id === d.projectId) }))
    .sort((a, b) => b.dias - a.dias);
  const activos = c.projects.filter(enMarcha).sort((a, b) => (a.end ?? '9').localeCompare(b.end ?? '9'));
  const probables = c.deals
    .filter((d) => FASES_ABIERTAS.includes(d.stage))
    .sort((a, b) => b.value * b.prob - a.value * a.prob)
    .slice(0, 3);
  const fijadas = c.notes.filter((n) => n.pinned);
  const k = cifrasOportunidades(c.deals, hoy);
  const kf = cifrasFacturas(c, hoy);
  const fiscal = resumenFiscal(c, hoy);

  return (
    <>
      <Cabecera antetitulo={fechaLarga(ahora)} titulo={`${saludo(ahora.getHours())}, ${perfil.name || 'hola'}`} className="hello">
        Tienes <b>{plural(paraHoy.length, 'tarea', 'tareas')}</b> para hoy, <b>{plural(reunionesHoy.length, 'reunión', 'reuniones')}</b>
        {esperando.length > 0 && (
          <>
            {' '}
            y <b>{esperando.length}</b> {esperando.length === 1 ? 'cosa esperando' : 'cosas esperando'} respuesta del cliente
          </>
        )}
        .
      </Cabecera>

      <TareaRapida />

      <div className="stats">
        <Link className="stat butter" href="/facturas">
          <span className="k">Te deben</span>
          <span className="v num">{eur(kf.teDeben)}</span>
          <span className="s">{kf.fueraDePlazo ? `${eur(kf.fueraDePlazo)} fuera de plazo` : 'Todo dentro de plazo'}</span>
        </Link>
        <Link className="stat lilac" href="/igualas">
          <span className="k">
            Igualas al mes <Ayuda k="iguala" />
          </span>
          <span className="v num">{eur(ingresosFijos(c.retainers))}</span>
          <span className="s">{plural(c.retainers.filter((r) => r.active).length, 'cliente con cuota fija', 'clientes con cuota fija')}</span>
        </Link>
        <Link className="stat sage" href="/informes">
          <span className="k">
            Has ganado este trimestre <Ayuda k="rendimiento" />
          </span>
          <span className="v num">{eur(fiscal.rendimiento)}</span>
          <span className="s">
            {eur(fiscal.ingresos)} facturado − {eur(fiscal.gastos)} gastos
          </span>
        </Link>
        <Link className="stat peach" href="/oportunidades">
          <span className="k">
            Lo que probablemente cerrarás <Ayuda k="prevision" />
          </span>
          <span className="v num">{eur(k.ponderado)}</span>
          <span className="s">De {eur(k.enJuego)} en juego</span>
        </Link>
      </div>

      <div className="grid g-home">
        <div className="stack">
          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="flag" />
                Para hoy
              </h2>
              <Link href="/tareas">Ver todas</Link>
            </div>
            <div className="list">
              {paraHoy.map((t) => (
                <FilaTarea key={t.id} t={t} punto />
              ))}
              {!paraHoy.length && <div className="empty">Nada pendiente para hoy. ¡Buen trabajo!</div>}
            </div>
          </section>
          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="send" />
                Esperando al cliente
              </h2>
            </div>
            <p className="muted" style={{ margin: '-4px 0 6px', fontSize: 12.5 }}>
              Entregables que has enviado y aún no tienen respuesta.
            </p>
            <div className="list">
              {esperando.map(({ d, dias, p }) => (
                <Link key={d.id} className="follow enlace-fila" href={`/proyectos?p=${d.projectId}`}>
                  <span className="tl-ic butter">
                    <Icono n="send" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{d.name}</b>
                    <div className="chip">{p?.name}</div>
                  </div>
                  <span className={`chip ${dias >= 5 ? 'late' : ''}`}>{dias ? `hace ${plural(dias, 'día', 'días')}` : 'hoy'}</span>
                </Link>
              ))}
              {!esperando.length && <div className="empty">No esperas respuesta de nadie.</div>}
            </div>
          </section>
          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="folder" />
                Proyectos en marcha
              </h2>
              <Link href="/proyectos">Ver proyectos</Link>
            </div>
            <div className="list">
              {activos.map((p) => {
                const ct = c.contacts.find((x) => x.id === p.contactId);
                return (
                  <Link className="proj-mini" key={p.id} href={`/proyectos?p=${p.id}`}>
                    <div className="row">
                      <b>{p.name}</b>
                      <Pill cls={FASES_PROYECTO[p.status].cls}>{FASES_PROYECTO[p.status].label}</Pill>
                    </div>
                    <BarraFases p={p} />
                    <div className="row">
                      <span className="chip">{empresaDe(c, ct) || ct?.name || 'Sin cliente'}</span>
                      <span className="chip num">{p.end ? `Entrega ${relativa(p.end, hoy).toLowerCase()}` : 'Sin fecha de entrega'}</span>
                    </div>
                  </Link>
                );
              })}
              {!activos.length && (
                <div className="empty">
                  No tienes proyectos en marcha.{' '}
                  <button type="button" className="text-link" onClick={() => abrir('project')}>
                    Crear uno
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
        <div className="stack">
          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="calendar" />
                Próximas reuniones
              </h2>
              <Link href="/calendario">Calendario</Link>
            </div>
            <div className="list">
              {proximas.map((e) => (
                <FilaReunion key={e.id} e={e} />
              ))}
              {!proximas.length && <div className="empty">Sin reuniones próximas.</div>}
            </div>
          </section>
          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="funnel" />
                Oportunidades más probables
              </h2>
              <Link href="/oportunidades">Ver todas</Link>
            </div>
            <div className="list">
              {probables.map((d) => (
                <button type="button" key={d.id} className="follow fila-boton" onClick={() => abrir('deal', { id: d.id })}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{d.title}</b>
                    <div className="chip">
                      {FASES_OPORTUNIDAD[d.stage].label}
                      {d.expected ? ` · decisión ${relativa(d.expected, hoy).toLowerCase()}` : ''}
                    </div>
                  </div>
                  <b className="num">{eur(d.value)}</b>
                </button>
              ))}
              {!probables.length && <div className="empty">No hay oportunidades abiertas.</div>}
            </div>
          </section>
          {fijadas.length > 0 && (
            <section className="card">
              <div className="card-h">
                <h2>
                  <Icono n="note" />
                  Notas fijadas
                </h2>
                <Link href="/notas">Ver notas</Link>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {fijadas.map((n) => (
                  <button type="button" key={n.id} className={`note ${n.color}`} style={{ textAlign: 'left', width: '100%', whiteSpace: 'pre-wrap' }} onClick={() => abrir('note', { id: n.id })}>
                    {n.text}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

/** Tarea rápida en lenguaje natural con vista previa (SPEC §7.10). */
function TareaRapida() {
  const { c, hoy, crear } = useDatos();
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const r = texto.trim() ? leerTareaRapida(texto, hoy, c.contacts, c.projects) : null;
  const q = r ? CUADRANTES[cuadranteDe(r)] : null;

  const crearla = async () => {
    if (!r?.title) return;
    const ok = await crear('tasks', tareaNueva({ title: r.title.slice(0, 300), due: r.due, urgent: r.urgent, important: r.important, contactId: r.contactId, projectId: r.projectId }));
    if (ok) {
      setTexto('');
      toast('Tarea creada');
    }
  };

  return (
    <form
      className="card quick"
      onSubmit={(e) => {
        e.preventDefault();
        void crearla();
      }}
    >
      <div className="quick-row">
        <input
          className="input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe una tarea… p. ej. «Llamar a @Lucía mañana urgente»"
          aria-label="Crear tarea rápida"
          aria-describedby="quick-hint"
          maxLength={300}
        />
        <button type="submit" className="btn primary">
          <Icono n="plus" />
          Crear tarea
        </button>
      </div>
      <div className="quick-hint" id="quick-hint" aria-live="polite">
        {r && q ? (
          <>
            Se creará: <b style={{ color: 'var(--fg)' }}>{r.title || '…'}</b>
            {r.due && (
              <span className="pill mist">
                <Icono n="clock" />
                {relativa(r.due, hoy)}
              </span>
            )}
            <span className={`pill ${q.cls}`}>{q.label}</span>
            {r.contactId && <span className="pill sage">{c.contacts.find((x) => x.id === r.contactId)?.name}</span>}
            {r.projectId && <span className="pill butter">{c.projects.find((x) => x.id === r.projectId)?.name}</span>}
          </>
        ) : (
          <>
            Atajos: <code>hoy</code> <code>mañana</code> <code>viernes</code> para la fecha · <code>urgente</code> <code>importante</code> · <code>@contacto</code> · <code>#proyecto</code>
          </>
        )}
      </div>
    </form>
  );
}
