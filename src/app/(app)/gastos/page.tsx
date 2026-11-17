'use client';

import { useState } from 'react';
import { CATEGORIAS_GASTO } from '@/lib/catalogos/dinero';
import { eur, eur2 } from '@/lib/reglas/dinero';
import { emitidas, nombreTrimestre, totales, totalesGasto, trimestreDe } from '@/lib/reglas/facturas';
import { fechaCorta } from '@/lib/reglas/fechas';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

/** Gastos con su ticket, filtro por categoría y en qué gastas este trimestre (SPEC §6.14). */
export default function Gastos() {
  const { c, hoy, abrirArchivo } = useDatos();
  const abrir = useFormularios();
  const [categoria, setCategoria] = useState('all');
  const q = trimestreDe(hoy);
  const delTrimestre = c.expenses.filter((g) => trimestreDe(g.date) === q);
  const base = delTrimestre.reduce((a, g) => a + totalesGasto(g).base, 0);
  const iva = delTrimestre.filter((g) => g.deductible).reduce((a, g) => a + totalesGasto(g).iva, 0);
  const ingresos = emitidas(c.invoices)
    .filter((f) => trimestreDe(f.date) === q)
    .reduce((a, f) => a + totales(f).base, 0);
  const sinTicket = c.expenses.filter((g) => !g.receiptName).length;
  const lista = c.expenses.filter((g) => categoria === 'all' || g.category === categoria).sort((a, b) => b.date.localeCompare(a.date));
  const porCategoria = CATEGORIAS_GASTO.map((k) => ({ k, v: delTrimestre.filter((g) => g.category === k).reduce((a, g) => a + g.base, 0) }))
    .filter((x) => x.v)
    .sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...porCategoria.map((x) => x.v));

  return (
    <>
      <Cabecera
        antetitulo="Dinero"
        titulo="Gastos"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir('expense')}>
            <Icono n="plus" />
            Nuevo gasto
          </button>
        }
      >
        Apunta cada gasto con su ticket. Si es de un proyecto (un colaborador, una imprenta, anuncios…), vincúlalo para saber cuánto te deja ese proyecto.
      </Cabecera>
      <div className="stats">
        <div className="stat peach">
          <span className="k">Gastado este trimestre</span>
          <span className="v num">{eur(base)}</span>
          <span className="s">{nombreTrimestre(hoy)} · sin IVA</span>
        </div>
        <div className="stat lilac">
          <span className="k">
            IVA que has pagado <Ayuda k="iva303" />
          </span>
          <span className="v num">{eur(iva)}</span>
          <span className="s">Lo restas del IVA que cobras</span>
        </div>
        <div className="stat sage">
          <span className="k">
            Has ganado este trimestre <Ayuda k="rendimiento" />
          </span>
          <span className="v num">{eur(ingresos - base)}</span>
          <span className="s">{eur(ingresos)} facturado − gastos</span>
        </div>
        <div className="stat butter">
          <span className="k">Sin ticket</span>
          <span className="v num">{sinTicket}</span>
          <span className="s">{sinTicket ? 'Tu gestoría los necesitará' : 'Todo guardado'}</span>
        </div>
      </div>
      <div className="grid g-rep">
        <section className="card">
          <div className="card-h">
            <h2>Todos los gastos</h2>
            <select className="input" style={{ width: 'auto' }} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría">
              <option value="all">Todas las categorías</option>
              {CATEGORIAS_GASTO.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th className="amt">Sin IVA</th>
                  <th className="amt">IVA</th>
                  <th className="amt">Total</th>
                  <th>
                    <span className="sr-only">Ticket</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => {
                  const t = totalesGasto(g);
                  const p = c.projects.find((x) => x.id === g.projectId);
                  return (
                    <tr key={g.id} tabIndex={0} onClick={() => abrir('expense', { id: g.id })} onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && abrir('expense', { id: g.id })}>
                      <td className="num">{fechaCorta(g.date)}</td>
                      <td>
                        <b>{g.supplier}</b>
                      </td>
                      <td>
                        {g.concept}
                        {p && (
                          <div className="chip">
                            <Icono n="folder" />
                            {p.name}
                          </div>
                        )}
                        {!g.deductible && <div className="chip">No deducible</div>}
                      </td>
                      <td>{g.category}</td>
                      <td className="amt">{eur2(t.base)}</td>
                      <td className="amt" style={{ fontWeight: 500 }}>
                        {g.ivaPct} %
                      </td>
                      <td className="amt">{eur2(t.total)}</td>
                      <td>
                        {g.receiptName ? (
                          <button
                            type="button"
                            className="chip link"
                            title={`Abrir ${g.receiptName}`}
                            aria-label={`Abrir el ticket ${g.receiptName}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void abrirArchivo(g.receiptPath);
                            }}
                          >
                            <Icono n="paperclip" />
                          </button>
                        ) : (
                          <span className="chip late" title="Sin ticket" aria-label="Sin ticket">
                            <Icono n="paperclip" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!lista.length && (
                  <tr>
                    <td colSpan={8} className="empty">
                      {c.expenses.length ? 'Sin gastos en esta categoría.' : 'Aún no has apuntado gastos.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-h">
            <h2>En qué gastas · trimestre</h2>
          </div>
          <div className="hbar">
            {porCategoria.map((x) => (
              <div className="row" key={x.k} style={{ gridTemplateColumns: '130px 1fr 64px' }}>
                <span>{x.k}</span>
                <div className="track" role="img" aria-label={`${x.k}: ${eur(x.v)}`}>
                  <i style={{ width: `${(x.v / max) * 100}%`, background: 'var(--peach-strong)' }} />
                </div>
                <b className="num" style={{ textAlign: 'right' }}>
                  {eur(x.v)}
                </b>
              </div>
            ))}
            {!porCategoria.length && <div className="empty">Sin gastos este trimestre.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
