/** Archivos de la demo: se guardan en el propio navegador (IndexedDB), nunca salen de él. */
const BD = 'nebula-demo-archivos';
const TIENDA = 'archivos';

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
    const tx = bd.transaction(TIENDA, modo);
    const r = fn(tx.objectStore(TIENDA));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

export const guardarArchivoDemo = (clave: string, b: Blob) => operar('readwrite', (s) => s.put(b, clave)).then(() => undefined);
export const leerArchivoDemo = (clave: string) => operar<Blob | undefined>('readonly', (s) => s.get(clave));
export const borrarArchivoDemo = (clave: string) => operar('readwrite', (s) => s.delete(clave)).then(() => undefined);
export const vaciarArchivosDemo = () => operar('readwrite', (s) => s.clear()).then(() => undefined);
