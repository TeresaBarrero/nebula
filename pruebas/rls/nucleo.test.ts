/**
 * Seguridad de las tablas de la Fase 1 y de los documentos (Storage).
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

const TABLAS = ['companies', 'contacts', 'projects', 'project_collaborators', 'deals', 'deliverables', 'tasks', 'events', 'notes', 'activities', 'files', 'notification_reads'];

type Usuario = { id: string; cliente: SupabaseClient; espacio: string };

describe.skipIf(!hayClaves)('Seguridad de la Fase 1: cada espacio solo ve y toca lo suyo', () => {
  let servicio: SupabaseClient;
  let ana: Usuario;
  let beto: Usuario;
  const creados: string[] = [];
  const ids = { empresa: crypto.randomUUID(), contacto: crypto.randomUUID(), proyecto: crypto.randomUUID(), tarea: crypto.randomUUID() };
  const ruta = () => `${ana.espacio}/${crypto.randomUUID()}/prueba.txt`;
  let rutaAna = '';

  async function usuario(nombre: string): Promise<Usuario> {
    const email = `nebula-prueba-${nombre}-${marca}@example.com`;
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
    const w = ana.espacio;
    const ins = async (t: string, fila: object) => {
      const { error } = await ana.cliente.from(t).insert({ workspace_id: w, ...fila });
      if (error) throw new Error(`${t}: ${error.message}`);
    };
    await ins('companies', { id: ids.empresa, name: 'Empresa de Ana' });
    await ins('contacts', { id: ids.contacto, name: 'Cliente de Ana', company_id: ids.empresa });
    await ins('projects', { id: ids.proyecto, name: 'Proyecto de Ana', contact_id: ids.contacto });
    await ins('project_collaborators', { project_id: ids.proyecto, contact_id: ids.contacto });
    await ins('deals', { title: 'Oportunidad de Ana', company_id: ids.empresa, contact_id: ids.contacto });
    await ins('deliverables', { project_id: ids.proyecto, name: 'Entregable de Ana' });
    await ins('tasks', { id: ids.tarea, title: 'Tarea de Ana', project_id: ids.proyecto });
    await ins('events', { title: 'Reunión de Ana', date: '2026-11-20' });
    await ins('notes', { text: 'Nota de Ana' });
    await ins('activities', { type: 'nota', text: 'Apunte de Ana', contact_id: ids.contacto });
    rutaAna = ruta();
    const { error: eS } = await ana.cliente.storage.from('documentos').upload(rutaAna, new Blob(['secreto de Ana']), { contentType: 'text/plain' });
    if (eS) throw eS;
    await ins('files', { name: 'prueba.txt', size: 14, mime: 'text/plain', storage_path: rutaAna, company_id: ids.empresa });
    await ins('notification_reads', { key: 'aviso-de-ana' });
  });

  afterAll(async () => {
    if (!servicio) return;
    if (rutaAna) await servicio.storage.from('documentos').remove([rutaAna]);
    const { data: ws } = await servicio.from('workspaces').select('id').in('created_by', creados);
    for (const id of creados) await servicio.auth.admin.deleteUser(id);
    for (const w of ws ?? []) await servicio.from('workspaces').delete().eq('id', w.id);
  });

  it('Ana ve todo lo suyo', async () => {
    for (const t of TABLAS) {
      const { data, error } = await ana.cliente.from(t).select('id');
      expect(error, t).toBeNull();
      expect(data?.length, t).toBeGreaterThan(0);
    }
  });

  it('Beto no ve nada de Ana en ninguna tabla', async () => {
    for (const t of TABLAS) {
      const { data } = await beto.cliente.from(t).select('id');
      expect(data ?? [], t).toEqual([]);
    }
  });

  it('Beto no puede crear nada dentro del espacio de Ana', async () => {
    const { error } = await beto.cliente.from('notes').insert({ workspace_id: ana.espacio, text: 'intruso' });
    expect(error).not.toBeNull();
  });

  it('Beto no puede cambiar ni borrar lo de Ana', async () => {
    const u = await beto.cliente.from('companies').update({ name: 'hackeada' }).eq('id', ids.empresa).select();
    expect(u.data ?? []).toEqual([]);
    const d = await beto.cliente.from('companies').delete().eq('id', ids.empresa).select();
    expect(d.data ?? []).toEqual([]);
    const { data } = await ana.cliente.from('companies').select('name').eq('id', ids.empresa).single();
    expect(data?.name).toBe('Empresa de Ana');
  });

  it('Beto no puede enlazar sus datos con los de Ana (vínculos por espacio)', async () => {
    const { error } = await beto.cliente.from('contacts').insert({ workspace_id: beto.espacio, name: 'Infiltrado', company_id: ids.empresa });
    expect(error).not.toBeNull();
    const { error: e2 } = await beto.cliente.from('tasks').insert({ workspace_id: beto.espacio, title: 'x', blocked_by: ids.tarea });
    expect(e2).not.toBeNull();
  });

  it('Beto no puede mover algo suyo al espacio de Ana', async () => {
    const id = crypto.randomUUID();
    await beto.cliente.from('notes').insert({ id, workspace_id: beto.espacio, text: 'mía' });
    const { data } = await beto.cliente.from('notes').update({ workspace_id: ana.espacio }).eq('id', id).select();
    expect(data ?? []).toEqual([]);
  });

  it('Documentos: Beto no puede leer, listar, borrar ni subir en la carpeta de Ana', async () => {
    const lee = await beto.cliente.storage.from('documentos').download(rutaAna);
    expect(lee.data).toBeNull();
    const lista = await beto.cliente.storage.from('documentos').list(ana.espacio);
    expect(lista.data ?? []).toEqual([]);
    const url = await beto.cliente.storage.from('documentos').createSignedUrl(rutaAna, 60);
    expect(url.data).toBeNull();
    await beto.cliente.storage.from('documentos').remove([rutaAna]);
    const sigue = await ana.cliente.storage.from('documentos').download(rutaAna);
    expect(await sigue.data?.text()).toBe('secreto de Ana');
    const sube = await beto.cliente.storage.from('documentos').upload(ruta(), new Blob(['x']));
    expect(sube.error).not.toBeNull();
  });

  it('Un documento no puede apuntar a la carpeta de otro espacio', async () => {
    const { error } = await beto.cliente.from('files').insert({ workspace_id: beto.espacio, name: 'x', storage_path: rutaAna });
    expect(error).not.toBeNull();
  });

  it('Borrar la empresa desvincula a sus personas (no las borra)', async () => {
    await ana.cliente.from('companies').delete().eq('id', ids.empresa);
    const { data } = await ana.cliente.from('contacts').select('company_id').eq('id', ids.contacto).single();
    expect(data).toEqual({ company_id: null });
  });

  it('Sin sesión no se ve nada', async () => {
    const anonimo = createClient(URL, PUBLICA, opciones);
    for (const t of TABLAS) expect((await anonimo.from(t).select('id')).data ?? [], t).toEqual([]);
    expect((await anonimo.storage.from('documentos').download(rutaAna)).data).toBeNull();
  });
});
