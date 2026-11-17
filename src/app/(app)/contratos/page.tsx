'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { ESTADOS_CONTRATO, TIPOS_CONTRATO } from '@/lib/catalogos/cliente';
import type { EstadoContrato } from '@/lib/datos/entidades';
import { fechaCorta } from '@/lib/reglas/fechas';
import { empresaDe } from '@/lib/reglas/historial';
import { enMarcha } from '@/lib/reglas/proyectos';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { useCliente } from '@/components/cliente/Cliente';
import { Pill } from '@/components/crm/comunes';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { BotonContratoDe } from '@/components/cliente/CajaContrato';

const ORDEN: Record<EstadoContrato, number> = { enviado: 0, borrador: 1, firmado: 2 };

export default function Pagina() {
  return (
    <Suspense>
      <Contratos />
    </Suspense>
  );
}

/** Contratos (SPEC §6.12): se generan con los datos y el cliente los firma desde su portal. */
function Contratos() {
  const { c } = useDatos();
  const abrir = useFormularios();
  const acc = useCliente();
  const abrirId = useSearchParams().get('id');
  useEffect(() => {
    if (abrirId && c.contracts.some((k) => k.id === abrirId)) acc.verContrato(abrirId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirId]);

  const lista = [...c.contracts].sort((a, b) => ORDEN[a.status] - ORDEN[b.status] || (b.sentAt ?? '').localeCompare(a.sentAt ?? ''));
  const sinContrato = c.projects.filter((p) => enMarcha(p) && !c.contracts.some((k) => k.projectId === p.id));
  const cuenta = (s: EstadoContrato) => c.contracts.filter((k) => k.status === s).length;

  return (
    <>
      <Cabecera
        antetitulo="Trabajo"
        titulo="Contratos"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir('contract')}>
            <Icono n="plus" />
            Nuevo contrato
          </button>
        }
      >
        Se rellenan solos con los datos del proyecto (plazos, precio, rondas de cambios y derechos) y el cliente los firma online desde su portal.
      </Cabecera>
      <div className="stats">
        <div className="stat butter">
          <span className="k">Pendientes de firma</span>
          <span className="v num">{cuenta('enviado')}</span>
          <span className="s">Enviados al cliente</span>
        </div>
        <div className="stat mist">
          <span className="k">Borradores</span>
          <span className="v num">{cuenta('borrador')}</span>
          <span className="s">Sin enviar</span>
        </div>
        <div className="stat sage">
          <span className="k">Firmados</span>
          <span className="v num">{cuenta('firmado')}</span>
          <span className="s">Clientes y colaboradores</span>
        </div>
        <div className={`stat ${sinContrato.length ? 'rose' : 'lilac'}`}>
          <span className="k">Proyectos sin contrato</span>
          <span className="v num">{sinContrato.length}</span>
          <span className="s">{sinContrato.length ? sinContrato.slice(0, 2).map((p) => p.name).join(', ') : 'Todo cubierto'}</span>
        </div>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Tipo</th>
                <th>Con</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((k) => (
                <tr key={k.id} tabIndex={0} onClick={() => acc.verContrato(k.id)} onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && acc.verContrato(k.id)}>
                  <td>
                    <b>{k.title}</b>
                  </td>
                  <td>{TIPOS_CONTRATO[k.type].label}</td>
                  <td>{c.companies.find((e) => e.id === k.companyId)?.name ?? c.contacts.find((x) => x.id === k.contactId)?.name ?? '—'}</td>
                  <td>
                    <Pill cls={ESTADOS_CONTRATO[k.status].cls}>{ESTADOS_CONTRATO[k.status].label}</Pill>
                  </td>
                  <td className="num">{fechaCorta(k.signedAt?.slice(0, 10) ?? k.sentAt)}</td>
                  <td>
                    {k.status === 'borrador' && (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void acc.enviarContrato(k);
                        }}
                      >
                        Enviar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={6} className="empty">
                    Aún no tienes contratos. Crea uno desde un proyecto o con «Nuevo contrato».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {sinContrato.length > 0 && (
        <section className="card">
          <div className="card-h">
            <h2>Proyectos en marcha sin contrato</h2>
          </div>
          <div className="list">
            {sinContrato.map((p) => (
              <div className="follow" key={p.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.name}</b>
                  <div className="chip">{empresaDe(c, c.contacts.find((x) => x.id === p.contactId))}</div>
                </div>
                <BotonContratoDe p={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
