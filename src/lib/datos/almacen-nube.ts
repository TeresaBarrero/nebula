import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-bd';
import { esDisciplina } from '@/lib/catalogos/disciplinas';
import { limpiarDatosAsistente } from './asistente';
import { NOMBRES_COLECCION, coleccionesVacias, type Factura, type Proyecto } from './entidades';
import { TABLA, aFila, deFila } from './mapeo';
import {
  AJUSTES_POR_DEFECTO,
  PREFS_POR_DEFECTO,
  type Ajustes,
  type Almacen,
  type Cargado,
  type EstadoCuenta,
  type Perfil,
  type Preferencias,
} from './tipos';

type FilaPerfil = Database['public']['Tables']['profiles']['Row'];
type FilaAjustes = Database['public']['Tables']['workspace_settings']['Row'];
type CambiosAjustes = Database['public']['Tables']['workspace_settings']['Update'];

/** La cuenta existe pero no puede usar la app todavía (o ya no). */
export class CuentaNoActiva extends Error {
  constructor(public estado: EstadoCuenta | 'sin-espacio') {
    super(`Cuenta no activa: ${estado}`);
  }
}

export class SinSesion extends Error {}

function prefsDesde(j: unknown): Preferencias {
  const o = (j && typeof j === 'object' ? j : {}) as Record<string, unknown>;
  const theme = o.theme === 'light' || o.theme === 'dark' ? o.theme : 'system';
  return { ...PREFS_POR_DEFECTO, theme, compact: o.compact === true };
}

export function perfilDesdeFila(f: FilaPerfil): Perfil {
  return { fullName: f.full_name, name: f.name, role: f.role, email: f.email, phone: f.phone, prefs: prefsDesde(f.prefs) };
}

export function ajustesDesdeFila(f: FilaAjustes): Ajustes {
  const po = (f.pay_online && typeof f.pay_online === 'object' ? f.pay_online : {}) as Record<string, unknown>;
  return {
    business: f.business,
    legalName: f.legal_name,
    nif: f.nif,
    address: f.address,
    iban: f.iban,
    kind: f.kind === 'sociedad' ? 'sociedad' : 'autonomo',
    newAutonomo: f.new_autonomo,
    irpfMode: f.irpf_mode === 'particulares' || f.irpf_mode === 'mixto' ? f.irpf_mode : 'empresas',
    iva: Number(f.iva),
    irpf: Number(f.irpf),
    payDays: Number(f.pay_days),
    rate: Number(f.rate),
    extraRound: Number(f.extra_round),
    capacity: Number(f.capacity),
    disciplines: (f.disciplines || []).filter(esDisciplina),
    payOnline: { card: po.card === true, bizum: po.bizum === true },
    onboarded: f.onboarded,
  };
}

/** Traduce los cambios de la app a columnas de la base de datos. */
export function filaDesdeAjustes(a: Partial<Ajustes>): CambiosAjustes {
  const f: CambiosAjustes = {};
  if (a.business !== undefined) f.business = a.business;
  if (a.legalName !== undefined) f.legal_name = a.legalName;
  if (a.nif !== undefined) f.nif = a.nif;
  if (a.address !== undefined) f.address = a.address;
  if (a.iban !== undefined) f.iban = a.iban;
  if (a.kind !== undefined) f.kind = a.kind;
  if (a.newAutonomo !== undefined) f.new_autonomo = a.newAutonomo;
  if (a.irpfMode !== undefined) f.irpf_mode = a.irpfMode;
  if (a.iva !== undefined) f.iva = a.iva;
  if (a.irpf !== undefined) f.irpf = a.irpf;
  if (a.payDays !== undefined) f.pay_days = a.payDays;
  if (a.rate !== undefined) f.rate = a.rate;
  if (a.extraRound !== undefined) f.extra_round = a.extraRound;
  if (a.capacity !== undefined) f.capacity = a.capacity;
  if (a.disciplines !== undefined) f.disciplines = a.disciplines;
  if (a.payOnline !== undefined) f.pay_online = a.payOnline;
  if (a.onboarded !== undefined) f.onboarded = a.onboarded;
  return f;
}

export function crearAlmacenNube(sb: SupabaseClient<Database>): Almacen {
  let usuarioId = '';
  let espacioId = '';
  // Para las tablas de datos (nombres dinámicos) se usa el cliente sin tipos; las columnas las traduce mapeo.ts.
  const db = sb as unknown as SupabaseClient;

  return {
    modo: 'nube',
    async cargar(): Promise<Cargado> {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) throw new SinSesion();
      usuarioId = u.user.id;

      const { data: perfil, error: e1 } = await sb.from('profiles').select('*').eq('id', usuarioId).single();
      if (e1 || !perfil) throw e1 ?? new Error('No se encuentra tu perfil.');
      if (perfil.status !== 'aprobado') throw new CuentaNoActiva(perfil.status === 'rechazado' ? 'rechazado' : 'pendiente');

      const { data: miembro } = await sb
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', usuarioId)
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (!miembro) throw new CuentaNoActiva('sin-espacio');
      espacioId = miembro.workspace_id;

      const [{ data: ajustes, error: e2 }, { data: admin }] = await Promise.all([
        sb.from('workspace_settings').select('*').eq('workspace_id', espacioId).single(),
        sb.from('app_admins').select('user_id').eq('user_id', usuarioId).maybeSingle(),
      ]);
      if (e2) throw e2;

      return {
        perfil: perfilDesdeFila(perfil),
        ajustes: ajustes ? ajustesDesdeFila(ajustes) : { ...AJUSTES_POR_DEFECTO },
        esAdmin: Boolean(admin),
        datosPrevios: limpiarDatosAsistente(perfil.signup_data),
      };
    },
    async guardarPerfil(c) {
      const fila: Database['public']['Tables']['profiles']['Update'] = {};
      if (c.fullName !== undefined) fila.full_name = c.fullName;
      if (c.name !== undefined) fila.name = c.name;
      if (c.role !== undefined) fila.role = c.role;
      if (c.phone !== undefined) fila.phone = c.phone;
      if (c.prefs !== undefined) fila.prefs = c.prefs;
      const { error } = await sb.from('profiles').update(fila).eq('id', usuarioId);
      if (error) throw error;
    },
    async guardarAjustes(c) {
      const { error } = await sb.from('workspace_settings').update(filaDesdeAjustes(c)).eq('workspace_id', espacioId);
      if (error) throw error;
    },

    async cargarColecciones() {
      const c = coleccionesVacias();
      const pedir = async (tabla: string) => {
        const { data, error } = await db.from(tabla).select('*');
        if (error) throw error;
        return (data ?? []) as Record<string, unknown>[];
      };
      const [equipo, leidos, ...tablas] = await Promise.all([
        pedir('project_collaborators'),
        pedir('notification_reads'),
        ...NOMBRES_COLECCION.map((n) => pedir(TABLA[n])),
      ]);
      NOMBRES_COLECCION.forEach((n, i) => {
        (c[n] as unknown[]) = tablas[i].map(deFila);
      });
      c.projects = c.projects.map((p) => ({
        ...p,
        collaborators: equipo.filter((e) => e.project_id === p.id).map((e) => String(e.contact_id)),
      }));
      c.notificationReads = leidos.map((l) => String(l.key));
      return c;
    },
    async crear(col, fila) {
      const { error } = await db.from(TABLA[col]).insert({ ...aFila(fila as Record<string, unknown>), workspace_id: espacioId });
      if (error) throw error;
      if (col === 'projects') await ponerEquipo(fila.id, (fila as Proyecto).collaborators);
    },
    async crearVarios(col, filas) {
      if (!filas.length) return;
      const { error } = await db.from(TABLA[col]).insert(filas.map((f) => ({ ...aFila(f as Record<string, unknown>), workspace_id: espacioId })));
      if (error) throw error;
      if (col === 'projects') for (const f of filas) await ponerEquipo(f.id, (f as Proyecto).collaborators);
    },
    async actualizar(col, id, cambios) {
      const fila = aFila(cambios as Record<string, unknown>);
      if (Object.keys(fila).length) {
        const { error } = await db.from(TABLA[col]).update(fila).eq('id', id);
        if (error) throw error;
      }
      if (col === 'projects' && 'collaborators' in cambios) await ponerEquipo(id, (cambios as Partial<Proyecto>).collaborators ?? []);
    },
    async borrar(col, id) {
      // La base de datos desvincula y borra en cascada igual que reglas/vinculos.ts.
      const { error } = await db.from(TABLA[col]).delete().eq('id', id);
      if (error) throw error;
    },
    async restaurar(ef) {
      for (const { col, fila } of ef.borradas) await this.crear(col, fila as never);
      for (const d of ef.desvinculadas.filter((x) => !x.fija)) await this.actualizar(d.col, d.id, { [d.campo]: d.antes } as never);
    },
    async emitir(id) {
      // La numeración la hace la base de datos (emitir_documento): atómica y sin huecos.
      const { data, error } = await db.rpc('emitir_documento', { p_id: id });
      if (error) throw new Error(error.message);
      return deFila(data as Record<string, unknown>) as unknown as Factura;
    },
    async marcarLeidos(claves) {
      if (!claves.length) return;
      const { error } = await db
        .from('notification_reads')
        .upsert(claves.map((key) => ({ key, workspace_id: espacioId })), { onConflict: 'workspace_id,key', ignoreDuplicates: true });
      if (error) throw error;
    },
    async subirArchivo(id, archivo) {
      const nombre = archivo.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-120);
      const ruta = `${espacioId}/${id}/${nombre}`;
      const { error } = await sb.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type || undefined, upsert: false });
      if (error) throw error;
      return ruta;
    },
    async urlArchivo(ruta) {
      if (!ruta) return null;
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(ruta, 120);
      return data?.signedUrl ?? null;
    },
    async borrarArchivo(ruta) {
      if (ruta) await sb.storage.from(BUCKET).remove([ruta]);
    },
  };

  /** Sustituye el equipo (colaboradores) de un proyecto. */
  async function ponerEquipo(proyecto: string, ids: string[]) {
    const { error: e1 } = await db.from('project_collaborators').delete().eq('project_id', proyecto);
    if (e1) throw e1;
    if (!ids.length) return;
    const { error: e2 } = await db
      .from('project_collaborators')
      .insert(ids.map((contact_id) => ({ project_id: proyecto, contact_id, workspace_id: espacioId })));
    if (e2) throw e2;
  }
}

const BUCKET = 'documentos';
