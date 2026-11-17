'use client';

import { useState } from 'react';
import { CANALES, ESTADOS_PUBLICACION } from '@/lib/catalogos/trabajo';
import type { EstadoPublicacion } from '@/lib/datos/entidades';
import { diasDelMes, moverMes } from '@/lib/reglas/calendario';
import { aFecha, diasHasta } from '@/lib/reglas/fechas';
import { cifrasContenidos } from '@/lib/reglas/trabajo';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';
import { TarjetaPublicacion } from '@/components/trabajo/TarjetaPublicacion';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ESTADOS = Object.keys(ESTADOS_PUBLICACION) as EstadoPublicacion[];
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const tituloMes = (anio: number, mes: number) => mayuscula(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(anio, mes, 1)));
const tituloDia = (f: string) => mayuscula(new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(aFecha(f)));

/** Contenidos: calendario y tablero por estados de las publicaciones de cada cliente y de tu marca (SPEC §6.9). */
export default function Contenidos() {
  const { c, hoy, actualizar } = useDatos();
  const abrir = useFormularios();
  const toast = useToast();
  const [vista, setVista] = useState<'cal' | 'tablero'>('cal');
  const [cliente, setCliente] = useState('all');
  const [canal, setCanal] = useState('all');
  const [sel, setSel] = useState(hoy);
  const [mes, setMes] = useState(() => ({ anio: aFecha(hoy).getFullYear(), mes: aFecha(hoy).getMonth() }));
  const [encima, setEncima] = useState<EstadoPublicacion | null>(null);
  const k = cifrasContenidos(c, hoy);

  const lista = c.posts.filter((p) => (cliente === 'all' || (p.companyId ?? 'mia') === cliente) && (canal === 'all' || p.channel === canal));
  const clientes = [...new Set(c.posts.map((p) => p.companyId ?? 'mia'))];
  const delDia = (f: string) => lista.filter((p) => p.date === f).sort((a, b) => a.time.localeCompare(b.time));

  const soltar = (e: React.DragEvent, estado: EstadoPublicacion) => {
    e.preventDefault();
    setEncima(null);
    const p = c.posts.find((x) => x.id === e.dataTransfer.getData('text/plain'));
    if (p && p.status !== estado) void actualizar('posts', p.id, { status: estado }).then((ok) => ok && toast(`«${p.title}»: ${ESTADOS_PUBLICACION[estado].label.toLowerCase()}`));
  };

  return (
    <>
      <Cabecera
        antetitulo="Comunicación interna y externa"
        titulo="Contenidos"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir('post', { date: sel })}>
            <Icono n="plus" />
            Nueva publicación
          </button>
        }
      >
        Planifica publicaciones, newsletters, notas de prensa y comunicación interna de cada cliente y de tu propia marca.
      </Cabecera>
      <div className="stats">
        <div className="stat peach">
          <span className="k">Esta semana</span>
          <span className="v num">{k.semana}</span>
          <span className="s">{k.programadas} ya programadas</span>
        </div>
        <div className="stat butter">
          <span className="k">Las revisa el cliente</span>
          <span className="v num">{k.revision}</span>
          <span className="s">Pendientes de su visto bueno</span>
        </div>
        <div className={`stat ${k.sinProgramar ? 'rose' : 'sage'}`}>
          <span className="k">Hoy y mañana sin programar</span>
          <span className="v num">{k.sinProgramar}</span>
          <span className="s">{k.sinProgramar ? 'Revísalas cuanto antes' : 'Todo listo'}</span>
        </div>
        <div className="stat lilac">
          <span className="k">Ideas guardadas</span>
          <span className="v num">{k.ideas}</span>
          <span className="s">Para cuando falte contenido</span>
        </div>
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Vista">
          <button type="button" className={vista === 'cal' ? 'on' : ''} aria-pressed={vista === 'cal'} onClick={() => setVista('cal')}>
            <Icono n="calendar" />
            Calendario
          </button>
          <button type="button" className={vista === 'tablero' ? 'on' : ''} aria-pressed={vista === 'tablero'} onClick={() => setVista('tablero')}>
            <Icono n="layers" />
            Por estado
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 'auto' }} value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Cliente">
            <option value="all">Todos los clientes</option>
            {clientes.map((id) => (
              <option key={id} value={id}>
                {id === 'mia' ? 'Mi marca' : (c.companies.find((e) => e.id === id)?.name ?? '—')}
              </option>
            ))}
          </select>
          <select className="input" style={{ width: 'auto' }} value={canal} onChange={(e) => setCanal(e.target.value)} aria-label="Canal">
            <option value="all">Todos los canales</option>
            {Object.entries(CANALES).map(([id, x]) => (
              <option key={id} value={id}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {vista === 'tablero' ? (
        <>
          <div className="kanban">
            {ESTADOS.map((st) => {
              const l = lista.filter((p) => p.status === st && (st !== 'publicado' || diasHasta(p.date, hoy) > -14)).sort((a, b) => a.date.localeCompare(b.date));
              const S = ESTADOS_PUBLICACION[st];
              return (
                <section
                  key={st}
                  className={`kcol ${S.cls} ${encima === st ? 'over' : ''}`}
                  aria-label={S.label}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (encima !== st) setEncima(st);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setEncima(null);
                  }}
                  onDrop={(e) => soltar(e, st)}
                >
                  <div className="kcol-h">
                    <b>{S.label}</b>
                    <span>{l.length}</span>
                  </div>
                  {l.map((p) => (
                    <TarjetaPublicacion key={p.id} p={p} arrastrable />
                  ))}
                  {!l.length && <div className="empty">Suelta aquí</div>}
                </section>
              );
            })}
          </div>
          <p className="foot-note">«Publicada» muestra las de las dos últimas semanas. En el móvil, abre la publicación y cambia su estado.</p>
        </>
      ) : (
        <div className="cal-wrap">
          <section className="card cal">
            <div className="cal-head">
              <h2>{tituloMes(mes.anio, mes.mes)}</h2>
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  setSel(hoy);
                  setMes({ anio: aFecha(hoy).getFullYear(), mes: aFecha(hoy).getMonth() });
                }}
              >
                Hoy
              </button>
              <button type="button" className="icon-btn" aria-label="Mes anterior" onClick={() => setMes(moverMes(mes.anio, mes.mes, -1))}>
                <Icono n="left" />
              </button>
              <button type="button" className="icon-btn" aria-label="Mes siguiente" onClick={() => setMes(moverMes(mes.anio, mes.mes, 1))}>
                <Icono n="right" />
              </button>
            </div>
            <div className="cal-grid">
              {DIAS_SEMANA.map((d) => (
                <div className="cal-dow" key={d}>
                  {d}
                </div>
              ))}
              {diasDelMes(mes.anio, mes.mes).map(({ fecha, delMes }) => {
                const it = delDia(fecha);
                return (
                  <button
                    type="button"
                    key={fecha}
                    className={`cal-cell ${delMes ? '' : 'out'} ${fecha === hoy ? 'today' : ''} ${fecha === sel ? 'sel' : ''}`}
                    aria-label={`${tituloDia(fecha)}, ${it.length} ${it.length === 1 ? 'publicación' : 'publicaciones'}`}
                    aria-pressed={fecha === sel}
                    onClick={() => setSel(fecha)}
                  >
                    <span className="dn">{aFecha(fecha).getDate()}</span>
                    {it.slice(0, 3).map((p) => (
                      <span key={p.id} className={`cal-chip ${CANALES[p.channel].cls}`}>
                        {CANALES[p.channel].label.split(' ')[0]} · {p.title}
                      </span>
                    ))}
                    {it.length > 3 && <span className="cal-more">+{it.length - 3} más</span>}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="card" aria-live="polite">
            <div className="card-h">
              <h2>{tituloDia(sel)}</h2>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {delDia(sel).map((p) => (
                <TarjetaPublicacion key={p.id} p={p} />
              ))}
              {!delDia(sel).length && <div className="empty">Nada publicado este día.</div>}
            </div>
            <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => abrir('post', { date: sel })}>
              <Icono n="plus" />
              Publicación este día
            </button>
          </section>
        </div>
      )}
    </>
  );
}
