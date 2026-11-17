/**
 * Fase 5 contra la base de datos real: borrado RGPD de un contacto (todo o nada, sin datos personales salvo
 * las facturas desvinculadas) y el permiso de Google guardado cifrado y fuera del alcance de la app.
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

describe.skipIf(!hayClaves)('Cierre: protección de datos y Google Calendar', () => {
  let servicio: SupabaseClient;
  const usuarios: { id: string; cliente: SupabaseClient; espacio: string }[] = [];
  const empresa = crypto.randomUUID();
  const persona = crypto.randomUUID();
  const factura = crypto.randomUUID();
  const NOMBRE = `Persona Borrable ${marca}`;
  const EMAIL = `borrable-${marca}@example.com`;

  async function usuario(n: string) {
    const email = `nebula-prueba-cierre-${n}-${marca}@example.com`;
    const password = `Prueba-${marca}-segura-123`;
    const { data, error } = await servicio.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: n } });
    if (error || !data.user) throw error ?? new Error('sin usuario');
    await servicio.rpc('admin_set_status', { target: data.user.id, new_status: 'aprobado' });
    const cliente = createClient(URL, PUBLICA, opciones);
    await cliente.auth.signInWithPassword({ email, password });
    const { data: m } = await servicio.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single();
    const u = { id: data.user.id, cliente, espacio: m!.workspace_id };
    usuarios.push(u);
    return u;
  }

  beforeAll(async () => {
    servicio = createClient(URL, SECRETA, opciones);
    const ana = await usuario('ana');
    await usuario('beto');
    const w = ana.espacio;
    const ins = async (t: string, f: object) => {
      const { error } = await ana.cliente.from(t).insert({ workspace_id: w, ...f });
      if (error) throw new Error(`${t}: ${error.message}`);
    };
    await ins('companies', { id: empresa, name: 'Empresa de la persona' });
    await ins('contacts', { id: persona, name: NOMBRE, email: EMAIL, company_id: empresa });
    await ins('activities', { type: 'llamada', text: `Llamé a ${NOMBRE}`, contact_id: persona });
    await ins('events', { title: `Reunión con ${NOMBRE}`, date: '2026-12-01', contact_id: persona });
    await ins('notes', { text: `Nota sobre ${NOMBRE}`, contact_id: persona });
    await ins('tasks', { title: 'Tarea suya', contact_id: persona });
    await ins('invoices', { id: factura, kind: 'factura', series: 'F', company_id: empresa, contact_id: persona, lines: [{ desc: 'Trabajo', qty: 1, price: 100 }] });
    const { error } = await ana.cliente.rpc('emitir_documento', { p_id: factura });
    if (error) throw error;
    await servicio.from('outgoing_emails').insert({ workspace_id: w, contact_id: persona, to: EMAIL, subject: 'Hola' });
  });

  afterAll(async () => {
    if (!servicio) return;
    const { data: ws } = await servicio.from('workspaces').select('id').in('created_by', usuarios.map((u) => u.id));
    for (const u of usuarios) await servicio.auth.admin.deleteUser(u.id);
    for (const w of ws ?? []) await servicio.from('workspaces').delete().eq('id', w.id);
  });

  it('otra cuenta no puede borrar los datos de tu contacto', async () => {
    const { error } = await usuarios[1].cliente.rpc('borrar_datos_contacto', { p_id: persona });
    expect(error?.message).toMatch(/No se encuentra/);
    const { data } = await servicio.from('contacts').select('id').eq('id', persona);
    expect(data).toHaveLength(1);
  });

  it('«Borrar sus datos» no deja datos personales; la factura emitida se conserva desvinculada', async () => {
    const ana = usuarios[0];
    const { error } = await ana.cliente.rpc('borrar_datos_contacto', { p_id: persona });
    expect(error).toBeNull();
    for (const t of ['contacts', 'activities', 'events', 'notes', 'tasks', 'outgoing_emails', 'deals', 'files']) {
      const { data } = await servicio.from(t).select('*').eq('workspace_id', ana.espacio);
      const s = JSON.stringify(data);
      expect(s, t).not.toContain(NOMBRE);
      expect(s, t).not.toContain(EMAIL);
      expect(s, t).not.toContain(persona);
    }
    const { data: f } = await servicio.from('invoices').select('status, contact_id, number').eq('id', factura).single();
    expect(f).toMatchObject({ status: 'emitida', contact_id: null });
    const { data: tareas } = await servicio.from('tasks').select('title, contact_id').eq('workspace_id', ana.espacio);
    expect(tareas).toEqual([{ title: 'Tarea suya', contact_id: null }]);
    const { data: reg } = await ana.cliente.from('rgpd_log').select('action, detail');
    expect(reg?.[0].action).toBe('Borrado de datos');
    expect(JSON.stringify(reg)).not.toContain(NOMBRE);
  });

  it('el permiso de Google se guarda cifrado y la app no puede leerlo ni escribirlo', async () => {
    const ana = usuarios[0];
    const TOKEN = `refresh-secreto-${marca}`;
    expect((await ana.cliente.rpc('guardar_integracion', { p_ws: ana.espacio, p_provider: 'gcal', p_email: 'a@x.es', p_token: TOKEN })).error).not.toBeNull();
    expect((await servicio.rpc('guardar_integracion', { p_ws: ana.espacio, p_provider: 'gcal', p_email: 'a@x.es', p_token: TOKEN })).error).toBeNull();
    const { data: visible } = await ana.cliente.from('integrations').select('provider, account_email, on_');
    expect(visible).toEqual([{ provider: 'gcal', account_email: 'a@x.es', on_: true }]);
    expect((await ana.cliente.from('integrations').select('token_enc')).error).not.toBeNull();
    expect((await ana.cliente.rpc('leer_integracion', { p_ws: ana.espacio, p_provider: 'gcal' })).error).not.toBeNull();
    const { data: cruda } = await servicio.from('integrations').select('token_enc').eq('workspace_id', ana.espacio).single();
    expect(JSON.stringify(cruda)).not.toContain(TOKEN);
    expect((await servicio.rpc('leer_integracion', { p_ws: ana.espacio, p_provider: 'gcal' })).data).toBe(TOKEN);
    expect((await usuarios[1].cliente.from('integrations').select('id')).data).toEqual([]);
  });
});
