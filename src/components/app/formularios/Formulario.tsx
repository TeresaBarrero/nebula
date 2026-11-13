'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { FASES_OPORTUNIDAD } from '@/lib/catalogos/crm';
import type { FaseOportunidad, NombreColeccion } from '@/lib/datos/entidades';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';
import { ahoraISO, nuevoId, useDatos } from '../Datos';
import { aEntidad, aValores, porDefecto } from './conversion';
import { DEFINICIONES, opcionesDe, type Campo, type TipoForm, type Valores } from './definiciones';

type Abrir = (tipo: TipoForm, datos?: Record<string, unknown>) => void;
const Ctx = createContext<Abrir>(() => {});

/** Abre el formulario para crear (sin `id`) o editar (con el `id` de algo que ya existe). */
export const useFormularios = () => useContext(Ctx);

export function ProveedorFormularios({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState<{ tipo: TipoForm; datos: Record<string, unknown>; n: number } | null>(null);
  const abrir = useCallback<Abrir>((tipo, datos = {}) => setAbierto((a) => ({ tipo, datos, n: (a?.n ?? 0) + 1 })), []);
  return (
    <Ctx value={abrir}>
      {children}
      {abierto && <Formulario key={abierto.n} tipo={abierto.tipo} datos={abierto.datos} alCerrar={() => setAbierto(null)} />}
    </Ctx>
  );
}

function Formulario({ tipo, datos, alCerrar }: { tipo: TipoForm; datos: Record<string, unknown>; alCerrar: () => void }) {
  const { c, hoy, crear, actualizar, borrar } = useDatos();
  const toast = useToast();
  const def = DEFINICIONES[tipo];
  const filas = c[def.col] as unknown as Record<string, unknown>[];
  const previo = typeof datos.id === 'string' ? (filas.find((f) => f.id === datos.id) ?? null) : null;
  const [v, setV] = useState<Valores>(() => aValores(tipo, { ...porDefecto(tipo, hoy), ...(previo ?? {}), ...datos }));
  const [errores, setErrores] = useState<Record<string, boolean>>({});
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [masOpciones, setMasOpciones] = useState(false);

  const cambia = (k: string, x: string | boolean) =>
    setV((ant) => {
      const n: Valores = { ...ant, [k]: x };
      // Ayudas automáticas, como en el prototipo.
      if (tipo === 'deal' && k === 'stage') n.prob = String(FASES_OPORTUNIDAD[x as FaseOportunidad].p);
      if (tipo === 'deal' && k === 'contactId' && x && !ant.companyId) n.companyId = c.contacts.find((p) => p.id === x)?.companyId ?? '';
      if (tipo === 'deal' && k === 'companyId' && ant.contactId && c.contacts.find((p) => p.id === ant.contactId)?.companyId !== x) n.contactId = '';
      if (tipo === 'contact' && k === 'consent' && x === true && !ant.consentDate) n.consentDate = hoy;
      return n;
    });

  const visibles = def.campos.filter((f) => !f.visible || f.visible(v));
  const normales = visibles.filter((f) => !('avanzado' in f && f.avanzado));
  const avanzados = visibles.filter((f) => 'avanzado' in f && f.avanzado);

  const guardar = async () => {
    const faltan = visibles.filter((f) => 'req' in f && f.req && !String(v[f.k] ?? '').trim());
    if (faltan.length) {
      setErrores(Object.fromEntries(faltan.map((f) => ['k' in f ? f.k : '', true])));
      const f = faltan[0];
      toast(`Falta rellenar «${'label' in f ? f.label : ''}»`);
      document.getElementById(`f-${'k' in f ? f.k : ''}`)?.focus();
      return;
    }
    const id = (previo?.id as string) ?? nuevoId();
    const fila = aEntidad(tipo, v, { id, createdAt: (previo?.createdAt as string) ?? ahoraISO(), hoy }, previo);
    const col = def.col as NombreColeccion;
    const ok = previo ? await actualizar(col, id, fila as never) : await crear(col, fila as never);
    if (ok) {
      alCerrar();
      toast(def.guardado);
    }
  };

  const pie = (
    <>
      {previo && (
        <button
          type="button"
          className="btn ghost danger left"
          onClick={async () => {
            if (!confirmarBorrado) return setConfirmarBorrado(true);
            alCerrar();
            await borrar(def.col, String(previo.id), def.borrado);
          }}
        >
          <Icono n="trash" />
          {confirmarBorrado ? 'Pulsa otra vez para eliminar' : 'Eliminar'}
        </button>
      )}
      <button type="button" className="btn ghost" onClick={alCerrar}>
        Cancelar
      </button>
      <button type="submit" className="btn primary">
        {previo ? 'Guardar cambios' : 'Guardar'}
      </button>
    </>
  );

  return (
    <Modal titulo={previo ? def.editar : def.nuevo} alCerrar={alCerrar} comoFormulario={() => void guardar()} pie={pie}>
      <div className="modal-b">
        {normales.map((f, i) => (
          <CampoForm key={i} f={f} v={v} cambia={cambia} error={'k' in f && errores[f.k]} primero={i === 0 || (i === 1 && normales[0].tipo === 'seccion')} />
        ))}
        {avanzados.length > 0 && (
          <div className="full">
            <button type="button" className="btn ghost sm" aria-expanded={masOpciones} onClick={() => setMasOpciones(!masOpciones)}>
              <Icono n="right" className={masOpciones ? 'girado' : ''} />
              Más opciones
            </button>
          </div>
        )}
        {masOpciones && avanzados.map((f, i) => <CampoForm key={'a' + i} f={f} v={v} cambia={cambia} error={false} primero={false} />)}
      </div>
    </Modal>
  );
}

function CampoForm({ f, v, cambia, error, primero }: { f: Campo; v: Valores; cambia: (k: string, x: string | boolean) => void; error: boolean; primero: boolean }) {
  const { c } = useDatos();
  if (f.tipo === 'seccion') return <div className="f-section">{f.label}</div>;
  const id = `f-${f.k}`;
  const full = 'full' in f && f.full ? 'full' : '';
  const auto = primero ? { 'data-autofocus': true } : {};
  const val = String(v[f.k] ?? '');

  switch (f.tipo) {
    case 'check':
      return (
        <label className="toggle" style={{ gridColumn: f.full ? '1/-1' : 'auto' }}>
          <input type="checkbox" id={id} checked={v[f.k] === true} onChange={(e) => cambia(f.k, e.target.checked)} />
          {f.label}
        </label>
      );
    case 'flags':
      return (
        <div className="field">
          <span>{f.label}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="toggle">
              <input type="checkbox" checked={v.urgent === true} onChange={(e) => cambia('urgent', e.target.checked)} />
              Urgente
            </label>
            <label className="toggle">
              <input type="checkbox" checked={v.important === true} onChange={(e) => cambia('important', e.target.checked)} />
              Importante
            </label>
          </div>
        </div>
      );
    case 'pills':
      return (
        <div className={`field ${full}`}>
          <span id={`${id}-l`}>{f.label}</span>
          <div className="pills" role="radiogroup" aria-labelledby={`${id}-l`}>
            {f.opciones.map((o) => (
              <label key={o.v}>
                <input type="radio" name={f.k} value={o.v} checked={val === o.v} onChange={() => cambia(f.k, o.v)} />
                <span className={`pill ${o.cls ?? 'mist'}`}>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    case 'selectv':
      return (
        <label className={`field ${full}`}>
          <span>{f.label}</span>
          <select className="input" id={id} value={val} onChange={(e) => cambia(f.k, e.target.value)} {...auto}>
            {f.opciones.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case 'select':
      return (
        <label className={`field ${full}`}>
          <span>{f.label}</span>
          <select className="input" id={id} value={val} onChange={(e) => cambia(f.k, e.target.value)} {...auto}>
            <option value="">{f.vacio ?? '— Ninguno —'}</option>
            {opcionesDe(c, f, v).map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case 'textarea':
      return (
        <label className={`field ${full}`}>
          <span>{f.label}</span>
          <textarea
            className="input"
            id={id}
            rows={f.k === 'text' ? 5 : 3}
            value={val}
            maxLength={f.max}
            aria-invalid={error || undefined}
            onChange={(e) => cambia(f.k, e.target.value)}
            {...auto}
          />
        </label>
      );
    default:
      return (
        <label className={`field ${full}`}>
          <span>{f.label}</span>
          <input
            className="input"
            id={id}
            type={f.tipo}
            value={val}
            maxLength={f.max}
            min={f.tipo === 'number' ? 0 : undefined}
            step={f.tipo === 'number' ? 'any' : undefined}
            inputMode={f.tipo === 'number' ? 'decimal' : undefined}
            aria-invalid={error || undefined}
            style={error ? { borderColor: 'var(--danger)' } : undefined}
            onChange={(e) => cambia(f.k, e.target.value)}
            {...auto}
          />
        </label>
      );
  }
}
