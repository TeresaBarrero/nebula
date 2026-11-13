'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { DISPONIBILIDAD, ESTADOS_CONTACTO, FASES_OPORTUNIDAD, FASES_PROYECTO } from '@/lib/catalogos/crm';
import type { Contacto } from '@/lib/datos/entidades';
import { eur } from '@/lib/reglas/dinero';
import { diasHasta, fechaLargaDe, relativa } from '@/lib/reglas/fechas';
import { empresaDe, ultimoContacto } from '@/lib/reglas/historial';
import { porFecha } from '@/lib/reglas/tareas';
import { normalizar } from '@/lib/reglas/textos';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Avatar, BarraFases, CajaDocumentos, FilaTarea, Pill, PillDisciplina, PillEstadoContacto, useCopiar } from '@/components/crm/comunes';
import { EscribirCorreo, SeccionHistorial } from '@/components/crm/Historial';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

type FiltroLista = 'all' | 'activo' | 'potencial' | 'colab' | 'inactivo';
const FILTROS: [FiltroLista, string][] = [
  ['all', 'Todos'],
  ['activo', 'Clientes'],
  ['potencial', 'Potenciales'],
  ['colab', 'Colaboradores'],
  ['inactivo', 'Inactivos'],
];
const pasa = (f: FiltroLista, x: Contacto) => f === 'all' || (f === 'colab' ? x.type === 'Colaborador' : x.status === f && x.type !== 'Colaborador');

export default function Pagina() {
  return (
    <Suspense>
      <Contactos />
    </Suspense>
  );
}

function Contactos() {
  const { c } = useDatos();
  const abrir = useFormularios();
  const router = useRouter();
  const seleccionado = useSearchParams().get('id');
  const [filtro, setFiltro] = useState<FiltroLista>('all');
  const [q, setQ] = useState('');

  const lista = c.contacts
    .filter((x) => pasa(filtro, x))
    .filter((x) => !q || normalizar(`${x.name} ${empresaDe(c, x)} ${x.tags.join(' ')} ${x.type} ${x.email}`).includes(normalizar(q)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const actual = c.contacts.find((x) => x.id === seleccionado) ?? lista[0] ?? null;

  const elegir = (id: string) => {
    router.replace(`/contactos?id=${id}`, { scroll: false });
    if (innerWidth < 860) setTimeout(() => document.getElementById('ficha')?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  return (
    <>
      <Cabecera
        antetitulo="Agenda"
        titulo="Contactos"
        acciones={
          <button type="button" className="btn primary" onClick={() => abrir('contact')}>
            <Icono n="plus" />
            Nuevo contacto
          </button>
        }
      >
        {c.contacts.length} {c.contacts.length === 1 ? 'persona' : 'personas'}: clientes, proveedores y colaboradores.
      </Cabecera>
      <div className="two">
        <aside className="card c-list" aria-label="Lista de contactos">
          <div className="search-box">
            <Icono n="search" />
            <input className="input" placeholder="Buscar por nombre, empresa o etiqueta" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar contactos" />
          </div>
          <div className="seg" role="group" aria-label="Filtrar">
            {FILTROS.map(([f, l]) => (
              <button key={f} type="button" className={filtro === f ? 'on' : ''} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                {l} <span className="n">{c.contacts.filter((x) => pasa(f, x)).length}</span>
              </button>
            ))}
          </div>
          <div className="c-items">
            {lista.map((x) => (
              <button key={x.id} type="button" className={`c-item ${x.id === actual?.id ? 'on' : ''}`} aria-current={x.id === actual?.id} onClick={() => elegir(x.id)}>
                <Avatar id={x.id} nombre={x.name} />
                <div>
                  <span className="nm">{x.name}</span>
                  <span className="co">
                    {empresaDe(c, x) || 'Sin empresa'} · {x.type}
                  </span>
                </div>
                <span className="sdot" title={ESTADOS_CONTACTO[x.status].label} style={{ background: ESTADOS_CONTACTO[x.status].dot }} />
              </button>
            ))}
            {!lista.length && <div className="empty">{c.contacts.length ? 'Nadie en este filtro.' : 'Aún no tienes contactos.'}</div>}
          </div>
        </aside>
        {actual ? (
          <FichaContacto x={actual} />
        ) : (
          <div className="card empty">
            Crea tu primer contacto para empezar.
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn primary" onClick={() => abrir('contact')}>
                <Icono n="plus" />
                Nuevo contacto
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FichaContacto({ x }: { x: Contacto }) {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const copiar = useCopiar();
  const toast = useToast();
  const [correo, setCorreo] = useState(false);
  const empresa = c.companies.find((e) => e.id === x.companyId);
  const colab = x.type === 'Colaborador';
  const proyectos = c.projects.filter((p) => p.contactId === x.id || p.collaborators.includes(x.id));
  const tareas = c.tasks.filter((t) => (t.contactId === x.id || t.assigneeId === x.id) && !t.done).sort(porFecha);
  const oportunidades = c.deals.filter((d) => d.contactId === x.id);
  const ultimo = ultimoContacto(c, x.id, hoy);

  return (
    <div className="stack" id="ficha">
      <section className="card">
        <div className="c-head">
          <Avatar id={x.id} nombre={x.name} tam="lg" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2>{x.name}</h2>
            <div className="muted">
              {x.role}
              {empresa && (
                <>
                  {x.role ? ' en ' : ''}
                  <Link className="text-link" href={`/empresas?id=${empresa.id}`}>
                    {empresa.name}
                  </Link>
                </>
              )}
            </div>
            <div className="tags" style={{ marginTop: 8 }}>
              <Pill cls="mist">{x.type}</Pill>
              {colab ? (
                <>
                  {x.availability && <Pill cls={DISPONIBILIDAD[x.availability].cls}>{DISPONIBILIDAD[x.availability].label}</Pill>}
                  <PillDisciplina d={x.specialty} />
                </>
              ) : (
                <PillEstadoContacto s={x.status} />
              )}
              {!x.consent && <Pill cls="rose">Sin permiso de datos</Pill>}
            </div>
          </div>
          <button type="button" className="btn" onClick={() => abrir('contact', { id: x.id })}>
            <Icono n="edit" />
            Editar
          </button>
        </div>
        <div className="c-actions">
          {x.phone && (
            <button type="button" className="btn sm" onClick={() => copiar(x.phone)} title="Copiar teléfono">
              <Icono n="phone" />
              {x.phone}
            </button>
          )}
          {x.email && (
            <button type="button" className="btn sm" onClick={() => copiar(x.email)} title="Copiar email">
              <Icono n="mail" />
              {x.email}
            </button>
          )}
          <button type="button" className="btn sm primary" onClick={() => setCorreo(true)}>
            <Icono n="send" />
            Escribir
          </button>
          <button type="button" className="btn sm" onClick={() => abrir('task', { contactId: x.id })}>
            <Icono n="check" />
            Tarea
          </button>
          <button type="button" className="btn sm" onClick={() => abrir('event', { contactId: x.id, title: `Reunión con ${x.name.split(' ')[0]}` })}>
            <Icono n="calendar" />
            Reunión
          </button>
          {!colab && (
            <button type="button" className="btn sm" onClick={() => abrir('deal', { contactId: x.id, companyId: x.companyId ?? '' })}>
              <Icono n="funnel" />
              Oportunidad
            </button>
          )}
        </div>
        <dl className="info">
          {colab ? (
            <div>
              <dt>Tarifa</dt>
              <dd>{x.rate ? `${eur(x.rate)}/hora` : '—'}</dd>
            </div>
          ) : (
            <div>
              <dt>DNI / NIF</dt>
              <dd>{x.nif || '—'}</dd>
            </div>
          )}
          <div>
            <dt>Último contacto</dt>
            <dd>{ultimo ? `${relativa(ultimo, hoy)} (hace ${-diasHasta(ultimo, hoy)} días)` : '—'}</dd>
          </div>
          {x.tags.length > 0 && (
            <div className="full">
              <dt>Etiquetas</dt>
              <dd className="tags" style={{ marginTop: 4 }}>
                {x.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {x.notes && (
            <div className="full">
              <dt>Observaciones</dt>
              <dd>{x.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
        {!colab && (
          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="funnel" />
                Oportunidades
              </h2>
              <button type="button" className="text-link" onClick={() => abrir('deal', { contactId: x.id, companyId: x.companyId ?? '' })}>
                + Añadir
              </button>
            </div>
            <div className="list">
              {oportunidades.map((d) => (
                <button type="button" className="follow fila-boton" key={d.id} onClick={() => abrir('deal', { id: d.id })}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{d.title}</b>
                  </div>
                  <Pill cls={FASES_OPORTUNIDAD[d.stage].cls}>{FASES_OPORTUNIDAD[d.stage].label}</Pill>
                  <b className="num">{eur(d.value)}</b>
                </button>
              ))}
              {!oportunidades.length && <div className="empty">Sin oportunidades.</div>}
            </div>
          </section>
        )}
        <section className="card">
          <div className="card-h">
            <h2>
              <Icono n="folder" />
              Proyectos
            </h2>
          </div>
          <div className="list">
            {proyectos.map((p) => (
              <Link className="proj-mini" key={p.id} href={`/proyectos?p=${p.id}`}>
                <div className="row">
                  <b>{p.name}</b>
                  <Pill cls={FASES_PROYECTO[p.status].cls}>{FASES_PROYECTO[p.status].label}</Pill>
                </div>
                <BarraFases p={p} />
              </Link>
            ))}
            {!proyectos.length && <div className="empty">Sin proyectos.</div>}
          </div>
        </section>
        <section className="card">
          <div className="card-h">
            <h2>
              <Icono n="check" />
              Tareas abiertas
            </h2>
            <button type="button" className="text-link" onClick={() => abrir('task', { contactId: x.id })}>
              + Añadir
            </button>
          </div>
          <div className="list">
            {tareas.map((t) => (
              <FilaTarea key={t.id} t={t} sinContacto punto />
            ))}
            {!tareas.length && <div className="empty">Sin tareas pendientes.</div>}
          </div>
        </section>
        <CajaDocumentos docs={c.files.filter((d) => d.contactId === x.id)} vinculo={{ contactId: x.id, companyId: x.companyId, projectId: null }} />
      </div>

      <SeccionHistorial filtro={{ contactId: x.id }} registrar={{ contactId: x.id }} />

      <section className="card">
        <div className="card-h">
          <h2>
            <Icono n="shield" />
            Protección de datos <Ayuda k="rgpd" />
          </h2>
        </div>
        <div className="rgpd">
          <div className={`state ${x.consent ? 'sage' : 'rose'}`}>
            {x.consent ? (
              <>
                <b>Tienes su permiso</b>
                Desde el {fechaLargaDe(x.consentDate)} · vía {x.consentVia || '—'}
              </>
            ) : (
              <>
                <b>No tienes su permiso registrado</b>
                Antes de enviarle comunicaciones, apunta cómo y cuándo te dio permiso.
              </>
            )}
          </div>
          <div className="acts">
            {!x.consent && (
              <button type="button" className="btn sm" onClick={() => abrir('contact', { id: x.id, consent: true, consentDate: hoy, consentVia: 'Email' })}>
                <Icono n="tick" />
                Apuntar permiso
              </button>
            )}
            <button type="button" className="btn sm" onClick={() => toast('«Darle sus datos» llega en la Fase 5')}>
              <Icono n="download" />
              Darle sus datos
            </button>
            <button type="button" className="btn sm danger" onClick={() => toast('«Borrar sus datos» llega en la Fase 5')}>
              <Icono n="trash" />
              Borrar sus datos
            </button>
          </div>
        </div>
      </section>
      {correo && <EscribirCorreo contacto={x} alCerrar={() => setCorreo(false)} />}
    </div>
  );
}
