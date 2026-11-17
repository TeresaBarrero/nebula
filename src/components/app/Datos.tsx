'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type Colecciones, type Documento, type FilaDe, type Id, type NombreColeccion } from '@/lib/datos/entidades';
import { hoy } from '@/lib/reglas/fechas';
import { aplicarBorrado, cambiarFila, deshacerBorrado, efectoDeBorrar, ponerFila } from '@/lib/reglas/vinculos';
import { useToast } from '@/components/ui/Toasts';
import { useNebula } from './Nebula';

export const nuevoId = (): Id => crypto.randomUUID();
export const ahoraISO = () => new Date().toISOString();

type ApiDatos = {
  c: Colecciones;
  hoy: string;
  crear: <K extends NombreColeccion>(col: K, fila: FilaDe<K>) => Promise<boolean>;
  crearVarios: <K extends NombreColeccion>(col: K, filas: FilaDe<K>[]) => Promise<boolean>;
  actualizar: <K extends NombreColeccion>(col: K, id: Id, cambios: Partial<FilaDe<K>>) => Promise<boolean>;
  /** Borra (con «Deshacer» en el aviso). `etiqueta` es lo que dice el aviso, p. ej. «Contacto eliminado». */
  borrar: (col: NombreColeccion, id: Id, etiqueta?: string) => Promise<void>;
  marcarLeidos: (claves: string[]) => Promise<void>;
  subirDocumentos: (archivos: FileList | File[], vinculo: Pick<Documento, 'contactId' | 'companyId' | 'projectId'>) => Promise<void>;
  abrirDocumento: (d: Documento) => Promise<void>;
};

const Ctx = createContext<ApiDatos | null>(null);

export function useDatos(): ApiDatos {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDatos fuera de ProveedorDatos');
  return v;
}

const MAX_MB = 50;

/** Carga y guarda todos los datos del espacio (o de la demo). Los cambios se ven al instante y se guardan detrás. */
export function ProveedorDatos({ children, cargando }: { children: ReactNode; cargando: ReactNode }) {
  const { almacen } = useNebula();
  const toast = useToast();
  const [c, setC] = useState<Colecciones | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    almacen
      .cargarColecciones()
      .then((d) => {
        if (vigente) setC(d);
      })
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [almacen]);

  const poner = useCallback((fn: (c: Colecciones) => Colecciones) => setC((x) => (x ? fn(x) : x)), []);

  const conAviso = useCallback(
    async (guardar: () => Promise<void>, deshacer: () => void) => {
      try {
        await guardar();
        return true;
      } catch {
        deshacer();
        toast('No se ha podido guardar. Revisa tu conexión e inténtalo de nuevo.');
        return false;
      }
    },
    [toast],
  );

  const api = useMemo<ApiDatos | null>(() => {
    if (!c) return null;
    // Si falla al guardar, se deshace solo ese cambio (no se pisa lo demás).
    const crear: ApiDatos['crear'] = (col, fila) => {
      poner((x) => ponerFila(x, col, fila));
      const quitar = (x: Colecciones) => ({ ...x, [col]: (x[col] as { id: Id }[]).filter((f) => f.id !== fila.id) });
      return conAviso(() => almacen.crear(col, fila), () => poner(quitar));
    };
    const crearVarios: ApiDatos['crearVarios'] = (col, filas) => {
      if (!filas.length) return Promise.resolve(true);
      const ids = new Set(filas.map((f) => f.id));
      poner((x) => filas.reduce((y, f) => ponerFila(y, col, f), x));
      const quitar = (x: Colecciones) => ({ ...x, [col]: (x[col] as { id: Id }[]).filter((f) => !ids.has(f.id)) });
      return conAviso(() => almacen.crearVarios(col, filas), () => poner(quitar));
    };
    const actualizar: ApiDatos['actualizar'] = (col, id, cambios) => {
      const fila = (c[col] as unknown as Record<string, unknown>[]).find((f) => f.id === id);
      const previos = Object.fromEntries(Object.keys(cambios).map((k) => [k, fila?.[k]])) as Partial<FilaDe<typeof col>>;
      poner((x) => cambiarFila(x, col, id, cambios));
      return conAviso(() => almacen.actualizar(col, id, cambios), () => poner((x) => cambiarFila(x, col, id, previos)));
    };
    return {
      c,
      hoy: hoy(),
      crear,
      crearVarios,
      actualizar,
      borrar: async (col, id, etiqueta = 'Eliminado') => {
        const ef = efectoDeBorrar(c, col, id);
        poner((x) => aplicarBorrado(x, ef));
        const ok = await conAviso(() => almacen.borrar(col, id), () => poner((x) => deshacerBorrado(x, ef)));
        if (!ok) return;
        // Un documento se borra con su archivo: no se puede deshacer.
        if (col === 'files') {
          const d = ef.borradas[0]?.fila as unknown as Documento | undefined;
          if (d?.storagePath) await almacen.borrarArchivo(d.storagePath).catch(() => {});
          toast(etiqueta);
          return;
        }
        toast(etiqueta, {
          label: 'Deshacer',
          fn: () => {
            poner((x) => deshacerBorrado(x, ef));
            void conAviso(() => almacen.restaurar(ef), () => poner((x) => aplicarBorrado(x, ef)));
          },
        });
      },
      marcarLeidos: async (claves) => {
        const nuevas = claves.filter((k) => !c.notificationReads.includes(k));
        if (!nuevas.length) return;
        poner((x) => ({ ...x, notificationReads: [...x.notificationReads, ...nuevas] }));
        await almacen.marcarLeidos(nuevas).catch(() => {});
      },
      subirDocumentos: async (archivos, vinculo) => {
        for (const a of Array.from(archivos)) {
          if (a.size > MAX_MB * 1024 * 1024) {
            toast(`«${a.name}» pesa más de ${MAX_MB} MB y no se puede subir`);
            continue;
          }
          const id = nuevoId();
          try {
            const storagePath = await almacen.subirArchivo(id, a);
            await crear('files', {
              id,
              name: a.name.slice(0, 255),
              size: a.size,
              mime: a.type || 'application/octet-stream',
              storagePath,
              ...vinculo,
              date: hoy(),
              createdAt: ahoraISO(),
            });
            toast(`Documento guardado: ${a.name}`);
          } catch {
            toast(`No se ha podido subir «${a.name}». Inténtalo de nuevo.`);
          }
        }
      },
      abrirDocumento: async (d) => {
        if (!d.storagePath) {
          toast('Es un documento de ejemplo: no tiene archivo detrás');
          return;
        }
        // Se abre la pestaña ya, para que el navegador no la bloquee al llegar el enlace.
        const ventana = window.open('', '_blank');
        const url = await almacen.urlArchivo(d.storagePath).catch(() => null);
        if (!url) {
          ventana?.close();
          toast('No se ha podido abrir el documento');
          return;
        }
        if (ventana) ventana.location.href = url;
        else window.location.href = url;
      },
    };
  }, [c, almacen, poner, conAviso, toast]);

  if (error)
    return (
      <div className="pantalla-centro">
        <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <p>No hemos podido cargar tus datos. Revisa tu conexión y vuelve a intentarlo.</p>
          <button type="button" className="btn primary" onClick={() => location.reload()}>
            Volver a intentarlo
          </button>
        </div>
      </div>
    );
  if (!api) return <>{cargando}</>;
  return <Ctx value={api}>{children}</Ctx>;
}
