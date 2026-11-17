'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { FASES_ABIERTAS, FASES_OPORTUNIDAD, FASES_PROYECTO } from '@/lib/catalogos/crm';
import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import type { Empresa } from '@/lib/datos/entidades';
import { TIPOS_RENOVACION } from '@/lib/catalogos/dinero';
import { eur } from '@/lib/reglas/dinero';
import { dineroEmpresa } from '@/lib/reglas/facturas';
import { fechaCorta } from '@/lib/reglas/fechas';
import { estadoRenovacion } from '@/lib/reglas/recurrentes';
import { CajaFacturas } from '@/components/dinero/Listas';
import { normalizar } from '@/lib/reglas/textos';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Avatar, CajaDocumentos, Pill, PillEstadoContacto, useCopiar } from '@/components/crm/comunes';
import { SeccionHistorial } from '@/components/crm/Historial';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

export default function Pagina() {
  return (
    <Suspense>
      <Empresas />
    </Suspense>
  );
}

function Empresas() {
  const { c } = useDatos();
  const abrir = useFormularios();
  const router = useRouter();
  const seleccionada = useSearchParams().get('id');
  const [q, setQ] = useState('');
  const lista = c.companies
    .filter((x) => !q || normalizar(`${x.name} ${x.sector} ${x.nif}`).includes(normalizar(q)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const actual = c.companies.find((x) => x.id === seleccionada) ?? lista[0] ?? null;

  const elegir = (id: string) => {
    router.replace(`/empresas?id=${id}`, { scroll: false });
    if (innerWidth < 860) setTimeout(() => document.getElementById('ficha')?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  return (
    <>
      <Cabecera
        antetitulo="Agenda"
        titulo="Empresas"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir('company')}>
            <Icono n="plus" />
            Nueva empresa
          </button>
        }
      >
        Todo lo de cada cliente en un sitio: personas, proyectos, oportunidades y documentos.
      </Cabecera>
      <div className="two">
        <aside className="card c-list" aria-label="Lista de empresas">
          <div className="search-box">
            <Icono n="search" />
            <input className="input" placeholder="Buscar empresa, sector o NIF" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar empresas" />
          </div>
          <div className="c-items">
            {lista.map((x) => {
              const n = c.contacts.filter((p) => p.companyId === x.id).length;
              return (
                <button key={x.id} type="button" className={`c-item ${x.id === actual?.id ? 'on' : ''}`} aria-current={x.id === actual?.id} onClick={() => elegir(x.id)}>
                  <Avatar id={x.id} nombre={x.name} cuadrado />
                  <div>
                    <span className="nm">{x.name}</span>
                    <span className="co">
                      {x.sector || 'Sin sector'} · {n} {n === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>
                </button>
              );
            })}
            {!lista.length && <div className="empty">{c.companies.length ? 'Ninguna coincide.' : 'Aún no tienes empresas.'}</div>}
          </div>
        </aside>
        {actual ? (
          <FichaEmpresa x={actual} />
        ) : (
          <div className="card empty">
            Crea tu primera empresa.
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn primary" onClick={() => abrir('company')}>
                <Icono n="plus" />
                Nueva empresa
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FichaEmpresa({ x }: { x: Empresa }) {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const copiar = useCopiar();
  const dinero = dineroEmpresa(c, x.id);
  const igualas = c.retainers.filter((r) => r.companyId === x.id);
  const renovaciones = c.renewals.filter((n) => n.companyId === x.id).sort((a, b) => a.renewDate.localeCompare(b.renewDate));
  const personas = c.contacts.filter((p) => p.companyId === x.id).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const ids = new Set(personas.map((p) => p.id));
  const proyectos = c.projects.filter((p) => p.contactId && ids.has(p.contactId));
  const abiertas = c.deals.filter((d) => d.companyId === x.id && FASES_ABIERTAS.includes(d.stage));
  const docs = c.files.filter((d) => d.companyId === x.id || (d.contactId && ids.has(d.contactId)));

  return (
    <div className="stack" id="ficha">
      <section className="card">
        <div className="c-head">
          <Avatar id={x.id} nombre={x.name} tam="lg" cuadrado />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2>{x.name}</h2>
            <div className="muted">
              {x.sector}
              {x.isPrivate && (
                <>
                  {x.sector ? ' · ' : ''}Particular <Ayuda k="irpf" />
                </>
              )}
            </div>
          </div>
          <button type="button" className="btn" onClick={() => abrir('company', { id: x.id })}>
            <Icono n="edit" />
            Editar
          </button>
        </div>
        <div className="c-actions">
          {x.email && (
            <button type="button" className="btn sm" onClick={() => copiar(x.email)} title="Copiar email">
              <Icono n="mail" />
              {x.email}
            </button>
          )}
          {x.phone && (
            <button type="button" className="btn sm" onClick={() => copiar(x.phone)} title="Copiar teléfono">
              <Icono n="phone" />
              {x.phone}
            </button>
          )}
          <button type="button" className="btn sm" onClick={() => abrir('contact', { companyId: x.id })}>
            <Icono n="users" />
            Persona
          </button>
          <button type="button" className="btn sm primary" onClick={() => abrir('deal', { companyId: x.id, contactId: personas[0]?.id ?? '' })}>
            <Icono n="funnel" />
            Oportunidad
          </button>
        </div>
        <dl className="info">
          <div>
            <dt>NIF / CIF</dt>
            <dd>{x.nif || '—'}</dd>
          </div>
          <div>
            <dt>Web</dt>
            <dd>{x.web || '—'}</dd>
          </div>
          <div className="full">
            <dt>Dirección para facturas</dt>
            <dd>{x.address || '—'}</dd>
          </div>
          {x.notes && (
            <div className="full">
              <dt>Observaciones</dt>
              <dd>{x.notes}</dd>
            </div>
          )}
        </dl>
        <p className="foot-note">El portal del cliente, el kit de marca y sus accesos llegan en las Fases 3 y 4.</p>
          <div>
            <dt>Le has facturado</dt>
            <dd className="num">{eur(dinero.facturado)} <span className="muted">sin IVA</span></dd>
          </div>
          <div>
            <dt>Te debe</dt>
            <dd className="num" style={{ color: dinero.teDebe > 0 ? 'var(--danger)' : 'inherit' }}>
              {eur(dinero.teDebe)}
            </dd>
          </div>
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        <section className="card">
          <div className="card-h">
            <h2>
              <Icono n="users" />
              Personas
            </h2>
            <button type="button" className="text-link" onClick={() => abrir('contact', { companyId: x.id })}>
              + Añadir
            </button>
          </div>
          <div className="list">
            {personas.map((p) => (
              <Link className="follow fila-boton" key={p.id} href={`/contactos?id=${p.id}`}>
                <Avatar id={p.id} nombre={p.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.name}</b>
                  <div className="chip">{p.role || p.type}</div>
                </div>
                <PillEstadoContacto s={p.status} />
              </Link>
            ))}
            {!personas.length && <div className="empty">Sin personas.</div>}
          </div>
        </section>
        <section className="card">
          <div className="card-h">
            <h2>
              <Icono n="folder" />
              Proyectos y oportunidades
            </h2>
          </div>
          <div className="list">
            {proyectos.map((p) => (
              <Link className="follow fila-boton" key={p.id} href={`/proyectos?p=${p.id}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.name}</b>
                  <div className="chip">{p.discipline ? DISCIPLINAS[p.discipline].label : 'Proyecto'}</div>
                </div>
                <Pill cls={FASES_PROYECTO[p.status].cls}>{FASES_PROYECTO[p.status].label}</Pill>
              </Link>
            ))}
            {abiertas.map((d) => (
              <button type="button" className="follow fila-boton" key={d.id} onClick={() => abrir('deal', { id: d.id })}>
                <span className="tl-ic mist">
                  <Icono n="funnel" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{d.title}</b>
                  <div className="chip ajusta">
                    Oportunidad · {FASES_OPORTUNIDAD[d.stage].label} · {eur(d.value)}
                  </div>
                </div>
              </button>
            ))}
            {!proyectos.length && !abiertas.length && <div className="empty">Sin proyectos ni oportunidades abiertas.</div>}
          </div>
        </section>
        <section className="card">
          <div className="card-h">
            <h2>
              <Icono n="repeat" />
              Igualas y renovaciones
            </h2>
            <button type="button" className="text-link" onClick={() => abrir('retainer', { companyId: x.id, contactId: personas[0]?.id ?? '' })}>
              + Iguala
            </button>
          </div>
          <div className="list">
            {igualas.map((r) => (
              <button type="button" className="follow fila-boton" key={r.id} onClick={() => abrir('retainer', { id: r.id })}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{r.name}</b>
                  <div className="chip">{r.active ? `Factura el día ${r.billingDay}` : 'Pausada'}</div>
                </div>
                <b className="num">{eur(r.fee)}/mes</b>
              </button>
            ))}
            {renovaciones.map((n) => {
              const st = estadoRenovacion(n, hoy);
              return (
                <button type="button" className="follow fila-boton" key={n.id} onClick={() => abrir('renewal', { id: n.id })}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{n.name}</b>
                    <div className="chip">
                      {TIPOS_RENOVACION[n.type].label} · renueva el {fechaCorta(n.renewDate)}
                    </div>
                  </div>
                  <Pill cls={st.cls}>{st.label}</Pill>
                </button>
              );
            })}
            {!igualas.length && !renovaciones.length && <div className="empty">Sin igualas ni renovaciones.</div>}
          </div>
        </section>
        <CajaFacturas facturas={c.invoices.filter((f) => f.companyId === x.id)} nueva={{ companyId: x.id, contactId: personas[0]?.id ?? null }} />
        <CajaDocumentos docs={docs} vinculo={{ companyId: x.id, contactId: null, projectId: null }} />
      </div>

      <SeccionHistorial filtro={{ companyId: x.id }} titulo="Historial de la empresa" limite={16} />
    </div>
  );
}
