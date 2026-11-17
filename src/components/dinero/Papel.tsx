'use client';

import type { Factura } from '@/lib/datos/entidades';
import { eur2 } from '@/lib/reglas/dinero';
import { totales } from '@/lib/reglas/facturas';
import { fechaLargaDe } from '@/lib/reglas/fechas';
import { useDatos } from '@/components/app/Datos';
import { useNebula } from '@/components/app/Nebula';
import type { ClaveAyuda } from '@/lib/catalogos/ayuda';
import { Ayuda } from '@/components/ui/Ayuda';

/** Título del documento según su tipo. */
export function tituloDocumento(f: Factura): string {
  if (f.kind === 'presupuesto') return 'Presupuesto';
  if (f.series === 'R') return 'Factura rectificativa';
  return f.status === 'borrador' ? 'Borrador de factura' : 'Factura';
}

/**
 * El documento tal y como lo verá el cliente (y el PDF).
 * Una factura emitida usa los datos copiados al emitir; un borrador, los datos actuales.
 */
export function Papel({ f, ayudas = true }: { f: Factura; ayudas?: boolean }) {
  const { c } = useDatos();
  const { ajustes } = useNebula();
  const t = totales(f);
  const empresa = c.companies.find((e) => e.id === f.companyId);
  const contacto = c.contacts.find((x) => x.id === f.contactId);
  const original = c.invoices.find((x) => x.id === f.rectifiesId);
  const cliente = f.client ?? (empresa ? { name: empresa.name, nif: empresa.nif, address: empresa.address } : null);
  const emisor = f.issuer ?? { legalName: ajustes.legalName || ajustes.business, nif: ajustes.nif, address: ajustes.address, iban: ajustes.iban };
  const esFactura = f.kind === 'factura';
  const A = (k: ClaveAyuda) => (ayudas ? <Ayuda k={k} /> : null);

  return (
    <article className="paper">
      <div className="paper-h">
        <div>
          <h3>{tituloDocumento(f)}</h3>
          <div className="muted">{f.number ? `Nº ${f.number}` : 'Sin número (borrador)'}</div>
          {original && <div className="muted">Rectifica a la factura {original.number}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>
            Fecha: <b>{fechaLargaDe(f.date)}</b>
          </div>
          <div>
            {esFactura ? 'Pagar antes del' : 'Válido hasta'}: <b>{fechaLargaDe(f.due)}</b>
          </div>
        </div>
      </div>
      <dl className="who">
        <div>
          <dt>De</dt>
          <dd>
            <b>{emisor.legalName || '—'}</b>
            <br />
            NIF {emisor.nif || '—'}
            <br />
            {emisor.address}
          </dd>
        </div>
        <div>
          <dt>Para</dt>
          <dd>
            {cliente ? (
              <>
                <b>{cliente.name}</b>
                <br />
                NIF {cliente.nif || '—'}
                <br />
                {cliente.address}
              </>
            ) : (
              '—'
            )}
            {contacto && (
              <>
                <br />A la atención de {contacto.name}
              </>
            )}
          </dd>
        </div>
      </dl>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="amt">Cant.</th>
              <th className="amt">Precio</th>
              <th className="amt">Importe</th>
            </tr>
          </thead>
          <tbody>
            {f.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.desc}</td>
                <td className="amt" style={{ fontWeight: 500 }}>
                  {String(l.qty).replace('.', ',')}
                </td>
                <td className="amt" style={{ fontWeight: 500 }}>
                  {eur2(l.price)}
                </td>
                <td className="amt">{eur2(l.qty * l.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="totals">
        <div>
          <span>Base imponible {A('base')}</span>
          <b>{eur2(t.base)}</b>
        </div>
        <div>
          <span>
            IVA {f.iva} % {A('iva')}
          </span>
          <b>{eur2(t.iva)}</b>
        </div>
        {Number(f.irpf) > 0 && (
          <div>
            <span>
              Retención IRPF {f.irpf} % {A('irpf')}
            </span>
            <b>−{eur2(t.irpf)}</b>
          </div>
        )}
        <div className="grand">
          <span>Total</span>
          <span>{eur2(t.total)}</span>
        </div>
      </div>
      {esFactura ? (
        <div className="muted">
          {emisor.iban ? `Forma de pago: transferencia a ${emisor.iban}` : 'Forma de pago: transferencia bancaria'}
          {f.notes && (
            <>
              <br />
              {f.notes}
            </>
          )}
        </div>
      ) : (
        f.notes && <div className="muted">{f.notes}</div>
      )}
      {esFactura && (
        <div className="vf">
          <span className="qr" aria-hidden="true">
            QR
          </span>
          <span>Hueco reservado para el código QR de Hacienda (Verifactu). Se activará antes de usar nebúla para facturar de verdad.</span>
        </div>
      )}
    </article>
  );
}
