/**
 * Pruebas de seguridad (RLS) contra la base de datos de Supabase.
 * Crean usuarios de prueba, comprueban que nadie ve ni toca datos ajenos y los borran al terminar.
 * Ejecutar con: npm run test:rls   (necesita las tres claves en .env.local)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/tipos-bd';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SECRETA = process.env.SUPABASE_SECRET_KEY ?? '';
const hayClaves = Boolean(URL && PUBLICA && SECRETA);

type Cliente = SupabaseClient<Database>;
const opciones = { auth: { persistSession: false, autoRefreshToken: false } };

const marca = Math.random().toString(36).slice(2, 8);
const clave = `Prueba-${marca}-segura-123`;
const creados: string[] = [];

let servicio: Cliente;
async function crearUsuario(nombre: string): Promise<{ id: string; cliente: Cliente }> {
  const email = `nebula-prueba-${nombre}-${marca}@example.com`;
  const { data, error } = await servicio.auth.admin.createUser({
    email,
    password: clave,
    email_confirm: true,
    user_metadata: { full_name: `Prueba ${nombre}`, acepta_privacidad: true },
  });
  if (error || !data.user) throw error ?? new Error('No se creó el usuario');
  creados.push(data.user.id);
  const cliente = createClient<Database>(URL, PUBLICA, opciones);
  const { error: e2 } = await cliente.auth.signInWithPassword({ email, password: clave });
  if (e2) throw e2;
  return { id: data.user.id, cliente };
}

describe.skipIf(!hayClaves)('Seguridad: cada espacio solo ve lo suyo', () => {
  let ana: { id: string; cliente: Cliente };
  let beto: { id: string; cliente: Cliente };
  let carla: { id: string; cliente: Cliente }; // se queda pendiente
  let admin: { id: string; cliente: Cliente };

  beforeAll(async () => {
    servicio = createClient<Database>(URL, SECRETA, opciones);
    [ana, beto, carla, admin] = await Promise.all([crearUsuario('ana'), crearUsuario('beto'), crearUsuario('carla'), crearUsuario('admin')]);
    for (const u of [ana, beto]) {
      const { error } = await servicio.rpc('admin_set_status', { target: u.id, new_status: 'aprobado' });
      if (error) throw error;
    }
    const { error } = await (servicio.from('app_admins') as unknown as { insert: (v: object) => Promise<{ error: unknown }> }).insert({ user_id: admin.id });
    if (error) throw error;
  });

  afterAll(async () => {
    if (!servicio) return;
    // Borrar a la persona borra en cascada su perfil, su pertenencia al espacio y su rol de administración.
    const { data: espacios } = await servicio.from('workspaces').select('id').in('created_by', creados);
    for (const id of creados) await servicio.auth.admin.deleteUser(id);
    if (espacios?.length) await (servicio.from('workspaces') as unknown as { delete: () => { in: (c: string, v: string[]) => Promise<unknown> } }).delete().in('id', espacios.map((e) => e.id));
  });

  it('al registrarse, la cuenta queda pendiente', async () => {
    const { data } = await carla.cliente.from('profiles').select('status').eq('id', carla.id).single();
    expect(data?.status).toBe('pendiente');
  });

  it('al aprobarla se crea su espacio con los ajustes por defecto', async () => {
    const { data } = await ana.cliente.from('workspace_settings').select('*');
    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({ iva: 21, irpf: 15, pay_days: 30, rate: 50, extra_round: 120, capacity: 30, onboarded: false });
  });

  it('Ana no ve los ajustes, el espacio ni el perfil de Beto', async () => {
    const { data: deBeto } = await beto.cliente.from('workspace_settings').select('workspace_id').single();
    const s = await ana.cliente.from('workspace_settings').select('*').eq('workspace_id', deBeto!.workspace_id);
    expect(s.data).toEqual([]);
    const w = await ana.cliente.from('workspaces').select('*').eq('id', deBeto!.workspace_id);
    expect(w.data).toEqual([]);
    const p = await ana.cliente.from('profiles').select('*').eq('id', beto.id);
    expect(p.data).toEqual([]);
    const m = await ana.cliente.from('workspace_members').select('*').eq('user_id', beto.id);
    expect(m.data).toEqual([]);
  });

  it('Ana no puede cambiar los ajustes de Beto', async () => {
    const { data: deBeto } = await beto.cliente.from('workspace_settings').select('workspace_id, business').single();
    const r = await ana.cliente.from('workspace_settings').update({ business: 'hackeado' }).eq('workspace_id', deBeto!.workspace_id).select();
    expect(r.data ?? []).toEqual([]);
    const { data: despues } = await beto.cliente.from('workspace_settings').select('business').single();
    expect(despues?.business).toBe(deBeto!.business);
  });

  it('Ana sí puede cambiar sus propios ajustes', async () => {
    const r = await ana.cliente.from('workspace_settings').update({ business: 'Estudio Ana' }).neq('business', 'x').select('business');
    expect(r.error).toBeNull();
    expect(r.data?.[0]?.business).toBe('Estudio Ana');
  });

  it('nadie puede aprobarse a sí mismo ni hacerse administrador', async () => {
    const r1 = await carla.cliente.from('profiles').update({ status: 'aprobado' } as never).eq('id', carla.id);
    expect(r1.error).not.toBeNull();
    const r2 = await carla.cliente.rpc('admin_set_status', { target: carla.id, new_status: 'aprobado' });
    expect(r2.error).not.toBeNull();
    const r3 = await (carla.cliente.from('app_admins') as unknown as { insert: (v: object) => Promise<{ error: unknown }> }).insert({ user_id: carla.id });
    expect(r3.error).not.toBeNull();
    const { data } = await servicio.from('profiles').select('status').eq('id', carla.id).single();
    expect(data?.status).toBe('pendiente');
  });

  it('una cuenta pendiente no ve ningún espacio ni ajustes', async () => {
    expect((await carla.cliente.from('workspaces').select('*')).data).toEqual([]);
    expect((await carla.cliente.from('workspace_settings').select('*')).data).toEqual([]);
  });

  it('una cuenta normal no puede ver la lista de solicitudes ni aprobar a nadie', async () => {
    expect((await ana.cliente.rpc('admin_list_accounts')).error).not.toBeNull();
    expect((await ana.cliente.rpc('admin_set_status', { target: carla.id, new_status: 'aprobado' })).error).not.toBeNull();
  });

  it('sin sesión no se ve nada', async () => {
    const anonimo = createClient<Database>(URL, PUBLICA, opciones);
    const r = await anonimo.from('profiles').select('*');
    expect(r.data ?? []).toEqual([]);
    expect((await anonimo.from('workspace_settings').select('*')).data ?? []).toEqual([]);
  });

  it('quien administra ve las solicitudes y puede aprobar', async () => {
    const lista = await admin.cliente.rpc('admin_list_accounts');
    expect(lista.error).toBeNull();
    expect(lista.data?.some((c) => c.id === carla.id && c.status === 'pendiente')).toBe(true);
    const r = await admin.cliente.rpc('admin_set_status', { target: carla.id, new_status: 'aprobado' });
    expect(r.error).toBeNull();
    // Su espacio es nuevo y vacío, y quien administra no puede ver dentro.
    expect((await carla.cliente.from('workspace_settings').select('*')).data).toHaveLength(1);
    expect((await admin.cliente.from('workspace_settings').select('*')).data).toEqual([]);
  });

  it('si se rechaza una cuenta aprobada, pierde el acceso a su espacio', async () => {
    await admin.cliente.rpc('admin_set_status', { target: carla.id, new_status: 'rechazado' });
    expect((await carla.cliente.from('workspace_settings').select('*')).data).toEqual([]);
  });
});
