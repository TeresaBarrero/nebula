'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FASES_ABIERTAS, FASES_OPORTUNIDAD } from '@/lib/catalogos/crm';
import type { FaseOportunidad, Oportunidad } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { diasHasta, relativa } from '@/lib/reglas/fechas';
import { cifrasOportunidades, enTablero } from '@/lib/reglas/proyectos';
import { useAccionesCrm } from '@/components/app/acciones';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { PillDisciplina } from '@/components/crm/comunes';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

const FASES = Object.keys(FASES_OPORTUNIDAD) as FaseOportunidad[];

/** Oportunidades: tablero kanban por fases con arrastrar y soltar (SPEC §6.3). */
export default function Oportunidades() {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const { mover } = useAccionesCrm();
  const [encima, setEncima] = useState<FaseOportunidad | null>(null);
  const k = cifrasOportunidades(c.deals, hoy);

  const soltar = (e: React.DragEvent, fase: FaseOportunidad) => {
    e.preventDefault();
    setEncima(null);
    const d = c.deals.find((x) => x.id === e.dataTransfer.getData('text/plain'));
    if (d) void mover(d, fase);
  };

  return (
    <>
      <Cabecera
        antetitulo="Clientes que pueden llegar"
        titulo="Oportunidades"
        acciones={
          <>
            <Link className="btn" href="/perfil" title="Actívalo y copia el código en Perfil → Para tus clientes">
              <Icono n="inbox" />
              Formulario web
            </Link>
            <button type="button" className="btn primary" onClick={() => abrir('deal')}>
              <Icono n="plus" />
              Nueva oportunidad
            </button>
          </>
        }
      >
        Cada tarjeta es un posible trabajo. Arrástrala según avance (o ábrela y cambia «¿En qué punto está?»). Cuando la ganes, se crea el proyecto con su plantilla.
      </Cabecera>

      <div className="stats">
        <div className="stat lilac">
          <span className="k">En juego</span>
          <span className="v num">{eur(k.enJuego)}</span>
          <span className="s">
            {k.abiertas} {k.abiertas === 1 ? 'oportunidad abierta' : 'oportunidades abiertas'}
          </span>
        </div>
        <div className="stat peach">
          <span className="k">
            Lo que probablemente cerrarás <Ayuda k="prevision" />
          </span>
          <span className="v num">{eur(k.ponderado)}</span>
          <span className="s">Según la probabilidad de cada una</span>
        </div>
        <div className="stat sage">
          <span className="k">Ganado · 90 días</span>
          <span className="v num">{eur(k.ganado90)}</span>
          <span className="s">
            {k.ganadas90} {k.ganadas90 === 1 ? 'trabajo' : 'trabajos'}
          </span>
        </div>
        <div className="stat butter">
          <span className="k">Propuestas que ganas</span>
          <span className="v num">{k.tasa} %</span>
          <span className="s">De las que se decidieron en 90 días</span>
        </div>
      </div>

      <div className="kanban">
        {FASES.map((f) => {
          const s = FASES_OPORTUNIDAD[f];
          const ds = c.deals.filter((d) => d.stage === f && enTablero(d, hoy)).sort((a, b) => (a.expected ?? '9').localeCompare(b.expected ?? '9'));
          return (
            <section
              key={f}
              className={`kcol ${s.cls} ${encima === f ? 'over' : ''}`}
              aria-label={s.label}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (encima !== f) setEncima(f);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setEncima(null);
              }}
              onDrop={(e) => soltar(e, f)}
            >
              <div className="kcol-h">
                <b>{s.label}</b>
                <span className="num">
                  {ds.length} · {eur(ds.reduce((a, d) => a + d.value, 0))}
                </span>
              </div>
              {ds.map((d) => (
                <TarjetaOportunidad key={d.id} d={d} />
              ))}
              {!ds.length && <div className="empty">Suelta aquí una oportunidad</div>}
              {f === 'nuevo' && (
                <button type="button" className="btn sm ghost" style={{ color: 'inherit' }} onClick={() => abrir('deal')}>
                  <Icono n="plus" />
                  Añadir
                </button>
              )}
            </section>
          );
        })}
      </div>
      <p className="foot-note">Las columnas Ganado y Perdido muestran lo decidido en los últimos 90 días.</p>
    </>
  );
}

function TarjetaOportunidad({ d }: { d: Oportunidad }) {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const empresa = c.companies.find((x) => x.id === d.companyId);
  const contacto = c.contacts.find((x) => x.id === d.contactId);
  const abierta = FASES_ABIERTAS.includes(d.stage);
  const retrasada = abierta && d.expected && diasHasta(d.expected, hoy) < 0;
  return (
    <button
      type="button"
      className="deal"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', d.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => abrir('deal', { id: d.id })}
    >
      {d.source === 'Formulario web' && d.stage === 'nuevo' && (
        <span className="pill peach" style={{ alignSelf: 'flex-start' }}>
          <Icono n="inbox" />
          Desde tu web
        </span>
      )}
      <b>{d.title}</b>
      <span className="chip">
        <Icono n={empresa ? 'building' : 'user'} />
        {empresa?.name || contacto?.name || 'Sin empresa todavía'}
      </span>
      {d.discipline && (
        <span>
          <PillDisciplina d={d.discipline} />
        </span>
      )}
      <div className="row">
        <span className="val num">{eur(d.value)}</span>
        <span className={`chip ${retrasada ? 'late' : ''}`}>
          {abierta ? (
            <>
              <Icono n="flag" />
              {retrasada ? 'Retrasada · ' : ''}
              {relativa(d.expected, hoy) || 'Sin fecha'}
            </>
          ) : d.stage === 'perdido' && d.lostReason ? (
            d.lostReason
          ) : (
            relativa(d.closedAt ?? d.expected, hoy)
          )}
        </span>
      </div>
      {abierta && (
        <div className="row">
          <div className="prob" style={{ flex: 1 }}>
            <i style={{ width: `${d.prob}%` }} />
          </div>
          <span className="chip num">{d.prob} %</span>
        </div>
      )}
    </button>
  );
}
