import { hoy } from '@/lib/reglas/fechas';
import { aplicarBorrado, cambiarFila, deshacerBorrado, efectoDeBorrar, ponerFila } from '@/lib/reglas/vinculos';
import { AJUSTES_POR_DEFECTO, type Ajustes, type Almacen, type Cargado, type DatosAsistente, type Perfil } from './tipos';
import { limpiarDatosAsistente } from './asistente';
import { coleccionesVacias, type Colecciones } from './entidades';
import { semillaDemo } from './semilla';

/** Dónde guarda la demo sus datos en el navegador. Si cambia la forma de los datos, se sube `v`. */
export const CLAVE_DEMO = 'nebula-demo';
const VERSION = 2;

export type EstadoDemo = {
  v: number;
  perfil: Perfil;
  ajustes: Ajustes;
  /** true si el visitante completó el asistente (sus respuestas son suyas, no del ejemplo). */
  asistenteHecho: boolean;
  colecciones: Colecciones;
};

const perfilEjemplo = (): Perfil => ({
  fullName: 'María Teresa',
  name: 'Teresa',
  role: 'Diseño y comunicación 360º',
  email: 'teresa@ejemplo.es',
  phone: '600 123 456',
  prefs: { theme: 'system', compact: false },
});

const ajustesEjemplo = (): Ajustes => ({
  ...AJUSTES_POR_DEFECTO,
  business: 'Estudio creativo',
  legalName: 'María Teresa (nombre fiscal de ejemplo)',
  nif: '00000000T',
  address: 'C/ Ejemplo 1, 28001 Madrid',
  iban: 'ES00 0000 0000 0000 0000 0000',
  disciplines: ['branding', 'grafico', 'web', 'social', 'cint', 'cext'],
});

/** Estado inicial de la demo: los datos de ejemplo del prototipo, con fechas desde `dia`. */
export function estadoDemoInicial(dia: string = hoy()): EstadoDemo {
  return { v: VERSION, perfil: perfilEjemplo(), ajustes: ajustesEjemplo(), asistenteHecho: false, colecciones: semillaDemo(dia) };
}

/** Lo mínimo de `localStorage` que usamos (así se puede probar sin navegador). */
export type Guardado = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function leerDemo(store: Guardado, dia: string = hoy()): EstadoDemo {
  try {
    const raw = store.getItem(CLAVE_DEMO);
    if (raw) {
      const s = JSON.parse(raw) as Partial<EstadoDemo>;
      if (s && s.perfil && s.ajustes) {
        // Versión 1 (Fase 0): conserva perfil y asistente y añade los datos de ejemplo.
        const colecciones = s.v === VERSION && s.colecciones ? { ...coleccionesVacias(), ...s.colecciones } : semillaDemo(dia);
        return {
          v: VERSION,
          perfil: { ...perfilEjemplo(), ...s.perfil },
          ajustes: { ...AJUSTES_POR_DEFECTO, ...s.ajustes },
          asistenteHecho: Boolean(s.asistenteHecho),
          colecciones,
        };
      }
    }
  } catch {
    // Datos dañados o navegador sin almacenamiento: se empieza de nuevo.
  }
  return estadoDemoInicial(dia);
}

export function escribirDemo(store: Guardado, s: EstadoDemo): void {
  store.setItem(CLAVE_DEMO, JSON.stringify(s));
}

export function borrarDemo(store: Guardado): void {
  store.removeItem(CLAVE_DEMO);
}

/** Respuestas del asistente de la demo para llevarlas al registro (solo si son del visitante). */
export function datosAsistenteDeDemo(store: Guardado): DatosAsistente | null {
  const s = leerDemo(store);
  if (!s.asistenteHecho) return null;
  const { perfil: p, ajustes: a } = s;
  return limpiarDatosAsistente({
    name: p.name, business: a.business, disciplines: a.disciplines, kind: a.kind, newAutonomo: a.newAutonomo,
    irpfMode: a.irpfMode, iva: a.iva, nif: a.nif, iban: a.iban, rate: a.rate,
  });
}

/** Marca que el visitante ha completado el asistente en la demo. */
export function marcarAsistenteDemo(store: Guardado): void {
  const s = leerDemo(store);
  s.asistenteHecho = true;
  escribirDemo(store, s);
}

type Archivos = {
  guardar: (clave: string, b: Blob) => Promise<void>;
  leer: (clave: string) => Promise<Blob | undefined>;
  borrar: (clave: string) => Promise<void>;
};

export function crearAlmacenDemo(store: Guardado, archivos?: Archivos): Almacen {
  const cambiar = (fn: (c: Colecciones) => Colecciones) => {
    const s = leerDemo(store);
    s.colecciones = fn(s.colecciones);
    escribirDemo(store, s);
  };
  return {
    modo: 'demo',
    async cargar(): Promise<Cargado> {
      const s = leerDemo(store);
      escribirDemo(store, s); // guarda la versión al día (p. ej. al pasar de la Fase 0)
      return { perfil: s.perfil, ajustes: s.ajustes, esAdmin: false, datosPrevios: null };
    },
    async guardarPerfil(cambios) {
      const s = leerDemo(store);
      s.perfil = { ...s.perfil, ...cambios };
      escribirDemo(store, s);
    },
    async guardarAjustes(cambios) {
      const s = leerDemo(store);
      s.ajustes = { ...s.ajustes, ...cambios };
      escribirDemo(store, s);
    },
    async cargarColecciones() {
      return leerDemo(store).colecciones;
    },
    async crear(col, fila) {
      cambiar((c) => ponerFila(c, col, fila));
    },
    async crearVarios(col, filas) {
      cambiar((c) => filas.reduce((x, f) => ponerFila(x, col, f), c));
    },
    async actualizar(col, id, cambios) {
      cambiar((c) => cambiarFila(c, col, id, cambios));
    },
    async borrar(col, id) {
      cambiar((c) => aplicarBorrado(c, efectoDeBorrar(c, col, id)));
    },
    async restaurar(ef) {
      cambiar((c) => deshacerBorrado(c, ef));
    },
    async marcarLeidos(claves) {
      cambiar((c) => ({ ...c, notificationReads: [...new Set([...c.notificationReads, ...claves])] }));
    },
    async subirArchivo(id, archivo) {
      if (!archivos) throw new Error('Sin almacenamiento de archivos');
      const clave = `demo/${id}`;
      await archivos.guardar(clave, archivo);
      return clave;
    },
    async urlArchivo(ruta) {
      if (!archivos || !ruta) return null;
      const b = await archivos.leer(ruta);
      return b ? URL.createObjectURL(b) : null;
    },
    async borrarArchivo(ruta) {
      if (archivos && ruta) await archivos.borrar(ruta);
    },
  };
}
