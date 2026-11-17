import { hoy } from '@/lib/reglas/fechas';
import { aplicarBorrado, cambiarFila, deshacerBorrado, efectoDeBorrar, ponerFila } from '@/lib/reglas/vinculos';
import { AJUSTES_POR_DEFECTO, type Ajustes, type Almacen, type Cargado, type DatosAsistente, type Perfil } from './tipos';
import { limpiarDatosAsistente } from './asistente';
import { cambioPermitido, cambiosAlEmitir, esEmitida, problemaParaEmitir } from '@/lib/reglas/facturas';
import { coleccionesVacias, type Acceso, type Colecciones, type Factura } from './entidades';

/** En la demo la contraseña se guarda en el navegador (son datos de ejemplo). undefined = la que había. */
function conClave(a: Acceso, antes: Acceso | undefined): Acceso {
  const password = a.password === undefined ? (antes?.password ?? '') : a.password;
  return { ...a, password, hasPassword: password !== '' };
}
import { semillaDemo } from './semilla';

/** Dónde guarda la demo sus datos en el navegador. Si cambia la forma de los datos, se sube `v`. */
export const CLAVE_DEMO = 'nebula-demo';
const VERSION = 4;

/** Datos de ejemplo de la Fase 3 que se añaden a una demo ya empezada (sin enlaces rotos ni pisar lo que se cambió). */
function trabajoDeEjemplo(semilla: Colecciones, previas: Colecciones): Colecciones {
  const hay = (lista: { id: string }[], id: string | null) => Boolean(id && lista.some((x) => x.id === id));
  const de = <T extends { id: string }>(lista: T[], id: string) => lista.find((x) => x.id === id);
  return {
    ...previas,
    companies: previas.companies.map((e) => (e.brand ? e : { ...e, brand: de(semilla.companies, e.id)?.brand })),
    projects: previas.projects.map((p) => ({ ...p, brief: p.brief ?? de(semilla.projects, p.id)?.brief, portfolio: p.portfolio ?? de(semilla.projects, p.id)?.portfolio })),
    deliverables: previas.deliverables.map((v) => (v.versions ? v : { ...v, versions: de(semilla.deliverables, v.id)?.versions ?? [], feedback: de(semilla.deliverables, v.id)?.feedback ?? [] })),
    timeEntries: semilla.timeEntries.filter((t) => (!t.projectId || hay(previas.projects, t.projectId)) && (!t.retainerId || hay(previas.retainers, t.retainerId))),
    posts: semilla.posts.filter((x) => !x.companyId || hay(previas.companies, x.companyId)),
    accesses: semilla.accesses.filter((a) => hay(previas.companies, a.companyId)),
  };
}

/** Datos de dinero de ejemplo, sin enlaces a cosas que ya se borraron en la demo. */
function dineroDeEjemplo(semilla: Colecciones, previas: Partial<Colecciones>): Pick<Colecciones, 'retainers' | 'renewals' | 'invoices' | 'payments' | 'expenses'> {
  const ok = (lista: { id: string }[] | undefined, id: string | null) => (id && lista?.some((x) => x.id === id) ? id : null);
  return {
    retainers: semilla.retainers.map((r) => ({ ...r, companyId: ok(previas.companies, r.companyId), contactId: ok(previas.contacts, r.contactId) })),
    renewals: semilla.renewals.filter((n) => ok(previas.companies, n.companyId)),
    invoices: semilla.invoices.map((f) => ({
      ...f,
      companyId: ok(previas.companies, f.companyId),
      contactId: ok(previas.contacts, f.contactId),
      projectId: ok(previas.projects, f.projectId),
      dealId: ok(previas.deals, f.dealId),
    })),
    payments: semilla.payments,
    expenses: semilla.expenses.map((g) => ({ ...g, contactId: ok(previas.contacts, g.contactId), projectId: ok(previas.projects, g.projectId) })),
  };
}

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
  activeTimer: null,
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
        // Versión 2 (Fase 1): conserva lo hecho en la demo y añade los datos de dinero de ejemplo.
        // Versión 3 (Fase 2): conserva lo hecho y añade horas, contenidos, accesos, briefings y marcas de ejemplo.
        const semilla = () => semillaDemo(dia);
        let colecciones: Colecciones;
        if (s.v === VERSION && s.colecciones) colecciones = { ...coleccionesVacias(), ...s.colecciones };
        else if ((s.v === 2 || s.v === 3) && s.colecciones) {
          const base = { ...coleccionesVacias(), ...s.colecciones };
          const conDinero = s.v === 2 ? { ...base, ...dineroDeEjemplo(semilla(), s.colecciones) } : base;
          colecciones = trabajoDeEjemplo(semilla(), conDinero);
        } else colecciones = semilla();
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
      cambiar((c) => ponerFila(c, col, col === 'accesses' ? (conClave(fila as unknown as Acceso, undefined) as never) : fila));
    },
    async crearVarios(col, filas) {
      cambiar((c) => filas.reduce((x, f) => ponerFila(x, col, f), c));
    },
    async actualizar(col, id, cambios) {
      // Las mismas reglas que la base de datos: una factura emitida no se toca.
      const c = leerDemo(store).colecciones;
      const f = col === 'invoices' ? c.invoices.find((x) => x.id === id) : undefined;
      if (f && !cambioPermitido(f, cambios as Partial<Factura>)) throw new Error('Una factura emitida no se puede modificar');
      if (col === 'accesses') {
        const antes = c.accesses.find((a) => a.id === id);
        const nuevo = conClave({ ...(antes as Acceso), ...(cambios as Partial<Acceso>) }, antes);
        return cambiar((x) => cambiarFila(x, 'accesses', id, nuevo));
      }
      cambiar((x) => cambiarFila(x, col, id, cambios));
    },
    async borrar(col, id) {
      const c = leerDemo(store).colecciones;
      const ef = efectoDeBorrar(c, col, id);
      if (ef.borradas.some((b) => b.col === 'invoices' && esEmitida(b.fila as unknown as Factura))) throw new Error('Una factura emitida no se puede borrar');
      cambiar((x) => aplicarBorrado(x, ef));
    },
    async verClave(id) {
      return leerDemo(store).colecciones.accesses.find((a) => a.id === id)?.password ?? '';
    },
    async emitir(id) {
      const s = leerDemo(store);
      const f = s.colecciones.invoices.find((x) => x.id === id);
      if (!f) throw new Error('No se encuentra el documento');
      const problema = problemaParaEmitir(f);
      if (problema) throw new Error(problema);
      const empresa = s.colecciones.companies.find((e) => e.id === f.companyId);
      const cambios = cambiosAlEmitir(f, s.colecciones.invoices, empresa, s.ajustes, hoy(), new Date().toISOString());
      const nueva = { ...f, ...cambios };
      s.colecciones = cambiarFila(s.colecciones, 'invoices', id, cambios);
      escribirDemo(store, s);
      return nueva;
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
