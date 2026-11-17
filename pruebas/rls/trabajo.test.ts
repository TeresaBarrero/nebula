/**
 * Fase 3 en la base de datos real: contraseñas de accesos cifradas y solo visibles para su espacio,
 * horas y contenidos aislados por espacio, y cronómetro guardado en el perfil de cada persona.
 * Ejecutar con: npm run test:rls
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SECRETA = process.env.SUPABASE_SECRET_KEY ?? '';
const hayClaves = Boolean(URL && PUBLICA && SECRETA);
const opciones = { auth: { persistSession: false, autoRefreshToken: false } };
const marca = Math.random().toString(36).slice(2, 8);

type Usuario = { id: string; cliente: SupabaseClient; espacio: string };

describe.skipIf(!hayClaves)('Trabajo creativo en la base de datos', () => {
  let servicio: SupabaseClient;
  let ana: Usuario;
  let beto: Usuario;
  const creados: string[] = [];
  const empresa = crypto.randomUUID();
  const acceso = crypto.randomUUID();
  const CLAVE = `Secreta-${marca}-ñ!`;

  async function usuario(nombre: string): Promise<Usuario> {
    const email = `nebula-prueba-trabajo-${nombre}-${marca}@example.com`;
    const password = `Prueba-${marca}-segura-123`;
    const { data, error } = await servicio.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: nombre } });
    if (error || !data.user) throw error;
    creados.push(data.user.id);
    await servicio.rpc('admin_set_status', { target: data.user.id, new_status: 'aprobado' });
    const cliente = createClient(URL, PUBLICA, opciones);
    await cliente.auth.signInWithPassword({ email, password });
    const { data: m } = await servicio.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single();
    return { id: data.user.id, cliente, espacio: m!.workspace_id };
  }

  beforeAll(async () => {
    servicio = createClient(URL, SECRETA, opciones);
    [ana, beto] = await Promise.all([usuario('ana'), usuario('beto')]);
    const { error } = await ana.cliente.from('companies').insert({ id: empresa, workspace_id: ana.espacio, name: 'Cliente de Ana' });
    if (error) throw error;
    const g = await ana.cliente.rpc('guardar_acceso', { p_id: acceso, p_workspace: ana.espacio, p_company: empresa, p_service: 'WordPress', p_url: 'x.es', p_username: 'admin', p_password: CLAVE });
    if (g.error) throw g.error;
  });

  afterAll(async () => {
    if (!servicio) return;
    const { data: ws } = await servicio.from('workspaces').select('id').in('created_by', creados);
    for (const id of creados) await servicio.auth.admin.deleteUser(id);
    for (const w of ws ?? []) await servicio.from('workspaces').delete().eq('id', w.id);
  });

  it('la contraseña se guarda cifrada: ni la propia dueña puede leer la columna', async () => {
    const lista = await ana.cliente.from('accesses').select('id, service, username, has_password');
    expect(lista.data).toEqual([{ id: acceso, service: 'WordPress', username: 'admin', has_password: true }]);
    const cifrada = await ana.cliente.from('accesses').select('password_enc');
    expect(cifrada.error).not.toBeNull();
    const todo = await ana.cliente.from('accesses').select('*');
    expect(todo.error).not.toBeNull();
    // Ni siquiera con permisos totales aparece en claro.
    const { data } = await servicio.from('accesses').select('password_enc').eq('id', acceso).single();
    expect(JSON.stringify(data)).not.toContain(CLAVE);
  });

  it('solo su espacio la descifra', async () => {
    expect((await ana.cliente.rpc('ver_clave_acceso', { p_id: acceso })).data).toBe(CLAVE);
    const b = await beto.cliente.rpc('ver_clave_acceso', { p_id: acceso });
    expect(b.data).toBeNull();
    expect(b.error?.message).toMatch(/No se encuentra/);
    expect((await beto.cliente.from('accesses').select('id')).data).toEqual([]);
  });

  it('cambiar un acceso sin contraseña conserva la que había; vacía la quita', async () => {
    await ana.cliente.rpc('guardar_acceso', { p_id: acceso, p_workspace: ana.espacio, p_company: empresa, p_service: 'WordPress admin', p_url: 'x.es', p_username: 'admin', p_password: null });
    expect((await ana.cliente.rpc('ver_clave_acceso', { p_id: acceso })).data).toBe(CLAVE);
    const otro = crypto.randomUUID();
    await ana.cliente.rpc('guardar_acceso', { p_id: otro, p_workspace: ana.espacio, p_company: empresa, p_service: 'Hosting', p_url: '', p_username: '', p_password: 'temporal' });
    await ana.cliente.rpc('guardar_acceso', { p_id: otro, p_workspace: ana.espacio, p_company: empresa, p_service: 'Hosting', p_url: '', p_username: '', p_password: '' });
    const { data } = await ana.cliente.from('accesses').select('has_password').eq('id', otro).single();
    expect(data?.has_password).toBe(false);
  });

  it('no se puede escribir la tabla de accesos directamente, ni guardar en el espacio de otra persona', async () => {
    const directo = await ana.cliente.from('accesses').insert({ workspace_id: ana.espacio, service: 'Directo' });
    expect(directo.error).not.toBeNull();
    const ajeno = await beto.cliente.rpc('guardar_acceso', { p_id: crypto.randomUUID(), p_workspace: ana.espacio, p_company: null, p_service: 'Intruso', p_url: '', p_username: '', p_password: 'x' });
    expect(ajeno.error?.message).toMatch(/permiso/);
    const pisar = await beto.cliente.rpc('guardar_acceso', { p_id: acceso, p_workspace: beto.espacio, p_company: null, p_service: 'Pisado', p_url: '', p_username: '', p_password: 'x' });
    expect(pisar.error).not.toBeNull();
    expect((await ana.cliente.rpc('ver_clave_acceso', { p_id: acceso })).data).toBe(CLAVE);
  });

  it('horas y contenidos: cada espacio solo ve lo suyo', async () => {
    const h = await ana.cliente.from('time_entries').insert({ workspace_id: ana.espacio, minutes: 90, note: 'Diseño' });
    expect(h.error).toBeNull();
    const p = await ana.cliente.from('posts').insert({ workspace_id: ana.espacio, date: '2026-12-01', title: 'Post de Ana', company_id: empresa });
    expect(p.error).toBeNull();
    expect((await beto.cliente.from('time_entries').select('id')).data).toEqual([]);
    expect((await beto.cliente.from('posts').select('id')).data).toEqual([]);
    const cruzado = await beto.cliente.from('posts').insert({ workspace_id: beto.espacio, date: '2026-12-01', title: 'x', company_id: empresa });
    expect(cruzado.error).not.toBeNull();
    const malas = await ana.cliente.from('time_entries').insert({ workspace_id: ana.espacio, minutes: 0 });
    expect(malas.error).not.toBeNull();
  });

  it('cada persona guarda su cronómetro en su perfil y no puede tocar el de otra', async () => {
    const t = { start: new Date().toISOString(), projectId: null, retainerId: null, taskId: null, note: 'Prueba' };
    expect((await ana.cliente.from('profiles').update({ active_timer: t }).eq('id', ana.id)).error).toBeNull();
    const { data } = await ana.cliente.from('profiles').select('active_timer').eq('id', ana.id).single();
    expect(data?.active_timer).toMatchObject({ note: 'Prueba' });
    await beto.cliente.from('profiles').update({ active_timer: null }).eq('id', ana.id);
    const sigue = await servicio.from('profiles').select('active_timer').eq('id', ana.id).single();
    expect(sigue.data?.active_timer).toMatchObject({ note: 'Prueba' });
  });
});
