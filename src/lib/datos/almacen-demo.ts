import { AJUSTES_POR_DEFECTO, type Ajustes, type Almacen, type Cargado, type DatosAsistente, type Perfil } from './tipos';
import { limpiarDatosAsistente } from './asistente';

/** Dónde guarda la demo sus datos en el navegador. Si cambia la forma de los datos, se sube `v`. */
export const CLAVE_DEMO = 'nebula-demo';
const VERSION = 1;

export type EstadoDemo = {
  v: number;
  perfil: Perfil;
  ajustes: Ajustes;
  /** true si el visitante completó el asistente (sus respuestas son suyas, no del ejemplo). */
  asistenteHecho: boolean;
};

/** Datos de ejemplo del prototipo (función seed(), perfil). */
export function estadoDemoInicial(): EstadoDemo {
  return {
    v: VERSION,
    perfil: {
      fullName: 'María Teresa',
      name: 'Teresa',
      role: 'Diseño y comunicación 360º',
      email: 'teresa@ejemplo.es',
      phone: '600 123 456',
      prefs: { theme: 'system', compact: false },
    },
    ajustes: {
      ...AJUSTES_POR_DEFECTO,
      business: 'Estudio creativo',
      legalName: 'María Teresa (nombre fiscal de ejemplo)',
      nif: '00000000T',
      address: 'C/ Ejemplo 1, 28001 Madrid',
      iban: 'ES00 0000 0000 0000 0000 0000',
      kind: 'autonomo',
      newAutonomo: false,
      irpfMode: 'empresas',
      iva: 21,
      irpf: 15,
      payDays: 30,
      rate: 50,
      extraRound: 120,
      capacity: 30,
      disciplines: ['branding', 'grafico', 'web', 'social', 'cint', 'cext'],
      onboarded: false,
    },
    asistenteHecho: false,
  };
}

/** Lo mínimo de `localStorage` que usamos (así se puede probar sin navegador). */
export type Guardado = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function leerDemo(store: Guardado): EstadoDemo {
  try {
    const raw = store.getItem(CLAVE_DEMO);
    if (raw) {
      const s = JSON.parse(raw) as EstadoDemo;
      if (s && s.v === VERSION && s.perfil && s.ajustes) {
        return {
          ...s,
          perfil: { ...estadoDemoInicial().perfil, ...s.perfil },
          ajustes: { ...AJUSTES_POR_DEFECTO, ...s.ajustes },
        };
      }
    }
  } catch {
    // Datos dañados o navegador sin almacenamiento: se empieza de nuevo.
  }
  return estadoDemoInicial();
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

export function crearAlmacenDemo(store: Guardado): Almacen {
  return {
    modo: 'demo',
    async cargar(): Promise<Cargado> {
      const s = leerDemo(store);
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
  };
}

/** Marca que el visitante ha completado el asistente en la demo. */
export function marcarAsistenteDemo(store: Guardado): void {
  const s = leerDemo(store);
  s.asistenteHecho = true;
  escribirDemo(store, s);
}
