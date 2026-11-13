'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Icono } from '@/components/ui/Icono';
import { Ayuda } from '@/components/ui/Ayuda';
import { useToast } from '@/components/ui/Toasts';
import { useNebula } from './Nebula';

const OSCURO = '(prefers-color-scheme: dark)';
const suscribirTemaSistema = (avisar: () => void) => {
  const m = matchMedia(OSCURO);
  m.addEventListener('change', avisar);
  return () => m.removeEventListener('change', avisar);
};
const sinCambios = () => () => {};

/** Barra superior: ☰ (móvil), buscador ⌘K, aviso de demo, cronómetro, tema y avisos (SPEC §3). */
export function BarraSuperior({
  abrirMenu,
  abrirPaleta,
  alternarAvisos,
}: {
  abrirMenu: () => void;
  abrirPaleta: () => void;
  alternarAvisos: () => void;
}) {
  const { modo, perfil, cambiarTema } = useNebula();
  const toast = useToast();
  const sistemaOscuro = useSyncExternalStore(suscribirTemaSistema, () => matchMedia(OSCURO).matches, () => false);
  const oscuro = perfil.prefs.theme === 'dark' || (perfil.prefs.theme === 'system' && sistemaOscuro);
  const mac = useSyncExternalStore(sinCambios, () => /Mac|iPhone|iPad/.test(navigator.userAgent), () => true);

  return (
    <header className="top">
      <button type="button" className="icon-btn menu-btn" onClick={abrirMenu} aria-label="Abrir menú">
        <Icono n="menu" />
      </button>
      <button type="button" className="search-trigger" onClick={abrirPaleta} aria-label="Buscar o crear">
        <Icono n="search" />
        <span>Buscar o crear… clientes, proyectos, facturas</span>
        <kbd>{mac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      <div className="spacer" />
      {modo === 'demo' && (
        <div className="demo-bar">
          <span className="pill butter demo-pill">
            <span className="demo-txt">Modo demostración</span>
            <Ayuda texto="Estás probando nebúla con datos de ejemplo. Tus cambios solo se guardan en este navegador." />
          </span>
          <Link href="/registro?desde=demo" className="btn primary sm">
            <Icono n="user" />
            Crear usuario
          </Link>
        </div>
      )}
      <button
        type="button"
        className="timer"
        title="Cronometrar lo que estás haciendo"
        onClick={() => toast('El cronómetro llega en la Fase 3')}
      >
        <Icono n="play" />
        <span className="tlab">Cronómetro</span>
      </button>
      <button
        type="button"
        className="icon-btn theme-btn"
        onClick={() => cambiarTema(oscuro ? 'light' : 'dark')}
        aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={oscuro ? 'Modo claro' : 'Modo oscuro'}
      >
        <Icono n={oscuro ? 'sun' : 'moon'} />
      </button>
      <button type="button" className="icon-btn" id="bellBtn" onClick={alternarAvisos} aria-label="Avisos">
        <Icono n="bell" />
      </button>
    </header>
  );
}
