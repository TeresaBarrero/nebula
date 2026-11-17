'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { diasDelMes, elementosDelDia, facturasQueVencen, moverMes } from '@/lib/reglas/calendario';
import { TIPOS_RENOVACION } from '@/lib/catalogos/dinero';
import { FilaFactura } from '@/components/dinero/Listas';
import { aFecha } from '@/lib/reglas/fechas';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { FilaTarea } from '@/components/crm/comunes';
import { FilaReunion } from '@/components/crm/FilaReunion';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const tituloMes = (anio: number, mes: number) => mayuscula(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(anio, mes, 1)));
const tituloDia = (f: string) => mayuscula(new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(aFecha(f)));
const fechaValida = (f: string | null) => (f && /^\d{4}-\d\d-\d\d$/.test(f) ? f : null);

export default function Pagina() {
  return (
    <Suspense>
      <Calendario />
    </Suspense>
  );
}

/** Calendario: mes + agenda del día con reuniones y fechas límite de tareas (SPEC §6.10). */
function Calendario() {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const inicial = fechaValida(useSearchParams().get('dia')) ?? hoy;
  const [sel, setSel] = useState(inicial);
  const [vista, setVista] = useState(() => ({ anio: aFecha(inicial).getFullYear(), mes: aFecha(inicial).getMonth() }));

  const reuniones = c.events.filter((e) => e.date === sel).sort((a, b) => a.time.localeCompare(b.time));
  const tareas = c.tasks.filter((t) => t.due === sel);
  const vencen = facturasQueVencen(c, sel, hoy);
  const renuevan = c.renewals.filter((n) => n.renewDate === sel);
  const irHoy = () => {
    setSel(hoy);
    setVista({ anio: aFecha(hoy).getFullYear(), mes: aFecha(hoy).getMonth() });
  };

  return (
    <>
      <Cabecera
        antetitulo="Agenda"
        titulo="Calendario"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir('event', { date: sel })}>
            <Icono n="plus" />
            Nueva reunión
          </button>
        }
      >
        Reuniones, fechas límite de tareas, vencimientos de facturas y renovaciones.
      </Cabecera>
      <div className="cal-wrap">
        <section className="card cal">
          <div className="cal-head">
            <h2>{tituloMes(vista.anio, vista.mes)}</h2>
            <button type="button" className="btn sm" onClick={irHoy}>
              Hoy
            </button>
            <button type="button" className="icon-btn" aria-label="Mes anterior" onClick={() => setVista(moverMes(vista.anio, vista.mes, -1))}>
              <Icono n="left" />
            </button>
            <button type="button" className="icon-btn" aria-label="Mes siguiente" onClick={() => setVista(moverMes(vista.anio, vista.mes, 1))}>
              <Icono n="right" />
            </button>
          </div>
          <div className="cal-grid">
            {DIAS_SEMANA.map((d) => (
              <div className="cal-dow" key={d}>
                {d}
              </div>
            ))}
            {diasDelMes(vista.anio, vista.mes).map(({ fecha, delMes }) => {
              const it = elementosDelDia(c, fecha, hoy);
              return (
                <button
                  type="button"
                  key={fecha}
                  className={`cal-cell ${delMes ? '' : 'out'} ${fecha === hoy ? 'today' : ''} ${fecha === sel ? 'sel' : ''}`}
                  aria-label={`${tituloDia(fecha)}, ${it.length} ${it.length === 1 ? 'elemento' : 'elementos'}`}
                  aria-pressed={fecha === sel}
                  onClick={() => setSel(fecha)}
                >
                  <span className="dn">{aFecha(fecha).getDate()}</span>
                  {it.slice(0, 3).map((i) => (
                    <span key={i.clave} className={`cal-chip ${i.cls}`}>
                      {i.texto}
                    </span>
                  ))}
                  {it.length > 3 && <span className="cal-more">+{it.length - 3} más</span>}
                </button>
              );
            })}
          </div>
        </section>
        <section className="card agenda" aria-live="polite">
          <div className="card-h">
            <h2>{tituloDia(sel)}</h2>
          </div>
          <div className="sec-lbl">Reuniones</div>
          <div className="list">
            {reuniones.map((e) => (
              <FilaReunion key={e.id} e={e} />
            ))}
            {!reuniones.length && <div className="empty">Sin reuniones este día.</div>}
          </div>
          <div className="sec-lbl">Tareas que vencen</div>
          <div className="list">
            {tareas.map((t) => (
              <FilaTarea key={t.id} t={t} punto />
            ))}
            {!tareas.length && <div className="empty">Ninguna tarea vence este día.</div>}
          </div>
          {vencen.length > 0 && (
            <>
              <div className="sec-lbl">Facturas que vencen</div>
              <div className="list">
                {vencen.map((f) => (
                  <FilaFactura key={f.id} f={f} />
                ))}
              </div>
            </>
          )}
          {renuevan.length > 0 && (
            <>
              <div className="sec-lbl">Renovaciones</div>
              <div className="list">
                {renuevan.map((n) => (
                  <button type="button" key={n.id} className="follow fila-boton" onClick={() => abrir('renewal', { id: n.id })}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{n.name}</b>
                      <div className="chip">
                        {TIPOS_RENOVACION[n.type].label} · {c.companies.find((e) => e.id === n.companyId)?.name ?? ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn sm" onClick={() => abrir('event', { date: sel })}>
              <Icono n="plus" />
              Reunión
            </button>
            <button type="button" className="btn sm" onClick={() => abrir('task', { due: sel })}>
              <Icono n="plus" />
              Tarea
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
