'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { TIPOS_RENOVACION } from '@/lib/catalogos/dinero';
import type { Iguala } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { diasHasta, fechaCorta } from '@/lib/reglas/fechas';
import { estadoRenovacion, igualaFacturada, igualaPorFacturar, ingresosFijos, nombreMes } from '@/lib/reglas/recurrentes';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Pill, PillDisciplina } from '@/components/crm/comunes';
import { useDinero } from '@/components/dinero/Dinero';
import { horas, horasDeMas, minutosIguala } from '@/lib/reglas/trabajo';
import { useTrabajo } from '@/components/trabajo/Trabajo';
import { useCliente } from '@/components/cliente/Cliente';
import { mesAnterior } from '@/lib/reglas/cliente';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

export default function Pagina() {
  return (
    <Suspense>
      <Igualas />
    </Suspense>
  );
}

/** Igualas (cuota mensual) y renovaciones (dominios, hosting…) — SPEC §6.11, §7.14 y §7.15. */
function Igualas() {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const acc = useDinero();
  const [pestana, setPestana] = useState<'igualas' | 'renovaciones'>(useSearchParams().get('tab') === 'renovaciones' ? 'renovaciones' : 'igualas');
  const esI = pestana === 'igualas';
  const activas = c.retainers.filter((r) => r.active);
  const porFacturar = activas.filter((r) => igualaPorFacturar(r, hoy));
  const renov = [...c.renewals].sort((a, b) => a.renewDate.localeCompare(b.renewDate));
  const caducadas = renov.filter((n) => estadoRenovacion(n, hoy).k === 'vencida').length;

  const pestanas = (
    <div className="seg" role="group" aria-label="Qué ver">
      <button type="button" className={esI ? 'on' : ''} aria-pressed={esI} onClick={() => setPestana('igualas')}>
        Igualas <span className="n">{c.retainers.length}</span>
      </button>
      <button type="button" className={!esI ? 'on' : ''} aria-pressed={!esI} onClick={() => setPestana('renovaciones')}>
        Renovaciones <span className="n">{c.renewals.length}</span>
      </button>
    </div>
  );

  return (
    <>
      <Cabecera
        antetitulo="Ingresos que se repiten"
        titulo="Igualas y renovaciones"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir(esI ? 'retainer' : 'renewal')}>
            <Icono n="plus" />
            {esI ? 'Nueva iguala' : 'Nueva renovación'}
          </button>
        }
      >
        Clientes que te pagan una cuota cada mes <Ayuda k="iguala" /> y servicios que renuevas cada año por ellos <Ayuda k="renov" />.
      </Cabecera>

      {esI ? (
        <div className="stats">
          <div className="stat lilac">
            <span className="k">Ingresos fijos al mes</span>
            <span className="v num">{eur(ingresosFijos(c.retainers))}</span>
            <span className="s">{eur(ingresosFijos(c.retainers) * 12)} al año</span>
          </div>
          <div className="stat sage">
            <span className="k">Clientes con iguala</span>
            <span className="v num">{activas.length}</span>
            <span className="s">Activas</span>
          </div>
          <div className="stat peach">
            <span className="k">Horas este mes</span>
            <span className="v num">{horas(activas.reduce((a, r) => a + minutosIguala(c, r, hoy), 0))}</span>
            <span className="s">de {activas.reduce((a, r) => a + r.hours, 0)} h incluidas</span>
          </div>
          <div className={`stat ${porFacturar.length ? 'rose' : 'butter'}`}>
            <span className="k">Por facturar este mes</span>
            <span className="v num">{porFacturar.length}</span>
            <span className="s">{porFacturar.length ? 'Prepara sus facturas abajo' : 'Todo facturado'}</span>
          </div>
        </div>
      ) : (
        <div className="stats">
          <div className={`stat ${caducadas ? 'rose' : 'sage'}`}>
            <span className="k">Caducadas</span>
            <span className="v num">{caducadas}</span>
            <span className="s">{caducadas ? 'Renuévalas hoy' : 'Ninguna'}</span>
          </div>
          <div className="stat butter">
            <span className="k">En los próximos 30 días</span>
            <span className="v num">{renov.filter((n) => diasHasta(n.renewDate, hoy) >= 0 && diasHasta(n.renewDate, hoy) <= 30).length}</span>
            <span className="s">Te avisamos con tiempo</span>
          </div>
          <div className="stat lilac">
            <span className="k">Cobras al año</span>
            <span className="v num">{eur(renov.reduce((a, n) => a + n.price, 0))}</span>
            <span className="s">Te cuestan {eur(renov.reduce((a, n) => a + n.cost, 0))}</span>
          </div>
          <div className="stat peach">
            <span className="k">
              Ganas al año <Ayuda k="margen" />
            </span>
            <span className="v num">{eur(renov.reduce((a, n) => a + n.price - n.cost, 0))}</span>
            <span className="s">Por gestionar las renovaciones</span>
          </div>
        </div>
      )}

      {pestanas}

      {esI ? (
        <div className="p-grid">
          {c.retainers.map((r) => (
            <TarjetaIguala key={r.id} r={r} />
          ))}
          {!c.retainers.length && <div className="card empty">Aún no tienes igualas. Si un cliente te paga una cuota fija al mes, créala aquí.</div>}
        </div>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Proveedor</th>
                  <th className="amt">Te cuesta</th>
                  <th className="amt">Le cobras</th>
                  <th>Renueva</th>
                  <th>
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {renov.map((n) => {
                  const st = estadoRenovacion(n, hoy);
                  return (
                    <tr key={n.id} tabIndex={0} onClick={() => abrir('renewal', { id: n.id })} onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && abrir('renewal', { id: n.id })}>
                      <td>
                        <b>{n.name}</b>
                      </td>
                      <td>{c.companies.find((e) => e.id === n.companyId)?.name ?? '—'}</td>
                      <td>
                        <Pill cls={TIPOS_RENOVACION[n.type].cls}>{TIPOS_RENOVACION[n.type].label}</Pill>
                      </td>
                      <td>{n.provider}</td>
                      <td className="amt" style={{ fontWeight: 500 }}>
                        {eur(n.cost)}
                      </td>
                      <td className="amt">{eur(n.price)}</td>
                      <td>
                        <Pill cls={st.cls}>{st.label}</Pill>
                        <div className="chip num">{fechaCorta(n.renewDate)}</div>
                      </td>
                      <td>
                        {st.k !== 'ok' && (
                          <button
                            type="button"
                            className={`btn sm ${st.k === 'vencida' ? 'primary' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void acc.renovar(n);
                            }}
                          >
                            Renovar y facturar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!renov.length && (
                  <tr>
                    <td colSpan={8} className="empty">
                      Aún no tienes renovaciones. Apunta aquí los dominios, hostings o licencias que pagas por tus clientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function TarjetaIguala({ r }: { r: Iguala }) {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const acc = useDinero();
  const empresa = c.companies.find((e) => e.id === r.companyId);
  const mes = nombreMes(hoy);
  const toca = igualaPorFacturar(r, hoy);
  const trabajo = useTrabajo();
  const cliente = useCliente();
  const min = minutosIguala(c, r, hoy);
  const pct = r.hours ? (min / 60 / r.hours) * 100 : 0;
  const deMas = horasDeMas(c, r, hoy);
  return (
    <article className="r-card">
      <div className="p-top">
        <PillDisciplina d={r.discipline} />
        {!r.active && <Pill cls="mist">Pausada</Pill>}
        {toca && <Pill cls="rose">Toca facturar</Pill>}
      </div>
      <div>
        <h3>{r.name}</h3>
        <div className="client">{empresa?.name ?? 'Sin cliente'}</div>
      </div>
      <div className="r-fee">
        <b className="num">{eur(r.fee)}</b>
        <span>al mes · factura el día {r.billingDay}</span>
      </div>
      <div className="p-prog">
        <div className="row">
          <span>Horas de {mes}</span>
          <span className={`num ${pct > 100 ? 'late' : ''}`}>
            {horas(min)} de {r.hours} h
          </span>
        </div>
        <div className="progress">
          <i style={{ width: `${Math.min(100, pct)}%`, background: pct > 100 ? 'var(--danger)' : pct > 85 ? 'var(--peach-strong)' : 'var(--sage-strong)' }} />
        </div>
        <div className="row">
          <span>Lo que ganas por hora este mes</span>
          <span className="num">{min ? `${eur(r.fee / (min / 60))}/h` : '—'}</span>
        </div>
      </div>
      {r.services && (
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
          {r.services}
        </p>
      )}
      <div className="r-actions">
        {igualaFacturada(r, hoy) ? (
          <span className="chip">
            <Icono n="tick" />
            Factura de {mes} hecha
          </span>
        ) : (
          r.active && (
            <button type="button" className={`btn sm ${toca ? 'primary' : ''}`} onClick={() => void acc.facturarIguala(r)}>
              <Icono n="receipt" />
              Facturar {mes}
            </button>
          )
        )}
        {deMas > 0 && (
          <button type="button" className="btn sm" onClick={() => void trabajo.cobrarHorasDeMas(r)}>
            Cobrar {horas(deMas * 60)} de más
          </button>
        )}
        <button type="button" className="btn sm" onClick={() => cliente.verInforme(r.id, mesAnterior(hoy))}>
          <Icono n="chart" />
          Informe de {nombreMes(`${mesAnterior(hoy)}-01`)}
          {c.reports.some((x) => x.retainerId === r.id && x.month === mesAnterior(hoy) && x.status === 'enviado') ? ' ✓' : ''}
        </button>
        <button type="button" className="btn sm ghost" onClick={() => abrir('retainer', { id: r.id })}>
          <Icono n="edit" />
          Editar
        </button>
      </div>
    </article>
  );
}
