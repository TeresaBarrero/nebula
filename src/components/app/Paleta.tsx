'use client';

import { useMemo, useState } from 'react';
import type { Pastel } from '@/lib/catalogos/crm';
import type { NombreIcono } from '@/lib/catalogos/iconos';
import { NAV, SECCIONES } from '@/lib/catalogos/nav';
import { buscar } from '@/lib/reglas/buscador';
import { normalizar } from '@/lib/reglas/textos';
import { Capa } from '@/components/ui/Modal';
import { Icono } from '@/components/ui/Icono';
import { useIrA } from './acciones';
import { useDatos } from './Datos';
import { useFormularios } from './formularios/Formulario';
import type { TipoForm } from './formularios/definiciones';
import { useDinero } from '@/components/dinero/Dinero';

/** Grupo del menú al que pertenece una sección. */
function grupoDe(id: string): string {
  let grupo = 'Principal';
  for (const n of NAV) {
    if ('group' in n) grupo = n.group;
    else if (n.id === id) return grupo;
  }
  return grupo;
}

type Item = { clave: string; label: string; icono: NombreIcono; cls: Pastel; pista: string; ir: () => void };

// Qué se puede crear desde el buscador y qué campo rellena lo escrito.
const CREAR: [TipoForm, string, NombreIcono, Pastel, string][] = [
  ['task', 'Crear tarea', 'check', 'peach', 'title'],
  ['event', 'Crear reunión', 'calendar', 'lilac', 'title'],
  ['deal', 'Crear oportunidad', 'funnel', 'butter', 'title'],
  ['contact', 'Crear contacto', 'users', 'sage', 'name'],
  ['company', 'Crear empresa', 'building', 'sand', 'name'],
  ['project', 'Crear proyecto', 'folder', 'butter', 'name'],
  ['expense', 'Apuntar gasto', 'wallet', 'peach', 'concept'],
  ['retainer', 'Crear iguala', 'repeat', 'lilac', 'name'],
  ['renewal', 'Añadir renovación', 'globe', 'lilac', 'name'],
  ['note', 'Crear nota', 'note', 'butter', 'text'],
];

const SECCIONES_IR = [...SECCIONES.map((s) => ({ id: s.id, label: s.label, icon: s.icon })), { id: 'perfil', label: 'Perfil', icon: 'user' as NombreIcono }];

/** Buscador ⌘K (SPEC §6.19): busca en tus datos, crea con lo que escribes e «Ir a…». Navegable con teclado. */
export function Paleta({ alCerrar }: { alCerrar: () => void }) {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  const irA = useIrA();
  const dinero = useDinero();
  const [texto, setTexto] = useState('');
  const [sel, setSel] = useState(0);

  const grupos = useMemo(() => {
    const raw = texto.trim();
    const q = normalizar(raw);
    const out: { titulo: string; items: Item[] }[] = buscar(c, raw, hoy).map((g) => ({
      titulo: g.titulo,
      items: g.items.map((r) => ({ ...r, ir: () => irA(r.destino) })),
    }));
    const crear = CREAR.filter(([, l]) => !q || normalizar(l).includes(q) || q.length > 2).map(([tipo, l, icono, cls, campo]) => {
      const literal = Boolean(q) && !normalizar(l).includes(q);
      return { clave: 'crear-' + tipo, label: literal ? `${l}: «${raw}»` : l, icono, cls, pista: 'Crear', ir: () => abrir(tipo, literal ? { [campo]: raw } : {}) };
    });
    const docs = (['factura', 'presupuesto'] as const)
      .map((k) => ({ k, l: k === 'factura' ? 'Crear factura' : 'Crear presupuesto' }))
      .filter(({ l }) => !q || normalizar(l).includes(q) || q.length > 2)
      .map(({ k, l }) => {
        const literal = Boolean(q) && !normalizar(l).includes(q);
        return {
          clave: 'crear-' + k,
          label: literal ? `${l}: «${raw}»` : l,
          icono: 'receipt' as NombreIcono,
          cls: 'sand' as Pastel,
          pista: 'Crear',
          ir: () => dinero.nueva(k, literal ? { lines: [{ desc: raw, qty: 1, price: 0 }] } : {}),
        };
      });
    const todas = [...crear, ...docs];
    if (todas.length) out.push({ titulo: 'Crear', items: q ? todas.slice(0, 4) : todas });
    const ir = SECCIONES_IR.filter((s) => !q || normalizar(s.label).includes(q)).map((s) => ({
      clave: 'ir-' + s.id,
      label: `Ir a ${s.label}`,
      icono: s.icon,
      cls: 'mist' as Pastel,
      pista: grupoDe(s.id),
      ir: () => irA({ ruta: `/${s.id}` }),
    }));
    if (ir.length) out.push({ titulo: 'Ir a', items: ir });
    return out;
  }, [texto, c, hoy, abrir, irA, dinero]);

  const items = grupos.flatMap((g) => g.items);
  const elegir = (i: Item | undefined) => {
    if (!i) return;
    alCerrar();
    i.ir();
  };
  const mover = (n: number) => {
    const s = Math.max(0, Math.min(items.length - 1, sel + n));
    setSel(s);
    document.getElementById(`pal-${s}`)?.scrollIntoView({ block: 'nearest' });
  };

  let k = 0;
  return (
    <Capa alCerrar={alCerrar}>
      <div className="modal palette" role="dialog" aria-modal="true" aria-label="Buscar o crear">
        <div className="pal-in">
          <Icono n="search" />
          <input
            data-autofocus
            value={texto}
            placeholder="Busca clientes, proyectos, tareas… o escribe para crear"
            aria-label="Buscar o crear"
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-lista"
            aria-activedescendant={items[sel] ? `pal-${sel}` : undefined}
            onChange={(e) => {
              setTexto(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                mover(1);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                mover(-1);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                elegir(items[sel]);
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="pal-list" id="pal-lista" role="listbox" aria-label="Resultados">
          {grupos.map((g) => (
            <div key={g.titulo} role="group" aria-label={g.titulo}>
              <div className="pal-group">{g.titulo}</div>
              {g.items.map((i) => {
                const n = k++;
                return (
                  <button
                    key={i.clave}
                    id={`pal-${n}`}
                    type="button"
                    role="option"
                    aria-selected={n === sel}
                    tabIndex={-1}
                    className={`pal-item ${n === sel ? 'on' : ''}`}
                    onMouseEnter={() => setSel(n)}
                    onClick={() => elegir(i)}
                  >
                    <span className={`ic ${i.cls}`}>
                      <Icono n={i.icono} />
                    </span>
                    <span>{i.label}</span>
                    <small>{i.pista}</small>
                  </button>
                );
              })}
            </div>
          ))}
          {!items.length && <div className="empty">No hay nada con ese nombre.</div>}
        </div>
        <div className="pal-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> moverte
          </span>
          <span>
            <kbd>Intro</kbd> abrir
          </span>
          <span>
            <kbd>Esc</kbd> cerrar
          </span>
        </div>
      </div>
    </Capa>
  );
}
