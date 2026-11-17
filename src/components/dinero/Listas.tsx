'use client';

import { ESTADOS_FACTURA } from '@/lib/catalogos/dinero';
import type { Factura, Gasto } from '@/lib/datos/entidades';
import { eur, eur2 } from '@/lib/reglas/dinero';
import { estadoDe, totalesDe } from '@/lib/reglas/facturas';
import { relativa } from '@/lib/reglas/fechas';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Pill } from '@/components/crm/comunes';
import { Icono } from '@/components/ui/Icono';
import { useDinero } from './Dinero';

/** Fila corta de factura o presupuesto (invRow del prototipo). */
export function FilaFactura({ f }: { f: Factura }) {
  const { c, hoy } = useDatos();
  const acc = useDinero();
  const st = estadoDe(c, f, hoy);
  return (
    <button type="button" className="follow fila-boton" onClick={() => acc.ver(f.id)}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{f.number || 'Borrador'}</b> <span className="muted">· {f.lines[0]?.desc ?? ''}</span>
      </div>
      <Pill cls={ESTADOS_FACTURA[st].cls}>{f.kind === 'presupuesto' && st === 'borrador' ? 'Presupuesto' : ESTADOS_FACTURA[st].label}</Pill>
      <b className="num">{eur2(totalesDe(c, f).total)}</b>
    </button>
  );
}

/** Tarjeta «Facturas y presupuestos» con «+ Añadir». */
export function CajaFacturas({ facturas, nueva }: { facturas: Factura[]; nueva: Partial<Factura> }) {
  const acc = useDinero();
  const orden = [...facturas].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="receipt" />
          Facturas y presupuestos
        </h2>
        <button type="button" className="text-link" onClick={() => acc.nueva('factura', nueva)}>
          + Añadir
        </button>
      </div>
      <div className="list">
        {orden.map((f) => (
          <FilaFactura key={f.id} f={f} />
        ))}
        {!orden.length && <div className="empty">Sin documentos.</div>}
      </div>
    </section>
  );
}

/** Tarjeta de gastos vinculados con «+ Añadir». */
export function CajaGastos({ gastos, nuevo, titulo = 'Gastos del proyecto' }: { gastos: Gasto[]; nuevo: Partial<Gasto>; titulo?: string }) {
  const { hoy } = useDatos();
  const abrir = useFormularios();
  const orden = [...gastos].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="wallet" />
          {titulo}
        </h2>
        <button type="button" className="text-link" onClick={() => abrir('expense', nuevo)}>
          + Añadir
        </button>
      </div>
      <div className="list">
        {orden.map((g) => (
          <button type="button" className="follow fila-boton" key={g.id} onClick={() => abrir('expense', { id: g.id })}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{g.concept}</b>
              <div className="chip">
                {g.supplier} · {relativa(g.date, hoy)}
              </div>
            </div>
            <b className="num">{eur(g.base)}</b>
          </button>
        ))}
        {!orden.length && <div className="empty">Sin gastos asociados.</div>}
      </div>
    </section>
  );
}
