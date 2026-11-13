'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { NAV, SECCIONES } from '@/lib/catalogos/nav';
import type { NombreIcono } from '@/lib/catalogos/iconos';
import { normalizar } from '@/lib/reglas/textos';
import { Capa } from '@/components/ui/Modal';
import { Icono } from '@/components/ui/Icono';

/** Grupo del menú al que pertenece una sección. */
function grupoDe(id: string): string {
  let grupo = 'Principal';
  for (const n of NAV) {
    if ('group' in n) grupo = n.group;
    else if (n.id === id) return grupo;
  }
  return grupo;
}

type Item = { id: string; label: string; icon: NombreIcono; grupo: string };

const ITEMS: Item[] = [
  ...SECCIONES.map((s) => ({ id: s.id, label: s.label, icon: s.icon, grupo: grupoDe(s.id) })),
  { id: 'perfil', label: 'Perfil', icon: 'user', grupo: 'Cuenta' },
];

/**
 * Buscador ⌘K (SPEC §6.19). En la Fase 0 solo sirve para «Ir a…» una sección;
 * la búsqueda en contactos, proyectos, facturas… llega en la Fase 1.
 */
export function Paleta({ alCerrar }: { alCerrar: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const lista = useMemo(() => ITEMS.filter((i) => normalizar(i.label).includes(normalizar(q))), [q]);

  const ir = (i: Item | undefined) => {
    if (!i) return;
    alCerrar();
    router.push(`/${i.id}`);
  };

  return (
    <Capa alCerrar={alCerrar}>
      <div className="modal palette" role="dialog" aria-modal="true" aria-label="Buscar o ir a">
        <div className="pal-in">
          <Icono n="search" />
          <input
            data-autofocus
            value={q}
            placeholder="Ir a… (escribe una sección)"
            aria-label="Buscar sección"
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-lista"
            aria-activedescendant={lista[sel] ? `pal-${lista[sel].id}` : undefined}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, lista.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                ir(lista[sel]);
              }
            }}
          />
        </div>
        <div className="pal-list" id="pal-lista" role="listbox" aria-label="Secciones">
          <div className="pal-group">Ir a…</div>
          {lista.map((i, n) => (
            <button
              key={i.id}
              id={`pal-${i.id}`}
              type="button"
              role="option"
              aria-selected={n === sel}
              className={`pal-item ${n === sel ? 'on' : ''}`}
              onMouseEnter={() => setSel(n)}
              onClick={() => ir(i)}
            >
              <span className="ic mist">
                <Icono n={i.icon} />
              </span>
              {i.label}
              <small>{i.grupo}</small>
            </button>
          ))}
          {!lista.length && <div className="empty">No hay ninguna sección con ese nombre.</div>}
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
          <span>Buscar clientes, proyectos y facturas llega en la Fase 1</span>
        </div>
      </div>
    </Capa>
  );
}
