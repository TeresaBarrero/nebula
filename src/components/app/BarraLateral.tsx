'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FASES_ABIERTAS } from '@/lib/catalogos/crm';
import { NAV } from '@/lib/catalogos/nav';
import { estadoDe } from '@/lib/reglas/facturas';
import { diasHasta } from '@/lib/reglas/fechas';
import { igualaPorFacturar } from '@/lib/reglas/recurrentes';
import { iniciales } from '@/lib/reglas/textos';
import { Icono } from '@/components/ui/Icono';
import { useDatos } from './Datos';
import { useNebula } from './Nebula';

/** Barra lateral salvia plegable (SPEC §3). En móvil es un cajón que abre ☰. */
export function BarraLateral({ alNavegar }: { alNavegar: () => void }) {
  const ruta = usePathname();
  const { perfil, ajustes, cambiarCompacto } = useNebula();
  const activa = (id: string) => ruta === `/${id}` || ruta.startsWith(`/${id}/`);
  const { c, hoy } = useDatos();
  // Pendientes de cada sección (punto melocotón cuando el menú está plegado).
  const insignias: Record<string, number> = {
    tareas: c.tasks.filter((t) => !t.done && t.due && t.due <= hoy).length,
    calendario: c.events.filter((e) => e.date === hoy).length,
    oportunidades: c.deals.filter((d) => FASES_ABIERTAS.includes(d.stage) && d.expected && d.expected < hoy).length,
    facturas: c.invoices.filter((f) => f.kind === 'factura' && f.status === 'emitida' && estadoDe(c, f, hoy) === 'vencida').length,
    igualas: c.retainers.filter((r) => igualaPorFacturar(r, hoy)).length + c.renewals.filter((n) => diasHasta(n.renewDate, hoy) <= 15).length,
  };

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
              {insignias[n.id] ? (
                <span className="badge" aria-label={`${insignias[n.id]} pendientes`}>
                  {insignias[n.id]}
                </span>
              ) : null}
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
