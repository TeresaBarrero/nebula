'use client';

import { useState } from 'react';
import type { Acceso, Empresa } from '@/lib/datos/entidades';
import { coloresDe, marcaDe } from '@/lib/reglas/trabajo';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Icono } from '@/components/ui/Icono';
import { useCopiar } from './comunes';

/** Kit de marca: muestras de color que se copian al pulsar, tipografías, tono y manual (SPEC §6.5). */
export function KitDeMarca({ e }: { e: Empresa }) {
  const abrir = useFormularios();
  const copiar = useCopiar();
  const m = marcaDe(e);
  const colores = coloresDe(m);
  const vacio = !colores.length && !m.fonts && !m.tone && !m.manual;
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="palette" />
          Kit de marca
        </h2>
        <button type="button" className="text-link" onClick={() => abrir('brand', { id: e.id })}>
          Editar
        </button>
      </div>
      {vacio ? (
        <div className="empty">Añade sus colores, tipografías y tono.</div>
      ) : (
        <>
          {colores.length > 0 && (
            <div className="brand-colors">
              {colores.map((h) => (
                <button type="button" key={h} className="brand-sw" title={`Copiar ${h}`} aria-label={`Copiar el color ${h}`} onClick={() => copiar(h)}>
                  <i style={{ background: h }} />
                  {h}
                </button>
              ))}
            </div>
          )}
          <dl className="info" style={{ gridTemplateColumns: '1fr' }}>
            {m.fonts && (
              <div>
                <dt>Tipografías</dt>
                <dd>{m.fonts}</dd>
              </div>
            )}
            {m.tone && (
              <div>
                <dt>Tono</dt>
                <dd>{m.tone}</dd>
              </div>
            )}
            {m.manual && (
              <div>
                <dt>Manual de marca</dt>
                <dd>{m.manual}</dd>
              </div>
            )}
          </dl>
        </>
      )}
    </section>
  );
}

/** Accesos del cliente: la contraseña va cifrada y se muestra o copia solo al pedirla (SPEC §4.13 y §10). */
export function Accesos({ e }: { e: Empresa }) {
  const { c } = useDatos();
  const abrir = useFormularios();
  const lista = c.accesses.filter((a) => a.companyId === e.id).sort((a, b) => a.service.localeCompare(b.service, 'es'));
  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="key" />
          Accesos
        </h2>
        <button type="button" className="text-link" onClick={() => abrir('access', { companyId: e.id })}>
          + Añadir
        </button>
      </div>
      <div className="list">
        {lista.map((a) => (
          <FilaAcceso key={a.id} a={a} />
        ))}
        {!lista.length && <div className="empty">Guarda aquí los accesos a su web, hosting y redes. Las contraseñas van cifradas.</div>}
      </div>
    </section>
  );
}

function FilaAcceso({ a }: { a: Acceso }) {
  const { verClave } = useDatos();
  const abrir = useFormularios();
  const copiar = useCopiar();
  const [clave, setClave] = useState<string | null>(null);
  const mostrar = async () => {
    if (clave !== null) return setClave(null);
    setClave(await verClave(a.id));
  };
  const copiarClave = async () => {
    const v = clave ?? (await verClave(a.id));
    if (v) copiar(v);
  };
  return (
    <div className="acc">
      <div style={{ minWidth: 0, flex: 1 }}>
        <b>{a.service}</b>
        {a.url && <div className="chip">{a.url}</div>}
        <div className="acc-row">
          {a.username && (
            <button type="button" className="chip link" title="Copiar usuario" onClick={() => copiar(a.username)}>
              <Icono n="user" />
              {a.username}
            </button>
          )}
          {a.hasPassword ? (
            <button type="button" className="chip link num" title="Copiar contraseña" aria-label={`Copiar la contraseña de ${a.service}`} onClick={() => void copiarClave()}>
              <Icono n="key" />
              {clave ?? '••••••••'}
            </button>
          ) : (
            <span className="chip">Sin contraseña</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        {a.hasPassword && (
          <button type="button" className="icon-btn" onClick={() => void mostrar()} aria-label={clave !== null ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={clave !== null}>
            <Icono n="eye" />
          </button>
        )}
        <button type="button" className="icon-btn" onClick={() => abrir('access', { id: a.id })} aria-label={`Editar el acceso ${a.service}`}>
          <Icono n="edit" />
        </button>
      </div>
    </div>
  );
}
