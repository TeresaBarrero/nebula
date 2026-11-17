'use client';

import { ESTADOS_CONTRATO } from '@/lib/catalogos/cliente';
import type { Proyecto } from '@/lib/datos/entidades';
import { relativa } from '@/lib/reglas/fechas';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Pill } from '@/components/crm/comunes';
import { Icono } from '@/components/ui/Icono';
import { useCliente } from './Cliente';

/** Caja «Contrato» del panel del proyecto (contractBox del prototipo). */
export function CajaContrato({ p }: { p: Proyecto }) {
  const { c, hoy } = useDatos();
  const acc = useCliente();
  const ks = c.contracts.filter((k) => k.projectId === p.id);
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="pen" />
          Contrato
        </h2>
        {ks[0] && <Pill cls={ESTADOS_CONTRATO[ks[0].status].cls}>{ESTADOS_CONTRATO[ks[0].status].label}</Pill>}
      </div>
      {ks.length ? (
        <div className="list">
          {ks.map((k) => (
            <button type="button" key={k.id} className="follow fila-boton" onClick={() => acc.verContrato(k.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{k.title}</b>
                <div className="chip">
                  {k.status === 'firmado' ? `Firmado por ${k.signedBy} · ${relativa(k.signedAt?.slice(0, 10) ?? null, hoy)}` : k.status === 'enviado' ? `Enviado ${relativa(k.sentAt, hoy).toLowerCase()}` : 'Sin enviar'}
                </div>
              </div>
              <Pill cls={ESTADOS_CONTRATO[k.status].cls}>{ESTADOS_CONTRATO[k.status].label}</Pill>
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="muted" style={{ margin: '0 0 10px' }}>
            Aún no hay contrato. Se genera solo con los datos del proyecto: plazos, precio, rondas y derechos.
          </p>
          <BotonContratoDe p={p} />
        </>
      )}
    </section>
  );
}


/** Abre el formulario de contrato ya rellenado con el proyecto. */
export function BotonContratoDe({ p }: { p: Proyecto }) {
  const { c } = useDatos();
  const abrir = useFormularios();
  const persona = c.contacts.find((x) => x.id === p.contactId);
  return (
    <button
      type="button"
      className="btn sm"
      onClick={() => abrir('contract', { title: `Contrato · ${p.name}`, type: 'proyecto', projectId: p.id, companyId: persona?.companyId ?? '', contactId: p.contactId ?? '' })}
    >
      <Icono n="pen" />
      Crear contrato
    </button>
  );
}
