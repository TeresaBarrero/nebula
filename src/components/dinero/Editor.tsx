'use client';

import { useState } from 'react';
import { TIPOS_IRPF, TIPOS_IVA } from '@/lib/catalogos/dinero';
import type { Factura } from '@/lib/datos/entidades';
import { eur2 } from '@/lib/reglas/dinero';
import { limpiarLineas, totales } from '@/lib/reglas/facturas';
import { irpfPorDefecto } from '@/lib/reglas/irpf';
import { useDatos } from '@/components/app/Datos';
import { useNebula } from '@/components/app/Nebula';
import { Ayuda } from '@/components/ui/Ayuda';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';

type Linea = { desc: string; qty: string; price: string };
const aTexto = (n: number) => (Number.isFinite(n) ? String(n) : '');

/**
 * Editor de factura o presupuesto en modo sencillo (SPEC §7.2):
 * cliente, proyecto y líneas «concepto + precio» con los totales en palabras llanas.
 * En «Más opciones»: persona, fechas, cantidades, IVA, retención, número y notas.
 */
export function EditorFactura({
  inicial,
  alCerrar,
  alGuardar,
}: {
  inicial: Factura;
  alCerrar: () => void;
  alGuardar: (f: Factura, emitir: boolean) => Promise<void>;
}) {
  const { c, borrar } = useDatos();
  const { ajustes } = useNebula();
  const toast = useToast();
  const existe = c.invoices.some((x) => x.id === inicial.id);
  const [f, setF] = useState<Factura>(inicial);
  const [lineas, setLineas] = useState<Linea[]>(() =>
    inicial.lines.length ? inicial.lines.map((l) => ({ desc: l.desc, qty: aTexto(l.qty), price: aTexto(l.price) })) : [{ desc: '', qty: '1', price: '' }],
  );
  const [mas, setMas] = useState(() => inicial.lines.some((l) => l.qty !== 1) || inicial.series === 'R');
  const [confirmar, setConfirmar] = useState(false);
  // Emitir no tiene vuelta atrás: se pide pulsar dos veces.
  const [confirmarEmitir, setConfirmarEmitir] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorCliente, setErrorCliente] = useState(false);

  const esFactura = f.kind === 'factura';
  const empresa = c.companies.find((e) => e.id === f.companyId);
  const original = c.invoices.find((x) => x.id === f.rectifiesId);
  const limpias = limpiarLineas(lineas);
  const t = totales({ ...f, lines: limpias });
  const cambia = (o: Partial<Factura>) => setF((x) => ({ ...x, ...o }));

  const elegirEmpresa = (id: string) => {
    const e = c.companies.find((x) => x.id === id);
    const persona = f.contactId && c.contacts.find((x) => x.id === f.contactId)?.companyId === id ? f.contactId : (c.contacts.find((x) => x.companyId === id)?.id ?? null);
    cambia({ companyId: id || null, contactId: persona, irpf: irpfPorDefecto(ajustes, e) });
    setErrorCliente(false);
  };
  const elegirProyecto = (id: string) => {
    const p = c.projects.find((x) => x.id === id);
    const persona = c.contacts.find((x) => x.id === p?.contactId);
    const o: Partial<Factura> = { projectId: id || null };
    if (persona && !f.companyId && persona.companyId) {
      o.companyId = persona.companyId;
      o.irpf = irpfPorDefecto(ajustes, c.companies.find((e) => e.id === persona.companyId));
    }
    if (persona && !f.contactId) o.contactId = persona.id;
    cambia(o);
  };
  const linea = (i: number, o: Partial<Linea>) => setLineas((ls) => ls.map((l, k) => (k === i ? { ...l, ...o } : l)));

  const guardar = async (emitir: boolean) => {
    if (!f.companyId) {
      setErrorCliente(true);
      document.getElementById('iv-co')?.focus();
      return toast(esFactura ? 'Elige a quién va la factura' : 'Elige a quién va el presupuesto');
    }
    if (!limpias.some((l) => l.desc)) {
      document.querySelector<HTMLInputElement>('[data-linea="0"]')?.focus();
      return toast('Escribe al menos un concepto con su precio');
    }
    setGuardando(true);
    await alGuardar({ ...f, lines: limpias }, emitir);
    setGuardando(false);
  };

  const titulo = !existe
    ? esFactura
      ? f.series === 'R'
        ? 'Factura rectificativa'
        : 'Nueva factura'
      : 'Nuevo presupuesto'
    : esFactura
      ? 'Factura (borrador)'
      : `Presupuesto ${f.number}`;

  const pie = (
    <>
      {existe && (
        <button
          type="button"
          className="btn ghost danger left"
          onClick={async () => {
            if (!confirmar) return setConfirmar(true);
            alCerrar();
            await borrar('invoices', f.id, esFactura ? 'Borrador eliminado' : 'Presupuesto eliminado');
          }}
        >
          <Icono n="trash" />
          {confirmar ? 'Pulsa otra vez para eliminar' : 'Eliminar'}
        </button>
      )}
      <button type="button" className="btn ghost" onClick={alCerrar}>
        Cancelar
      </button>
      {esFactura ? (
        <>
          <button type="submit" className="btn" disabled={guardando}>
            Guardar borrador <Ayuda k="borrador" />
          </button>
          <button type="button" className="btn primary" disabled={guardando} onClick={() => (confirmarEmitir ? void guardar(true) : setConfirmarEmitir(true))}>
            {confirmarEmitir ? 'Pulsa otra vez: ya no se podrá cambiar' : 'Emitir factura'}
          </button>
        </>
      ) : (
        <button type="submit" className="btn primary" disabled={guardando}>
          Guardar presupuesto
        </button>
      )}
    </>
  );

  return (
    <Modal titulo={titulo} alCerrar={alCerrar} ancho={860} comoFormulario={() => void guardar(false)} pie={pie}>
      <div className="modal-b block">
        {original && (
          <div className="warn lilac">
            Esta factura corrige la <b>{original.number}</b>. Los importes en negativo restan lo que se facturó. <Ayuda k="rect" />
          </div>
        )}
        <div className="fgrid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <label className="field">
            <span>¿A quién {esFactura ? 'le facturas' : 'se lo mandas'}?</span>
            <select
              className="input"
              id="iv-co"
              data-autofocus={!f.companyId || undefined}
              value={f.companyId ?? ''}
              aria-invalid={errorCliente || undefined}
              style={errorCliente ? { borderColor: 'var(--danger)' } : undefined}
              disabled={f.series === 'R'}
              onChange={(e) => elegirEmpresa(e.target.value)}
            >
              <option value="">— Elige un cliente —</option>
              {[...c.companies].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Proyecto (opcional)</span>
            <select className="input" value={f.projectId ?? ''} onChange={(e) => elegirProyecto(e.target.value)}>
              <option value="">— Ninguno —</option>
              {c.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {empresa && (
          <div className="hint">
            <Icono n="spark" />
            {Number(f.irpf) > 0
              ? `Como ${empresa.name} es una empresa, se aplica la retención del ${f.irpf} %.`
              : empresa.isPrivate
                ? 'Es un particular: esta factura va sin retención.'
                : 'Según tu forma de facturar: esta factura va sin retención.'}{' '}
            <Ayuda k="irpf" />
          </div>
        )}

        <div>
          <div className="sec-lbl">
            ¿Qué has hecho y cuánto cuesta?{' '}
            <span className="muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
              (sin IVA)
            </span>
          </div>
          <div className="lines">
            {mas && (
              <div className="line line-h" aria-hidden="true">
                <span>Concepto</span>
                <span>Cant.</span>
                <span>Precio (€)</span>
                <span className="sub">Subtotal</span>
                <span />
              </div>
            )}
            {lineas.map((l, i) => (
              <div className={`line ${mas ? '' : 'simple'}`} key={i}>
                <input
                  className="input"
                  data-linea={i}
                  data-autofocus={(i === 0 && Boolean(f.companyId)) || undefined}
                  value={l.desc}
                  maxLength={300}
                  placeholder="p. ej. Diseño de logotipo"
                  aria-label={`Concepto, línea ${i + 1}`}
                  onChange={(e) => linea(i, { desc: e.target.value })}
                />
                {mas && <input className="input num" type="number" step="any" inputMode="decimal" value={l.qty} aria-label={`Cantidad, línea ${i + 1}`} onChange={(e) => linea(i, { qty: e.target.value })} />}
                <input
                  className="input num"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={l.price}
                  placeholder="0,00 €"
                  aria-label={`Precio, línea ${i + 1}`}
                  onChange={(e) => linea(i, { price: e.target.value })}
                />
                {mas && <span className="sub num">{eur2((Number(l.qty) || 0) * (Number(l.price) || 0))}</span>}
                <button type="button" className="icon-btn" aria-label={`Quitar la línea ${i + 1}`} disabled={lineas.length < 2} onClick={() => setLineas((ls) => ls.filter((_, k) => k !== i))}>
                  <Icono n="x" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setLineas((ls) => [...ls, { desc: '', qty: '1', price: '' }])}>
            <Icono n="plus" />
            Añadir otra línea
          </button>
        </div>

        <div className="totals" aria-live="polite">
          <div>
            <span>
              Tu trabajo (sin IVA) <Ayuda k="base" />
            </span>
            <b>{eur2(t.base)}</b>
          </div>
          <div>
            <span>
              + IVA {f.iva} % <Ayuda k="iva" />
            </span>
            <b>{eur2(t.iva)}</b>
          </div>
          {Number(f.irpf) > 0 && (
            <div>
              <span>
                − Retención IRPF {f.irpf} % <Ayuda k="irpf" />
              </span>
              <b>−{eur2(t.irpf)}</b>
            </div>
          )}
          <div className="grand">
            <span>
              {esFactura ? 'Te ingresarán' : 'Total para el cliente'} <Ayuda k="ingresaran" />
            </span>
            <span>{eur2(t.total)}</span>
          </div>
        </div>

        <details className="more" open={mas} onToggle={(e) => setMas(e.currentTarget.open)}>
          <summary>
            <Icono n="right" />
            Más opciones <span className="muted">(fechas, cantidades, impuestos, notas)</span>
          </summary>
          <div className="fgrid">
            <label className="field">
              <span>Persona de contacto</span>
              <select className="input" value={f.contactId ?? ''} onChange={(e) => cambia({ contactId: e.target.value || null })}>
                <option value="">— Ninguna —</option>
                {c.contacts
                  .filter((x) => x.type !== 'Colaborador' && (!f.companyId || x.companyId === f.companyId))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Fecha</span>
              <input className="input" type="date" value={f.date} onChange={(e) => cambia({ date: e.target.value || f.date })} />
              {esFactura && <small className="muted">Al emitir se pone la fecha de hoy.</small>}
            </label>
            <label className="field">
              <span>{esFactura ? 'Fecha límite de pago' : 'Válido hasta'}</span>
              <input className="input" type="date" value={f.due ?? ''} onChange={(e) => cambia({ due: e.target.value || null })} />
            </label>
            <label className="field">
              <span>
                IVA <Ayuda k="iva" />
              </span>
              <select className="input" value={String(f.iva)} onChange={(e) => cambia({ iva: Number(e.target.value) })}>
                {TIPOS_IVA.map((x) => (
                  <option key={x} value={x}>
                    {x} %{x === 0 ? ' (sin IVA)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                Retención de IRPF <Ayuda k="irpf" />
              </span>
              <select className="input" value={String(f.irpf)} onChange={(e) => cambia({ irpf: Number(e.target.value) })}>
                {TIPOS_IRPF.map((x) => (
                  <option key={x} value={x}>
                    {x === 0 ? 'Sin retención' : `${x} %`}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                Número <Ayuda k="numero" />
              </span>
              <input className="input" value={f.number || (esFactura ? 'Se pone al emitir' : 'Se pone al guardar')} disabled />
            </label>
            <label className="field full">
              <span>Notas para el cliente</span>
              <textarea className="input" rows={2} maxLength={2000} value={f.notes} placeholder="Forma de pago, condiciones…" onChange={(e) => cambia({ notes: e.target.value })} />
            </label>
          </div>
          {Number(f.iva) === 0 && esFactura && (
            <div className="warn butter" style={{ marginTop: 10 }}>
              Una factura sin IVA debe indicar en las notas el motivo legal (por ejemplo, la exención que se aplica). Consúltalo con tu gestoría.
            </div>
          )}
        </details>
      </div>
    </Modal>
  );
}
