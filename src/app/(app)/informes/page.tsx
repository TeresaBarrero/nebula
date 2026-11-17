'use client';

import Link from 'next/link';
import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import { eur, eur2 } from '@/lib/reglas/dinero';
import { nombreTrimestre, resumenFiscal } from '@/lib/reglas/facturas';
import { ingresosYGastos, mejoresClientes, porDisciplina, porProyecto, type Mes } from '@/lib/reglas/informes';
import { ingresosFijos } from '@/lib/reglas/recurrentes';
import { useDatos } from '@/components/app/Datos';
import { Avatar, PillDisciplina } from '@/components/crm/comunes';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';

/** Informes: ingresos y gastos, resumen para la gestoría, disciplinas, proyectos y clientes (SPEC §6.15). */
export default function Informes() {
  const { c, hoy } = useDatos();
  const meses = ingresosYGastos(c, hoy);
  const ing = meses.reduce((a, m) => a + m.ingresos, 0);
  const gas = meses.reduce((a, m) => a + m.gastos, 0);
  const fijos = ingresosFijos(c.retainers);
  const q = resumenFiscal(c, hoy);
  const disc = porDisciplina(c, hoy);
  const dmax = Math.max(1, ...disc.map((d) => d.facturado));
  const proy = porProyecto(c);
  const clientes = mejoresClientes(c, hoy);

  return (
    <>
      <Cabecera antetitulo="Cómo va tu negocio" titulo="Informes">
        Últimos seis meses: cuánto entra, cuánto sale, qué disciplinas te dan más dinero y qué llevar a tu gestoría.
      </Cabecera>
      <div className="stats">
        <div className="stat sage">
          <span className="k">Facturado · 6 meses</span>
          <span className="v num">{eur(ing)}</span>
          <span className="s">
            Sin IVA <Ayuda k="base" />
          </span>
        </div>
        <div className="stat peach">
          <span className="k">Gastado · 6 meses</span>
          <span className="v num">{eur(gas)}</span>
          <span className="s">Sin IVA</span>
        </div>
        <div className="stat butter">
          <span className="k">
            Te ha quedado <Ayuda k="margen" />
          </span>
          <span className="v num">{eur(ing - gas)}</span>
          <span className="s">{ing ? Math.round(((ing - gas) / ing) * 100) : 0} % de lo facturado</span>
        </div>
        <div className="stat lilac">
          <span className="k">Ingresos fijos (igualas)</span>
          <span className="v num">{eur(fijos)}/mes</span>
          <span className="s">{ing ? Math.round(((fijos * 6) / ing) * 100) : 0} % de tu facturación</span>
        </div>
      </div>

      <div className="grid g-rep">
        <section className="card chart">
          <div className="card-h">
            <h2>Lo que entra y lo que sale cada mes</h2>
            <div className="legend">
              <span>
                <i style={{ background: 'var(--sage-strong)' }} />
                Facturado
              </span>
              <span>
                <i style={{ background: 'var(--peach-strong)' }} />
                Gastos
              </span>
            </div>
          </div>
          <Grafica meses={meses} />
        </section>
        <section className="card">
          <div className="card-h">
            <h2>Para tu gestoría · {nombreTrimestre(hoy)}</h2>
          </div>
          <div className="fiscal">
            <div>
              <span>
                IVA que has cobrado <Ayuda k="iva" />
              </span>
              <b>{eur2(q.ivaCobrado)}</b>
            </div>
            <div>
              <span>IVA que has pagado en gastos</span>
              <b>{eur2(q.ivaPagado)}</b>
            </div>
            <div className="hl">
              <span>
                IVA a pagar (modelo 303) <Ayuda k="iva303" />
              </span>
              <b>{eur2(q.ivaAPagar)}</b>
            </div>
            <div>
              <span>
                Retenciones que te han hecho <Ayuda k="irpf" />
              </span>
              <b>{eur2(q.retenciones)}</b>
            </div>
            <div>
              <span>Facturado sin IVA</span>
              <b>{eur2(q.ingresos)}</b>
            </div>
            <div>
              <span>Gastos deducibles sin IVA</span>
              <b>{eur2(q.gastos)}</b>
            </div>
            <div className="hl" style={{ gridColumn: '1/-1' }}>
              <span>
                Lo que has ganado este trimestre <Ayuda k="rendimiento" />
              </span>
              <b>{eur2(q.rendimiento)}</b>
            </div>
          </div>
          <p className="foot-note">Cálculo orientativo con tus facturas emitidas y tus gastos. Revísalo siempre con tu gestoría.</p>
        </section>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))' }}>
        <section className="card">
          <div className="card-h">
            <h2>Por disciplina · 6 meses</h2>
          </div>
          <div className="hbar">
            {disc.map((d) => (
              <div className="row" key={d.k} style={{ gridTemplateColumns: '150px 1fr 70px' }}>
                <span>
                  <PillDisciplina d={d.k} />
                </span>
                <div className="track" role="img" aria-label={`${DISCIPLINAS[d.k].label}: ${eur(d.facturado)}`}>
                  <i style={{ width: `${(d.facturado / dmax) * 100}%`, background: 'var(--sage-strong)' }} />
                </div>
                <b className="num" style={{ textAlign: 'right' }}>
                  {eur(d.facturado)}
                </b>
              </div>
            ))}
            {!disc.length && <div className="empty">Aún no hay facturas de proyectos o igualas en estos meses.</div>}
          </div>
          <p className="foot-note">Las horas y lo que ganas por hora en cada disciplina <Ayuda k="eurh" /> llegan con el cronómetro (Fase 3).</p>
        </section>
        <section className="card">
          <div className="card-h">
            <h2>Lo que te deja cada proyecto</h2>
          </div>
          <div className="table-wrap">
            <table style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th className="amt">Facturado</th>
                  <th className="amt">Gastos</th>
                  <th className="amt">Te queda</th>
                </tr>
              </thead>
              <tbody>
                {proy.map((x) => (
                  <tr key={x.p.id}>
                    <td>
                      <Link className="text-link" href={`/proyectos?p=${x.p.id}`} style={{ fontSize: 'inherit' }}>
                        <b>{x.p.name}</b>
                      </Link>
                    </td>
                    <td className="amt">{eur(x.facturado)}</td>
                    <td className="amt" style={{ fontWeight: 500 }}>
                      {eur(x.gastos)}
                    </td>
                    <td className="amt" style={{ color: x.margen < 0 ? 'var(--danger)' : 'var(--ok)' }}>
                      {x.facturado ? `${x.pct} %` : '—'}
                    </td>
                  </tr>
                ))}
                {!proy.length && (
                  <tr>
                    <td colSpan={4} className="empty">
                      Cuando factures un proyecto o le apuntes gastos, aparecerá aquí.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-h">
            <h2>Tus mejores clientes · 6 meses</h2>
          </div>
          <div className="rank">
            {clientes.map((x) => (
              <Link className="r enlace-fila" key={x.e.id} href={`/empresas?id=${x.e.id}`}>
                <Avatar id={x.e.id} nombre={x.e.name} cuadrado />
                <div>
                  <b>{x.e.name}</b>
                  <div className="chip">{x.e.sector}</div>
                </div>
                <b>{eur(x.facturado)}</b>
              </Link>
            ))}
            {!clientes.length && <div className="empty">Aún no has facturado en estos meses.</div>}
          </div>
        </section>
      </div>
    </>
  );
}

/** Barras dobles por mes (como el prototipo): facturado en salvia y gastos en melocotón. */
function Grafica({ meses }: { meses: Mes[] }) {
  const max = Math.max(1, ...meses.map((m) => Math.max(m.ingresos, m.gastos)));
  const paso = max > 4000 ? 1000 : max > 2000 ? 500 : 250;
  const tope = Math.ceil(max / paso) * paso;
  const W = 640, H = 250, L = 48, B = 28, T = 14;
  const gw = (W - L - 10) / meses.length;
  const y = (v: number) => T + (H - T - B) * (1 - v / tope);
  const marcas = Array.from({ length: tope / paso + 1 }, (_, i) => i * paso);
  const resumen = meses.map((m) => `${m.label}: ${eur(m.ingresos)} facturado y ${eur(m.gastos)} de gastos`).join('; ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ingresos y gastos por mes. ${resumen}`}>
      {marcas.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - 6} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--faint)">
            {v >= 1000 ? `${v / 1000}k` : v}
          </text>
        </g>
      ))}
      {meses.map((m, i) => {
        const x0 = L + i * gw + gw * 0.16;
        const w = gw * 0.32;
        return (
          <g key={m.clave}>
            {m.ingresos > 0 && (
              <rect x={x0} y={y(m.ingresos)} width={w} height={y(0) - y(m.ingresos)} rx="5" fill="var(--sage-strong)">
                <title>{`${m.label}: ${eur(m.ingresos)} facturado`}</title>
              </rect>
            )}
            {m.gastos > 0 && (
              <rect x={x0 + w + 3} y={y(m.gastos)} width={w} height={y(0) - y(m.gastos)} rx="5" fill="var(--peach-strong)">
                <title>{`${m.label}: ${eur(m.gastos)} de gastos`}</title>
              </rect>
            )}
            <text x={x0 + w + 1.5} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">
              {m.label}
            </text>
            {m.ingresos > 0 && (
              <text x={x0 + w / 2} y={y(m.ingresos) - 6} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--fg)">
                {(m.ingresos / 1000).toFixed(1).replace('.', ',')}k
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
