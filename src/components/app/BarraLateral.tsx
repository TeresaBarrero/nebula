'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/catalogos/nav';
import { iniciales } from '@/lib/reglas/textos';
import { Icono } from '@/components/ui/Icono';
import { useNebula } from './Nebula';

/** Barra lateral salvia plegable (SPEC §3). En móvil es un cajón que abre ☰. */
export function BarraLateral({ alNavegar }: { alNavegar: () => void }) {
  const ruta = usePathname();
  const { perfil, ajustes, cambiarCompacto } = useNebula();
  const activa = (id: string) => ruta === `/${id}` || ruta.startsWith(`/${id}/`);
  // Los avisos de cada sección (punto melocotón) llegan con sus datos en las próximas fases.
  const insignias: Record<string, number> = {};

  return (
    <aside className="side" id="side" aria-label="Navegación principal">
      <div className="brand">
        <Link href="/inicio" className="logo" style={{ textDecoration: 'none' }} onClick={alNavegar}>
          <span className="full">nebúla</span>
          <span className="short">
            n<small>.</small>
          </span>
        </Link>
        <button
          type="button"
          className="collapse-top"
          onClick={() => cambiarCompacto(!perfil.prefs.compact)}
          aria-label="Plegar o desplegar el menú"
          title="Plegar o desplegar el menú"
        >
          <Icono n="left" />
        </button>
      </div>
      <nav className="nav">
        {NAV.map((n) =>
          'group' in n ? (
            <div className="nav-label" key={n.group}>
              {n.group}
            </div>
          ) : (
            <Link
              key={n.id}
              href={`/${n.id}`}
              className={activa(n.id) ? 'on' : ''}
              aria-current={activa(n.id) ? 'page' : undefined}
              title={n.label}
              onClick={alNavegar}
            >
              <Icono n={n.icon} />
              <span className="lbl">{n.label}</span>
              {insignias[n.id] ? <span className="badge">{insignias[n.id]}</span> : null}
            </Link>
          ),
        )}
      </nav>
      <div className="side-foot">
        <Link href="/perfil" className={`me ${activa('perfil') ? 'on' : ''}`} onClick={alNavegar} title="Perfil">
          <span className="avatar peach">{iniciales(perfil.fullName || perfil.name)}</span>
          <div>
            <b>{perfil.fullName || perfil.name || 'Tu perfil'}</b>
            <span>{ajustes.business}</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
