/**
 * Modo sin conexión (SPEC §12, Fase 5): «consultar sin conexión».
 * Cada vez que los datos se cargan bien, se guarda una copia en el dispositivo (IndexedDB).
 * Si luego no hay conexión, se enseña esa copia en modo SOLO LECTURA: guardar cambios necesita internet.
 * La copia se borra al salir de la cuenta.
 */
import type { Almacen, Cargado } from './tipos';
import type { Colecciones } from './entidades';

const BD = 'nebula-copia';
const TIENDA = 'datos';

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(TIENDA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
async function operar<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir();
  return new Promise((ok, mal) => {
    const r = fn(bd.transaction(TIENDA, modo).objectStore(TIENDA));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
const guardar = (k: string, v: unknown) => operar('readwrite', (s) => s.put(v, k)).catch(() => undefined);
const leer = <T>(k: string) => operar<T | undefined>('readonly', (s) => s.get(k)).catch(() => undefined);
export const vaciarCopiaLocal = () => operar('readwrite', (s) => s.clear()).catch(() => undefined);

export class SinConexion extends Error {
  constructor() {
    super('Sin conexión: para guardar cambios hace falta internet.');
  }
}

/** ¿El fallo es por falta de conexión? */
const sinRed = (e: unknown) => (typeof navigator !== 'undefined' && navigator.onLine === false) || (e instanceof TypeError && /fetch|network|load failed/i.test(e.message));

/** Envuelve el almacén de la nube: guarda copia al cargar y, sin conexión, enseña la copia y no deja escribir. */
export function conCopiaLocal(a: Almacen): Almacen & { desconectado: boolean } {
  const envuelto: Almacen & { desconectado: boolean } = {
    ...a,
    desconectado: false,
    async cargar() {
      try {
        const d = await a.cargar();
        void guardar('cargado', d);
        return d;
      } catch (e) {
        const copia = sinRed(e) ? await leer<Cargado>('cargado') : undefined;
        if (!copia) throw e;
        envuelto.desconectado = true;
        return copia;
      }
    },
    async cargarColecciones() {
      if (envuelto.desconectado) {
        const copia = await leer<Colecciones>('colecciones');
        if (copia) return copia;
      }
      try {
        const c = await a.cargarColecciones();
        // Sin las contraseñas de los accesos (que de todas formas nunca vienen en la lista).
        void guardar('colecciones', c);
        return c;
      } catch (e) {
        const copia = sinRed(e) ? await leer<Colecciones>('colecciones') : undefined;
        if (!copia) throw e;
        envuelto.desconectado = true;
        return copia;
      }
    },
  };
  // Mientras se está sin conexión, todo lo que escribe falla con un aviso claro.
  const escrituras = ['guardarPerfil', 'guardarAjustes', 'crear', 'crearVarios', 'actualizar', 'borrar', 'restaurar', 'marcarLeidos', 'emitir', 'borrarDatosContacto', 'subirArchivo', 'borrarArchivo'] as const;
  for (const k of escrituras) {
    const original = a[k] as (...x: unknown[]) => Promise<unknown>;
    (envuelto as unknown as Record<string, unknown>)[k] = async (...x: unknown[]) => {
      if (envuelto.desconectado || (typeof navigator !== 'undefined' && navigator.onLine === false)) throw new SinConexion();
      return original.apply(a, x);
    };
  }
  return envuelto;
}
