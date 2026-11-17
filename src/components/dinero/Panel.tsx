'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ESTADOS_FACTURA, METODOS_PAGO } from '@/lib/catalogos/dinero';
import type { Factura } from '@/lib/datos/entidades';
import { eur2, r2 } from '@/lib/reglas/dinero';
import { estadoDe, pagosDe, totalesDe } from '@/lib/reglas/facturas';
import { fechaLargaDe } from '@/lib/reglas/fechas';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { Ayuda } from '@/components/ui/Ayuda';
import { Icono } from '@/components/ui/Icono';
import { Capa, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';
import { Pill } from '@/components/crm/comunes';
import { Papel, tituloDocumento } from './Papel';
import type { AccionesDinero } from './Dinero';

/** Vista del documento en un cajón lateral, con sus acciones, cobros y PDF (SPEC §6.13). */
export function PanelFactura({ f, acc, alCerrar }: { f: Factura; acc: AccionesDinero; alCerrar: () => void }) {
  const { c, hoy, borrar } = useDatos();
  const [imprimir, setImprimir] = useState(false);
  const t = totalesDe(c, f);
  const st = estadoDe(c, f, hoy);
  const esFactura = f.kind === 'factura';
  const rectificada = c.invoices.find((x) => x.rectifiesId === f.id);
  const yaFacturado = c.invoices.some((x) => x.fromQuoteId === f.id);
  const empresa = c.companies.find((e) => e.id === f.companyId);
  const proyecto = c.projects.find((p) => p.id === f.projectId);
  const pagos = pagosDe(c, f.id).sort((a, b) => a.date.localeCompare(b.date));

  // PDF: se imprime solo el documento («Guardar como PDF» en el diálogo del navegador).
  useEffect(() => {
    if (!imprimir) return;
    const antes = document.title;
    document.title = `${tituloDocumento(f)} ${f.number || 'borrador'}`;
    const fin = () => setImprimir(false);
    window.addEventListener('afterprint', fin);
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', fin);
      document.title = antes;
    };
  }, [imprimir, f]);

  const pdf = (
    <button type="button" className="btn sm" onClick={() => setImprimir(true)}>
      <Icono n="download" />
      PDF
    </button>
  );

  return (
    <Capa alCerrar={alCerrar} className="overlay drawer-ov">
      <aside className="drawer wide" role="dialog" aria-modal="true" aria-label={`${tituloDocumento(f)} ${f.number}`}>
        <div className="drawer-h">
          <div>
            <div className="tags" style={{ marginBottom: 8 }}>
              <Pill cls={ESTADOS_FACTURA[st].cls}>{ESTADOS_FACTURA[st].label}</Pill>
            </div>
            <h2>
              {tituloDocumento(f)} {f.number}
            </h2>
            <div className="chip" style={{ marginTop: 6 }}>
              {f.client?.name ?? empresa?.name ?? 'Sin cliente'}
              {proyecto ? ` · ${proyecto.name}` : ''}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={alCerrar} aria-label="Cerrar" data-autofocus>
            <Icono n="x" />
          </button>
        </div>
        <div className="drawer-b">
          <div className="r-actions">
            {esFactura && f.status === 'borrador' && (
              <>
                <button type="button" className="btn sm" onClick={() => acc.editar(f)}>
                  <Icono n="edit" />
                  Editar
                </button>
                <BotonEmitir alEmitir={() => void acc.emitir(f.id)} />
              </>
            )}
            {esFactura && f.status === 'emitida' && (
              <>
                {t.pending > 0 && (
                  <button type="button" className="btn sm primary" onClick={() => acc.pago(f.id)}>
                    <Icono n="euro" />
                    Me ha pagado
                  </button>
                )}
                {!rectificada && f.series !== 'R' && (
                  <button type="button" className="btn sm" onClick={() => acc.rectificar(f)}>
                    Corregir con rectificativa <Ayuda k="rect" />
                  </button>
                )}
                {pdf}
              </>
            )}
            {!esFactura && (
              <>
                <button type="button" className="btn sm" onClick={() => acc.editar(f)}>
                  <Icono n="edit" />
                  Editar
                </button>
                {f.status === 'borrador' && (
                  <button type="button" className="btn sm" onClick={() => void acc.enviado(f)}>
                    Ya lo he enviado
                  </button>
                )}
                {(f.status === 'borrador' || f.status === 'enviado') && (
                  <button type="button" className="btn sm" onClick={() => void acc.rechazar(f)}>
                    Lo ha rechazado
                  </button>
                )}
                {f.status !== 'rechazado' && !yaFacturado && (
                  <button type="button" className="btn sm primary" onClick={() => void acc.convertir(f)}>
                    Aceptado: crear factura
                  </button>
                )}
                {pdf}
              </>
            )}
          </div>
          {esFactura && f.status === 'emitida' && (
            <div className="warn mist">Una factura emitida no se puede cambiar ni borrar (lo exige la ley). Si hay un error, corrígela con una rectificativa.</div>
          )}
          {esFactura && f.status === 'borrador' && (
            <div className="warn butter">Es un borrador: puedes cambiarlo. Al emitirlo recibirá su número y ya no se podrá modificar.</div>
          )}
          {rectificada && (
            <button type="button" className="chip link" style={{ alignSelf: 'flex-start' }} onClick={() => acc.ver(rectificada.id)}>
              Corregida con la {rectificada.number ? `rectificativa ${rectificada.number}` : 'rectificativa en borrador'}
            </button>
          )}

          <Papel f={f} />

          {esFactura && f.status === 'emitida' && (
            <section className="card">
              <div className="card-h">
                <h2>
                  <Icono n="euro" />
                  Pagos recibidos
                </h2>
                <span className="chip num">
                  {eur2(t.paid)} de {eur2(t.total)}
                </span>
              </div>
              <div className="progress" style={{ marginBottom: 8 }}>
                <i style={{ width: `${t.total > 0 ? Math.min(100, (t.paid / t.total) * 100) : 0}%` }} />
              </div>
              {pagos.map((p) => (
                <div className="pay" key={p.id}>
                  <span>
                    {fechaLargaDe(p.date)} · {p.method}
                  </span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <b>{eur2(p.amount)}</b>
                    <button type="button" className="icon-btn" aria-label={`Quitar el pago de ${eur2(p.amount)}`} title="Quitar este pago" onClick={() => void borrar('payments', p.id, 'Pago quitado')}>
                      <Icono n="x" />
                    </button>
                  </span>
                </div>
              ))}
              {!pagos.length && <div className="empty">Todavía no te ha pagado nada.</div>}
              {t.pending > 0 && (
                <div className="pay">
                  <span>Te falta por cobrar</span>
                  <b style={{ color: 'var(--danger)' }}>{eur2(t.pending)}</b>
                </div>
              )}
            </section>
          )}
          {f.kind === 'factura' && f.status === 'emitida' && (
            <p className="foot-note" style={{ marginTop: 0 }}>
              El cobro online y los recordatorios automáticos al cliente llegan en la Fase 4.
            </p>
          )}
        </div>
      </aside>
      {imprimir &&
        createPortal(
          <div className="zona-impresion">
            <Papel f={f} ayudas={false} />
          </div>,
          document.body,
        )}
    </Capa>
  );
}

function BotonEmitir({ alEmitir }: { alEmitir: () => void }) {
  const [seguro, setSeguro] = useState(false);
  return (
    <button type="button" className="btn sm primary" onClick={() => (seguro ? alEmitir() : setSeguro(true))}>
      {seguro ? 'Pulsa otra vez: ya no se podrá cambiar' : 'Emitir factura'}
    </button>
  );
}

/** «¿Cuánto te ha pagado?»: apunta un cobro manual. */
export function VentanaPago({ f, alCerrar }: { f: Factura; alCerrar: () => void }) {
  const { c, hoy, crear } = useDatos();
  const toast = useToast();
  const t = totalesDe(c, f);
  const [importe, setImporte] = useState(String(t.pending));
  const [fecha, setFecha] = useState(hoy);
  const [metodo, setMetodo] = useState<string>(METODOS_PAGO[0]);

  const guardar = async () => {
    const a = r2(Number(importe.replace(',', '.')));
    if (!(a > 0)) {
      document.getElementById('pay-amt')?.focus();
      return toast('Escribe cuánto te ha pagado');
    }
    if (await crear('payments', { id: nuevoId(), invoiceId: f.id, date: fecha || hoy, amount: a, method: metodo, createdAt: ahoraISO() })) {
      alCerrar();
      toast(a >= t.pending - 0.005 ? `Pago de ${eur2(a)} apuntado. ¡Factura pagada!` : `Pago de ${eur2(a)} apuntado`);
    }
  };

  return (
    <Modal
      titulo={`¿Cuánto te ha pagado? · ${f.number}`}
      alCerrar={alCerrar}
      ancho={460}
      comoFormulario={() => void guardar()}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn primary">
            Apuntar pago
          </button>
        </>
      }
    >
      <div className="modal-b">
        <label className="field">
          <span>Importe (€)</span>
          <input className="input" id="pay-amt" data-autofocus type="number" step="0.01" min="0.01" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} />
        </label>
        <label className="field">
          <span>Fecha</span>
          <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="field full">
          <span>Cómo</span>
          <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {METODOS_PAGO.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <p className="muted full" style={{ margin: 0 }}>
          Te falta por cobrar <b>{eur2(t.pending)}</b>. Si te paga solo una parte, la factura quedará como «Pagada en parte».
        </p>
      </div>
    </Modal>
  );
}
