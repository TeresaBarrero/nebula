'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ESTADOS_FACTURA } from '@/lib/catalogos/dinero';
import type { Factura } from '@/lib/datos/entidades';
import { eur, eur2 } from '@/lib/reglas/dinero';
import { cifrasFacturas, cifrasPresupuestos, estadoDe, totalesDe } from '@/lib/reglas/facturas';
import { fechaCorta } from '@/lib/reglas/fechas';
import { useDatos } from '@/components/app/Datos';
import { Pill } from '@/components/crm/comunes';
import { useDinero } from '@/components/dinero/Dinero';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

export default function Pagina() {
  return (
    <Suspense>
      <Facturas />
    </Suspense>
  );
}

/** Presupuestos y facturas (SPEC §6.13). */
function Facturas() {
  const { c, hoy } = useDatos();
  const acc = useDinero();
  const params = useSearchParams();
  const [pestana, setPestana] = useState<Factura['kind']>(params.get('tipo') === 'presupuesto' ? 'presupuesto' : 'factura');
  const abrirId = params.get('id');
  useEffect(() => {
    if (abrirId && c.invoices.some((f) => f.id === abrirId)) acc.ver(abrirId);
    // Solo al llegar con ?id=…
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirId]);

  const esF = pestana === 'factura';
  const kf = cifrasFacturas(c, hoy);
  const kp = cifrasPresupuestos(c.invoices);
  const lista = c.invoices
    .filter((f) => f.kind === pestana)
    .sort((a, b) => Number(b.status === 'borrador') - Number(a.status === 'borrador') || b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
  const nFacturas = c.invoices.filter((f) => f.kind === 'factura').length;

  return (
    <>
      <Cabecera
        antetitulo="Dinero"
        titulo="Presupuestos y facturas"
        acciones={
          <>
            <button type="button" className="btn" onClick={() => acc.nueva('presupuesto')}>
              <Icono n="plus" />
              Presupuesto
            </button>
            <button type="button" className="btn primary" onClick={() => acc.nueva('factura')}>
              <Icono n="plus" />
              Factura
            </button>
          </>
        }
      >
        Primero mandas un presupuesto («esto te costaría»). Cuando haces el trabajo, una factura («esto me debes»).
      </Cabecera>

      <div className="stats">
        {esF ? (
          <>
            <div className="stat sage">
              <span className="k">Cobrado este año</span>
              <span className="v num">{eur(kf.cobradoAnio)}</span>
              <span className="s">{kf.pagadas} facturas pagadas</span>
            </div>
            <div className="stat butter">
              <span className="k">Te deben</span>
              <span className="v num">{eur(kf.teDeben)}</span>
              <span className="s">Lo que te tienen que ingresar</span>
            </div>
            <div className="stat rose">
              <span className="k">Fuera de plazo</span>
              <span className="v num">{eur(kf.fueraDePlazo)}</span>
              <span className="s">{kf.fueraDePlazo ? 'Toca reclamar estos pagos' : 'Nadie se ha retrasado'}</span>
            </div>
            <div className="stat lilac">
              <span className="k">
                IVA cobrado este trimestre <Ayuda k="iva" />
              </span>
              <span className="v num">{eur(kf.ivaTrimestre)}</span>
              <span className="s">No es tuyo: es para Hacienda</span>
            </div>
          </>
        ) : (
          <>
            <div className="stat lilac">
              <span className="k">Presupuestos sin respuesta</span>
              <span className="v num">{eur(kp.sinRespuesta)}</span>
              <span className="s">Sin IVA · enviados o en borrador</span>
            </div>
            <div className="stat sage">
              <span className="k">Aceptados</span>
              <span className="v num">{kp.aceptados}</span>
              <span className="s">Listos para facturar</span>
            </div>
            <div className="stat peach">
              <span className="k">Presupuestos que te aceptan</span>
              <span className="v num">{kp.tasa} %</span>
              <span className="s">De los que ya tienen respuesta</span>
            </div>
            <div className="stat butter">
              <span className="k">Esperando respuesta</span>
              <span className="v num">{kp.esperando}</span>
              <span className="s">Escríbeles si pasan 7 días</span>
            </div>
          </>
        )}
      </div>

      <section className="card">
        <div className="card-h">
          <div className="seg" role="group" aria-label="Qué ver">
            <button type="button" className={esF ? 'on' : ''} aria-pressed={esF} onClick={() => setPestana('factura')}>
              Facturas <span className="n">{nFacturas}</span>
            </button>
            <button type="button" className={!esF ? 'on' : ''} aria-pressed={!esF} onClick={() => setPestana('presupuesto')}>
              Presupuestos <span className="n">{c.invoices.length - nFacturas}</span>
            </button>
          </div>
          {esF && (
            <span className="chip">
              Estados: Borrador <Ayuda k="borrador" /> · Rectificativa <Ayuda k="rect" />
            </span>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Concepto</th>
                <th>Fecha</th>
                <th>{esF ? 'Vence' : 'Válido hasta'}</th>
                <th>Estado</th>
                <th className="amt">{esF ? 'Te ingresarán' : 'Total'}</th>
                <th>
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <Fila key={f.id} f={f} />
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={8} className="empty">
                    {esF ? 'Aún no tienes facturas. Crea la primera con «Factura».' : 'Aún no tienes presupuestos.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Fila({ f }: { f: Factura }) {
  const { c, hoy } = useDatos();
  const acc = useDinero();
  const st = estadoDe(c, f, hoy);
  const t = totalesDe(c, f);
  const empresa = c.companies.find((e) => e.id === f.companyId);
  const esF = f.kind === 'factura';
  const facturado = c.invoices.some((x) => x.fromQuoteId === f.id);

  let accion: React.ReactNode = null;
  const boton = (texto: string, fn: () => void) => (
    <button
      type="button"
      className="btn sm"
      onClick={(e) => {
        e.stopPropagation();
        fn();
      }}
    >
      {texto}
    </button>
  );
  if (esF && st === 'borrador') accion = boton('Abrir y emitir', () => acc.ver(f.id));
  else if (st === 'pendiente' || st === 'parcial' || st === 'vencida') accion = boton('Me ha pagado', () => acc.pago(f.id));
  else if (!esF && st === 'aceptado' && !facturado) accion = boton('Facturar', () => void acc.convertir(f));
  else if (!esF && st === 'borrador') accion = boton('Ya lo he enviado', () => void acc.enviado(f));

  return (
    <tr
      tabIndex={0}
      onClick={() => acc.ver(f.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) acc.ver(f.id);
      }}
      aria-label={`${f.number || 'Borrador'} · ${empresa?.name ?? f.client?.name ?? ''}`}
    >
      <td>
        <b>{f.number || 'Borrador'}</b>
      </td>
      <td>{f.client?.name ?? empresa?.name ?? '—'}</td>
      <td>
        {f.lines[0]?.desc ?? ''}
        {f.lines.length > 1 && <span className="muted"> +{f.lines.length - 1}</span>}
      </td>
      <td className="num">{fechaCorta(f.date)}</td>
      <td className="num">{fechaCorta(f.due)}</td>
      <td>
        <Pill cls={ESTADOS_FACTURA[st].cls}>{ESTADOS_FACTURA[st].label}</Pill>
        {st === 'parcial' && <div className="chip num">Faltan {eur2(t.pending)}</div>}
      </td>
      <td className="amt">{eur2(t.total)}</td>
      <td>{accion}</td>
    </tr>
  );
}
