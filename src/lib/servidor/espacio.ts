import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Contexto, Correo, Ejecutor } from '@/lib/automatizaciones';
import { NOMBRES_COLECCION, coleccionesVacias, type Colecciones, type CorreoEnviado, type Factura, type Id } from '@/lib/datos/entidades';
import { TABLA, aFila, deFila } from '@/lib/datos/mapeo';
import { ajustesDesdeFila } from '@/lib/datos/almacen-nube';
import { AJUSTES_POR_DEFECTO, type Ajustes } from '@/lib/datos/tipos';
import { caducidadEnlace, hoyMadrid } from '@/lib/reglas/cliente';
import { SUPABASE_URL } from '@/lib/supabase/config';

/**
 * Conexión de servicio (salta las reglas RLS): SOLO en el servidor y SIEMPRE filtrando por el espacio.
 * Necesita SUPABASE_SECRET_KEY en las variables de entorno.
 */
export function servicio(): SupabaseClient | null {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const huellaHex = (s: string) => createHash('sha256').update(s).digest('hex');
export const origenDe = (req: Request) => process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
export const ipDe = (req: Request) => (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'desconocida';

/** Todos los datos de un espacio (para las automatizaciones y el portal). Las contraseñas de accesos no se cargan. */
export async function cargarEspacio(sb: SupabaseClient, ws: Id): Promise<{ c: Colecciones; ajustes: Ajustes }> {
  const c = coleccionesVacias();
  const tablas = NOMBRES_COLECCION.filter((n) => n !== 'accesses' && n !== 'outgoingEmails');
  const [aj, equipo, ...filas] = await Promise.all([
    sb.from('workspace_settings').select('*').eq('workspace_id', ws).maybeSingle(),
    sb.from('project_collaborators').select('project_id, contact_id').eq('workspace_id', ws),
    ...tablas.map((n) => sb.from(TABLA[n]).select('*').eq('workspace_id', ws)),
  ]);
  tablas.forEach((n, i) => {
    if (filas[i].error) throw filas[i].error;
    (c[n] as unknown[]) = (filas[i].data ?? []).map((f) => deFila(f as Record<string, unknown>));
  });
  const eq = (equipo.data ?? []) as { project_id: string; contact_id: string }[];
  c.projects = c.projects.map((p) => ({ ...p, collaborators: eq.filter((e) => e.project_id === p.id).map((e) => e.contact_id) }));
  return { c, ajustes: aj.data ? ajustesDesdeFila(aj.data as never) : { ...AJUSTES_POR_DEFECTO } };
}

/** Envía un correo con Resend (si hay RESEND_API_KEY) y lo apunta en «Correos enviados». Sin clave queda «simulado». */
export async function enviarCorreo(sb: SupabaseClient, ws: Id, m: Correo, responderA?: string): Promise<CorreoEnviado | null> {
  let status: CorreoEnviado['status'] = 'simulado';
  let error = '';
  const clave = process.env.RESEND_API_KEY;
  if (clave && m.to) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: process.env.EMAIL_FROM || 'nebúla <onboarding@resend.dev>', to: [m.to], subject: m.subject, text: m.body, ...(responderA ? { reply_to: responderA } : {}) }),
      });
      status = r.ok ? 'enviado' : 'error';
      if (!r.ok) error = (await r.text()).slice(0, 500);
    } catch (e) {
      status = 'error';
      error = String(e).slice(0, 500);
    }
  }
  const fila = { workspace_id: ws, contact_id: m.contactId, company_id: m.companyId, to: m.to.slice(0, 300), subject: m.subject.slice(0, 300), body: m.body.slice(0, 20000), kind: m.kind.slice(0, 40), status, error };
  const { data } = await sb.from('outgoing_emails').insert(fila).select('*').single();
  return data ? (deFila(data) as unknown as CorreoEnviado) : null;
}

/** Crea un enlace mágico del portal (30 días). Se guarda solo su huella. */
export async function crearEnlacePortal(sb: SupabaseClient, ws: Id, companyId: Id, contactId: Id | null, origen: string): Promise<string | null> {
  const token = randomBytes(32).toString('base64url');
  const { error } = await sb.from('portal_tokens').insert({
    workspace_id: ws, company_id: companyId, contact_id: contactId, token_hash: huellaHex(token), expires_at: caducidadEnlace(new Date()).toISOString(),
  });
  return error ? null : `${origen}/portal/${token}`;
}

/** Busca el enlace del portal: devuelve espacio y empresa si es válido y no ha caducado. */
export async function leerEnlace(sb: SupabaseClient, token: string): Promise<{ ws: Id; companyId: Id; contactId: Id | null } | null> {
  if (!/^[\w-]{30,80}$/.test(token)) return null;
  const { data } = await sb.from('portal_tokens').select('id, workspace_id, company_id, contact_id, expires_at').eq('token_hash', huellaHex(token)).maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  await sb.from('portal_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { ws: data.workspace_id, companyId: data.company_id, contactId: data.contact_id };
}

/** Ejecutor de las automatizaciones en el servidor, siempre dentro de un espacio. Mantiene `c` al día. */
export function ejecutorServidor(sb: SupabaseClient, ws: Id, c: Colecciones, responderA?: string): Ejecutor {
  return {
    async crear(col, fila) {
      const { error } = await sb.from(TABLA[col]).insert({ ...aFila(fila as Record<string, unknown>), workspace_id: ws });
      if (error) return false;
      (c[col] as unknown[]).push(fila);
      return true;
    },
    async actualizar(col, id, cambios) {
      const fila = aFila(cambios as Record<string, unknown>);
      if (Object.keys(fila).length) {
        const { error } = await sb.from(TABLA[col]).update(fila).eq('id', id).eq('workspace_id', ws);
        if (error) return false;
      }
      (c[col] as unknown as { id: Id }[]) = (c[col] as unknown as { id: Id }[]).map((x) => (x.id === id ? { ...x, ...cambios } : x));
      return true;
    },
    async emitir(id) {
      const { data, error } = await sb.rpc('emitir_documento', { p_id: id });
      if (error || !data) return null;
      const f = deFila(data as Record<string, unknown>) as unknown as Factura;
      c.invoices = c.invoices.map((x) => (x.id === id ? f : x));
      return f;
    },
    async correo(m) {
      await enviarCorreo(sb, ws, m, responderA);
    },
    async registrar(key, ref) {
      const { error } = await sb.from('automation_runs').insert({ workspace_id: ws, key, ref: ref.slice(0, 200) });
      if (error) return false;
      c.automationRuns.push({ id: '', key, ref, createdAt: new Date().toISOString() });
      return true;
    },
  };
}

/** Contexto de automatizaciones para un espacio en el servidor. */
export function contextoServidor(sb: SupabaseClient, ws: Id, c: Colecciones, ajustes: Ajustes, origen: string): Contexto {
  return {
    c, ajustes, hoy: hoyMadrid(), ahora: new Date().toISOString(), nuevoId: () => crypto.randomUUID(),
    enlacePortal: (companyId, contactId) => crearEnlacePortal(sb, ws, companyId, contactId, origen),
  };
}

/** Límite de peticiones de las páginas públicas: `max` por hora y por IP (la IP se guarda resumida). */
export async function dentroDeLimite(sb: SupabaseClient, tipo: string, ip: string, max: number): Promise<boolean> {
  const bucket = `${tipo}:${huellaHex(ip).slice(0, 24)}`;
  const desde = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from('rate_limits').select('id', { count: 'exact', head: true }).eq('bucket', bucket).gte('at', desde);
  if ((count ?? 0) >= max) return false;
  await sb.from('rate_limits').insert({ bucket });
  return true;
}

/** Espacio por su nombre público (/reservar/…, /formulario/…). */
export async function espacioPorSlug(sb: SupabaseClient, slug: string): Promise<Id | null> {
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) return null;
  const { data } = await sb.from('workspace_settings').select('workspace_id').eq('public_slug', slug).maybeSingle();
  return data?.workspace_id ?? null;
}

/** Comprueba la sesión de la persona y devuelve su espacio (para las rutas que se llaman desde la app). */
export async function espacioDeSesion(): Promise<{ ws: Id; email: string } | null> {
  const { supabaseServidor } = await import('@/lib/supabase/servidor');
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data: m } = await sb.from('workspace_members').select('workspace_id').eq('user_id', u.user.id).order('created_at').limit(1).maybeSingle();
  if (!m) return null;
  const { data: ok } = await sb.rpc('is_member', { ws: m.workspace_id });
  return ok ? { ws: m.workspace_id, email: u.user.email ?? '' } : null;
}

export const json = (cuerpo: unknown, status = 200) => Response.json(cuerpo, { status, headers: { 'cache-control': 'no-store' } });
