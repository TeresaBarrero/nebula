'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/Toasts';
import { Asistente } from './Asistente';
import { Avisos } from './Avisos';
import { BarraLateral } from './BarraLateral';
import { BarraSuperior } from './BarraSuperior';
import { BotonCrear } from './BotonCrear';
import { useNebula } from './Nebula';
import { Paleta } from './Paleta';

const Ctx = createContext<{ abrirAsistente: () => void }>({ abrirAsistente: () => {} });
export const useCarcasa = () => useContext(Ctx);

const escribiendo = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/** Layout de la app: barra lateral, barra superior, «+», buscador, avisos, asistente y atajos. */
export function Carcasa({ children }: { children: ReactNode }) {
  const { ajustes } = useNebula();
  const toast = useToast();
  const ruta = usePathname();
  const [menu, setMenu] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [avisos, setAvisos] = useState(false);
  const [fab, setFab] = useState(false);
  const [asistente, setAsistente] = useState(!ajustes.onboarded);

  const cerrarPaleta = useCallback(() => setPaleta(false), []);
  const cerrarAvisos = useCallback(() => setAvisos(false), []);
  const cerrarAsistente = useCallback(() => setAsistente(false), []);

  // Al cambiar de página se vuelve arriba (el cajón del móvil lo cierra cada enlace al pulsarlo).
  useEffect(() => {
    document.getElementById('content')?.scrollTo(0, 0);
  }, [ruta]);

  // Atajos (SPEC §3): ⌘K / Ctrl+K o «/» buscar · N nueva tarea · Esc cerrar.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (asistente) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaleta((p) => !p);
        return;
      }
      if (escribiendo(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        setPaleta(true);
      } else if (e.key.toLowerCase() === 'n' && !paleta) {
        toast('Crear tareas llega en la Fase 1');
      } else if (e.key === 'Escape') {
        setFab(false);
        setMenu(false);
      }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [asistente, paleta, toast]);

  return (
    <Ctx value={{ abrirAsistente: () => setAsistente(true) }}>
      <div className={`app ${menu ? 'menu-open' : ''}`} id="app">
        <BarraLateral alNavegar={() => setMenu(false)} />
        <div className="scrim" onClick={() => setMenu(false)} aria-hidden="true" />
        <div className="main">
          <BarraSuperior
            abrirMenu={() => setMenu(true)}
            abrirPaleta={() => {
              setMenu(false);
              setPaleta(true);
            }}
            alternarAvisos={() => setAvisos((a) => !a)}
          />
          <main className="content" id="content">
            <div className="page">{children}</div>
          </main>
        </div>
      </div>
      <BotonCrear abierto={fab} setAbierto={setFab} />
      {avisos && <Avisos alCerrar={cerrarAvisos} />}
      {paleta && <Paleta alCerrar={cerrarPaleta} />}
      {asistente && <Asistente alCerrar={cerrarAsistente} />}
    </Ctx>
  );
}
