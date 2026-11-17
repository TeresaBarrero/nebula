'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { borrarDemo, crearAlmacenDemo, marcarAsistenteDemo } from '@/lib/datos/almacen-demo';
import { borrarArchivoDemo, guardarArchivoDemo, leerArchivoDemo, vaciarArchivosDemo } from '@/lib/datos/archivos-demo';
import { CuentaNoActiva, SinSesion, crearAlmacenNube } from '@/lib/datos/almacen-nube';
import { conCopiaLocal, vaciarCopiaLocal } from '@/lib/datos/copia-local';
import type { Ajustes, Almacen, Cargado, DatosAsistente, Modo, Perfil, Tema } from '@/lib/datos/tipos';
import { irpfDelPerfil } from '@/lib/reglas/irpf';
import { enDemo, salirDeDemo } from '@/lib/demo-cookie';
import { supabaseConfigurado } from '@/lib/supabase/config';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { aplicarCompacto, aplicarTema } from '@/lib/tema';
import { useToast } from '@/components/ui/Toasts';

type Api = Cargado & {
  modo: Modo;
  almacen: Almacen;
  guardarPerfil: (c: Partial<Omit<Perfil, 'email'>>) => Promise<boolean>;
  guardarAjustes: (c: Partial<Ajustes>) => Promise<boolean>;
  cambiarTema: (t: Tema) => void;
  cambiarCompacto: (on: boolean) => void;
  completarAsistente: (d: DatosAsistente) => Promise<void>;
  saltarAsistente: () => Promise<void>;
  reiniciarDemo: () => Promise<void>;
  salir: () => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

/** Datos y acciones de la cuenta actual (o de la demo). Solo dentro de <ProveedorNebula>. */
export function useNebula(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNebula fuera de ProveedorNebula');
  return v;
}

type Estado = { fase: 'cargando' } | { fase: 'error'; msg: string } | { fase: 'listo'; datos: Cargado; almacen: Almacen };

export function ProveedorNebula({ children, cargando }: { children: ReactNode; cargando: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  // Al subirla se vuelven a cargar los datos (p. ej. al reiniciar la demo).
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let a: Almacen;
    if (enDemo()) a = crearAlmacenDemo(localStorage, { guardar: guardarArchivoDemo, leer: leerArchivoDemo, borrar: borrarArchivoDemo });
    else if (supabaseConfigurado) a = conCopiaLocal(crearAlmacenNube(supabaseNavegador()));
    else {
      router.replace('/entrar');
      return;
    }
    let vigente = true;
    a.cargar()
      .then((datos) => {
        if (!vigente) return;
        aplicarTema(datos.perfil.prefs.theme);
        aplicarCompacto(datos.perfil.prefs.compact);
        setEstado({ fase: 'listo', datos, almacen: a });
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        if (e instanceof SinSesion) return router.replace('/entrar');
        if (e instanceof CuentaNoActiva) return router.replace('/pendiente');
        setEstado({ fase: 'error', msg: 'No hemos podido cargar tus datos. Revisa tu conexión y vuelve a intentarlo.' });
      });
    return () => {
      vigente = false;
    };
  }, [router, version]);

  const api = useMemo<Api | null>(() => {
    if (estado.fase !== 'listo') return null;
    const { datos, almacen } = estado;
    const actualizar = (f: (d: Cargado) => Cargado) =>
      setEstado((s) => (s.fase === 'listo' ? { ...s, datos: f(s.datos) } : s));

    const guardar = async (fn: () => Promise<void>, deshacer: () => void) => {
      try {
        await fn();
        return true;
      } catch {
        deshacer();
        toast('No se ha podido guardar. Inténtalo de nuevo.');
        return false;
      }
    };

    const guardarPerfil: Api['guardarPerfil'] = (c) => {
      const antes = datos.perfil;
      actualizar((d) => ({ ...d, perfil: { ...d.perfil, ...c } }));
      return guardar(() => almacen.guardarPerfil(c), () => actualizar((d) => ({ ...d, perfil: antes })));
    };
    const guardarAjustes: Api['guardarAjustes'] = (c) => {
      const antes = datos.ajustes;
      actualizar((d) => ({ ...d, ajustes: { ...d.ajustes, ...c } }));
      return guardar(() => almacen.guardarAjustes(c), () => actualizar((d) => ({ ...d, ajustes: antes })));
    };

    return {
      ...datos,
      modo: almacen.modo,
      almacen,
      guardarPerfil,
      guardarAjustes,
      cambiarTema: (theme) => {
        aplicarTema(theme);
        void guardarPerfil({ prefs: { ...datos.perfil.prefs, theme } });
      },
      cambiarCompacto: (compact) => {
        aplicarCompacto(compact);
        void guardarPerfil({ prefs: { ...datos.perfil.prefs, compact } });
      },
      completarAsistente: async (d) => {
        await guardarPerfil({ name: d.name || datos.perfil.name });
        await guardarAjustes({
          business: d.business || datos.ajustes.business,
          disciplines: d.disciplines,
          kind: d.kind,
          newAutonomo: d.newAutonomo,
          irpfMode: d.irpfMode,
          iva: d.iva,
          irpf: irpfDelPerfil(d.newAutonomo),
          rate: d.rate || datos.ajustes.rate,
          nif: d.nif || datos.ajustes.nif,
          iban: d.iban || datos.ajustes.iban,
          onboarded: true,
        });
        if (almacen.modo === 'demo') marcarAsistenteDemo(localStorage);
      },
      saltarAsistente: async () => {
        await guardarAjustes({ onboarded: true });
      },
      reiniciarDemo: async () => {
        borrarDemo(localStorage);
        await vaciarArchivosDemo().catch(() => {});
        setEstado({ fase: 'cargando' });
        setVersion((v) => v + 1);
      },
      salir: async () => {
        if (almacen.modo === 'demo') salirDeDemo();
        else {
          await supabaseNavegador().auth.signOut();
          await vaciarCopiaLocal(); // la copia sin conexión se borra al salir
        }
        aplicarCompacto(false);
        router.replace('/entrar');
        router.refresh();
      },
    };
  }, [estado, router, toast]);

  if (estado.fase === 'error')
    return (
      <div className="pantalla-centro">
        <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <p>{estado.msg}</p>
          <button type="button" className="btn primary" onClick={() => location.reload()}>
            Volver a intentarlo
          </button>
        </div>
      </div>
    );
  if (!api) return <>{cargando}</>;
  return <Ctx value={api}>{children}</Ctx>;
}
