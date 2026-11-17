'use client';

import Link from 'next/link';
import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import { fechaCorta } from '@/lib/reglas/fechas';
import { empresaDe } from '@/lib/reglas/historial';
import { portfolioDe, textoCaso } from '@/lib/reglas/trabajo';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Pill, useCopiar } from '@/components/crm/comunes';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

/** Portfolio: casos de éxito con permiso del cliente y resultados medibles (SPEC §6.16). */
export default function Portfolio() {
  const { c } = useDatos();
  const abrir = useFormularios();
  const copiar = useCopiar();
  const casos = c.projects.filter((p) => portfolioDe(p).featured);
  const sinCaso = c.projects.filter((p) => p.status === 'entregado' && !portfolioDe(p).featured);
  const cliente = (contactId: string | null) => empresaDe(c, c.contacts.find((x) => x.id === contactId));

  return (
    <>
      <Cabecera antetitulo="Tu mejor carta de presentación" titulo="Portfolio">
        Convierte tus proyectos terminados en casos de éxito, con el permiso del cliente y resultados medibles, listos para tu web o para nuevas propuestas.
      </Cabecera>
      <div className="stats">
        <div className="stat sage">
          <span className="k">Casos publicables</span>
          <span className="v num">{casos.filter((p) => portfolioDe(p).permission).length}</span>
          <span className="s">Con permiso del cliente</span>
        </div>
        <div className="stat rose">
          <span className="k">Falta permiso</span>
          <span className="v num">{casos.filter((p) => !portfolioDe(p).permission).length}</span>
          <span className="s">Pídeselo al cliente</span>
        </div>
        <div className="stat butter">
          <span className="k">Proyectos sin caso</span>
          <span className="v num">{sinCaso.length}</span>
          <span className="s">Entregados que podrías enseñar</span>
        </div>
        <div className="stat lilac">
          <span className="k">Disciplinas cubiertas</span>
          <span className="v num">{new Set(casos.map((p) => p.discipline).filter(Boolean)).size}</span>
          <span className="s">de {Object.keys(DISCIPLINAS).length}</span>
        </div>
      </div>
      <div className="p-grid">
        {casos.map((p) => {
          const pf = portfolioDe(p);
          const d = p.discipline ? DISCIPLINAS[p.discipline] : null;
          return (
            <article className="case" key={p.id}>
              <div className={`case-cover ${d?.cls ?? 'mist'}`}>
                <span>{d?.label ?? ''}</span>
                <b>{cliente(p.contactId) || p.name}</b>
              </div>
              <div className="case-b">
                <h3>{p.name}</h3>
                {pf.summary && (
                  <p className="muted" style={{ margin: 0 }}>
                    {pf.summary}
                  </p>
                )}
                {pf.results && (
                  <div className="res sage">
                    <Icono n="chart" /> {pf.results}
                  </div>
                )}
                <div className="p-top">
                  <Pill cls={pf.permission ? 'sage' : 'rose'}>{pf.permission ? 'Permiso del cliente' : 'Falta el permiso del cliente'}</Pill>
                  <span className="chip">{fechaCorta(p.end)}</span>
                </div>
                <div className="r-actions">
                  <button type="button" className="btn sm" onClick={() => abrir('case', { id: p.id })}>
                    <Icono n="edit" />
                    Editar caso
                  </button>
                  <button type="button" className="btn sm" onClick={() => copiar(textoCaso(p, cliente(p.contactId), d?.label ?? ''))}>
                    <Icono n="copy" />
                    Copiar texto
                  </button>
                  <Link className="btn sm ghost" href={`/proyectos?p=${p.id}`}>
                    Proyecto
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
        {!casos.length && <div className="card empty">Aún no tienes casos de éxito. Cuando entregues un proyecto, crea su caso desde aquí o desde su panel.</div>}
      </div>
      {sinCaso.length > 0 && (
        <section className="card">
          <div className="card-h">
            <h2>Proyectos entregados que podrías enseñar</h2>
          </div>
          <div className="list">
            {sinCaso.map((p) => (
              <div className="follow" key={p.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.name}</b>
                  <div className="chip">
                    {p.discipline ? DISCIPLINAS[p.discipline].label : ''} · {fechaCorta(p.end)}
                  </div>
                </div>
                <button type="button" className="btn sm" onClick={() => abrir('case', { id: p.id, featured: true })}>
                  <Icono n="star" />
                  Crear caso
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
