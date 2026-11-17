'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { destinoDe, reloj } from '@/lib/reglas/trabajo';
import { useTrabajo } from '@/components/trabajo/Trabajo';
import { useDatos } from './Datos';
import { Icono } from '@/components/ui/Icono';
import { Ayuda } from '@/components/ui/Ayuda';
import { useAvisos } from './Avisos';
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
  const { pendientes } = useAvisos();
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
      <BotonCronometro />
      <button
        type="button"
        className="icon-btn theme-btn"
        onClick={() => cambiarTema(oscuro ? 'light' : 'dark')}
        aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={oscuro ? 'Modo claro' : 'Modo oscuro'}
      >
        <Icono n={oscuro ? 'sun' : 'moon'} />
      </button>
      <button
        type="button"
        className="icon-btn"
        id="bellBtn"
        onClick={alternarAvisos}
        aria-label={pendientes ? `Avisos: ${pendientes} sin leer` : 'Avisos'}
        style={{ position: 'relative' }}
      >
        <Icono n="bell" />
        {pendientes > 0 && (
          <span className="dot-count num" aria-hidden="true">
            {pendientes > 99 ? '99+' : pendientes}
          </span>
        )}
      </button>
    </header>
  );
}

/** Cronómetro siempre visible (SPEC §3): en marcha muestra el tiempo y para al pulsarlo. */
function BotonCronometro() {
  const { c } = useDatos();
  const t = useTrabajo();
  const [ahora, setAhora] = useState(() => new Date());
  const activo = t.cronometro;
  useEffect(() => {
    if (!activo) return;
    const i = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(i);
  }, [activo]);
  if (!activo)
    return (
      <button type="button" className="timer" title="Cronometrar lo que estás haciendo" onClick={t.elegirYEmpezar}>
        <Icono n="play" />
        <span className="tlab">Cronómetro</span>
      </button>
    );
  const nombre = destinoDe(c, activo);
  return (
    <button type="button" className="timer on" title="Parar y guardar las horas" aria-label={`Parar el cronómetro de ${nombre} y guardar las horas`} onClick={() => void t.parar()}>
      <span className="rec" aria-hidden="true" />
      <span className="num">{reloj(activo.start, ahora)}</span>
      <span className="tlab">{nombre}</span>
      <Icono n="stop" />
    </button>
  );
}
