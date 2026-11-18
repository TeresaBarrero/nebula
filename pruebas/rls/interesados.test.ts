/**
 * Lista de interesados contra la base de datos real: nadie la ve ni la escribe salvo el servidor y quien administra.
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

describe.skipIf(!hayClaves)('Interesados: solo el servidor y quien administra', () => {
  let servicio: SupabaseClient;
  const usuarios: { id: string; cliente: SupabaseClient }[] = [];
  let fila = '';

  async function usuario(n: string, admin: boolean) {
    const email = `nebula-prueba-interes-${n}-${marca}@example.com`;
    const password = `Prueba-${marca}-segura-123`;
    const { data, error } = await servicio.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: n } });
    if (error || !data.user) throw error ?? new Error('sin usuario');
    await servicio.rpc('admin_set_status', { target: data.user.id, new_status: 'aprobado' });
    if (admin) await servicio.from('app_admins').insert({ user_id: data.user.id });
    const cliente = createClient(URL, PUBLICA, opciones);
    await cliente.auth.signInWithPassword({ email, password });
    const u = { id: data.user.id, cliente };
    usuarios.push(u);
    return u;
  }

  beforeAll(async () => {
    servicio = createClient(URL, SECRETA, opciones);
    const { data, error } = await servicio
      .from('interesados')
      .insert({ name: `Interesada ${marca}`, email: `interesada-${marca}@example.com`, privacy_accepted_at: new Date().toISOString() })
      .select('id')
      .single();
    if (error) throw error;
    fila = data.id;
  });

  afterAll(async () => {
    await servicio.from('interesados').delete().eq('id', fila);
    for (const u of usuarios) {
      await servicio.from('app_admins').delete().eq('user_id', u.id);
      await servicio.auth.admin.deleteUser(u.id);
    }
  });

  it('un visitante sin cuenta no puede leer ni apuntar a nadie directamente', async () => {
    const anon = createClient(URL, PUBLICA, opciones);
    const { data } = await anon.from('interesados').select('id');
    expect(data ?? []).toHaveLength(0);
    const { error } = await anon.from('interesados').insert({ name: 'Spam', email: `spam-${marca}@example.com`, privacy_accepted_at: new Date().toISOString() });
    expect(error).toBeTruthy();
  });

  it('una cuenta normal no ve la lista ni puede borrarla', async () => {
    const u = await usuario('normal', false);
    const { data } = await u.cliente.from('interesados').select('id').eq('id', fila);
    expect(data ?? []).toHaveLength(0);
    await u.cliente.from('interesados').delete().eq('id', fila);
    const { data: sigue } = await servicio.from('interesados').select('id').eq('id', fila);
    expect(sigue).toHaveLength(1);
  });

  it('quien administra ve la lista y puede marcar como contactado', async () => {
    const a = await usuario('admin', true);
    const { data } = await a.cliente.from('interesados').select('id').eq('id', fila);
    expect(data).toHaveLength(1);
    const { error } = await a.cliente.from('interesados').update({ contacted: true }).eq('id', fila);
    expect(error).toBeNull();
  });

  it('no se puede apuntar dos veces el mismo email', async () => {
    const { error } = await servicio.from('interesados').insert({ name: 'Repetida', email: `INTERESADA-${marca}@example.com`, privacy_accepted_at: new Date().toISOString() });
    expect(error).toBeTruthy();
  });
});
