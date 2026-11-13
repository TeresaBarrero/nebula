import type { Disciplina } from '@/lib/catalogos/disciplinas';
import type { FormaJuridica, ModoIrpf } from '@/lib/reglas/irpf';
import type { EfectoBorrado } from '@/lib/reglas/vinculos';
import type { Colecciones, FilaDe, Id, NombreColeccion } from './entidades';

export type Tema = 'system' | 'light' | 'dark';

export type Preferencias = { theme: Tema; compact: boolean };

/** Datos de la persona (tabla `profiles`). */
export type Perfil = {
  fullName: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  prefs: Preferencias;
};

/** Datos del negocio (tabla `workspace_settings`, SPEC §4.1). */
export type Ajustes = {
  business: string;
  legalName: string;
  nif: string;
  address: string;
  iban: string;
  kind: FormaJuridica;
  newAutonomo: boolean;
  irpfMode: ModoIrpf;
  iva: number;
  irpf: number;
  payDays: number;
  rate: number;
  extraRound: number;
  capacity: number;
  disciplines: Disciplina[];
  payOnline: { card: boolean; bizum: boolean };
  onboarded: boolean;
};

export type EstadoCuenta = 'pendiente' | 'aprobado' | 'rechazado';

export type Modo = 'demo' | 'nube';

/** Lo que el asistente pregunta (y lo que se puede traer desde la demo al registrarse). */
export type DatosAsistente = {
  name: string;
  business: string;
  disciplines: Disciplina[];
  kind: FormaJuridica;
  newAutonomo: boolean;
  irpfMode: ModoIrpf;
  iva: number;
  nif: string;
  iban: string;
  rate: number;
};

export type Cargado = {
  perfil: Perfil;
  ajustes: Ajustes;
  esAdmin: boolean;
  /** Respuestas del asistente traídas desde la demo, si las hay y aún no se ha hecho el asistente. */
  datosPrevios: DatosAsistente | null;
};

/**
 * Almacén de datos. Hay dos: el de la demo (navegador) y el de la nube (Supabase).
 * Las pantallas solo hablan con esta interfaz.
 */
export interface Almacen {
  modo: Modo;
  cargar(): Promise<Cargado>;
  guardarPerfil(cambios: Partial<Omit<Perfil, 'email'>>): Promise<void>;
  guardarAjustes(cambios: Partial<Ajustes>): Promise<void>;

  /** Todos los datos del espacio (contactos, empresas, proyectos…). */
  cargarColecciones(): Promise<Colecciones>;
  crear<K extends NombreColeccion>(col: K, fila: FilaDe<K>): Promise<void>;
  actualizar<K extends NombreColeccion>(col: K, id: Id, cambios: Partial<FilaDe<K>>): Promise<void>;
  /** Borra una fila; los vínculos y cascadas los resuelve igual que la base de datos (reglas/vinculos.ts). */
  borrar(col: NombreColeccion, id: Id): Promise<void>;
  /** Vuelve a poner lo borrado (para «Deshacer»). */
  restaurar(ef: EfectoBorrado): Promise<void>;
  marcarLeidos(claves: string[]): Promise<void>;

  /** Guarda el archivo y devuelve dónde quedó (storagePath). */
  subirArchivo(id: Id, archivo: File): Promise<string>;
  /** Enlace temporal para abrir o descargar el archivo. */
  urlArchivo(storagePath: string): Promise<string | null>;
  borrarArchivo(storagePath: string): Promise<void>;
}

export const PREFS_POR_DEFECTO: Preferencias = { theme: 'system', compact: false };

export const AJUSTES_POR_DEFECTO: Ajustes = {
  business: '',
  legalName: '',
  nif: '',
  address: '',
  iban: '',
  kind: 'autonomo',
  newAutonomo: false,
  irpfMode: 'empresas',
  iva: 21,
  irpf: 15,
  payDays: 30,
  rate: 50,
  extraRound: 120,
  capacity: 30,
  disciplines: [],
  payOnline: { card: false, bizum: false },
  onboarded: false,
};
