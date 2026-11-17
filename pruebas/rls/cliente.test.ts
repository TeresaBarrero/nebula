/**
 * Fase 4 contra la base de datos real: el portal de un cliente no ve datos de otro (SPEC §13),
 * la firma funciona desde el servidor con su rastro, nadie firma desde la app, y los enlaces solo guardan su huella.
 * Ejecutar con: npm run test:rls
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { accionPortal } from '@/lib/portal';
import { datosPortal, hoyMadrid } from '@/lib/reglas/cliente';
import { cargarEspacio, contextoServidor, crearEnlacePortal, ejecutorServidor, huellaHex, leerEnlace } from '@/lib/servidor/espacio';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const SECRETA = process.env.SUPABASE_SECRET_KEY ?? '';
const hayClaves = Boolean(URL && PUBLICA && SECRETA);
const opciones = { auth: { persistSession: false, autoRefreshToken: false } };
const marca = Math.random().toString(36).slice(2, 8);

describe.skipIf(!hayClaves)('Portal del cliente en la base de datos', () => {
  let servicio: SupabaseClient;
  let ana: { id: string; cliente: SupabaseClient; espacio: string };
  const creados: string[] = [];
  const A = { empresa: crypto.randomUUID(), persona: crypto.randomUUID(), proyecto: crypto.randomUUID(), contrato: crypto.randomUUID() };
  const B = { empresa: crypto.randomUUID(), persona: crypto.randomUUID(), proyecto: crypto.randomUUID(), contrato: crypto.randomUUID() };
  let enlaceA = '';
  let enlaceB = '';

  beforeAll(async () => {
    servicio = createClient(URL, SECRETA, opciones);
    const email = `nebula-prueba-portal-${marca}@example.com`;
    const password = `Prueba-${marca}-segura-123`;
    const { data } = await servicio.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Ana' } });
    creados.push(data.user!.id);
    await servicio.rpc('admin_set_status', { target: data.user!.id, new_status: 'aprobado' });
    const cliente = createClient(URL, PUBLICA, opciones);
    await cliente.auth.signInWithPassword({ email, password });
    const { data: m } = await servicio.from('workspace_members').select('workspace_id').eq('user_id', data.user!.id).single();
    ana = { id: data.user!.id, cliente, espacio: m!.workspace_id };
    const w = ana.espacio;
    await cliente.from('workspace_settings').update({ legal_name: 'Ana Estudio', nif: '00000000T', onboarded: true }).eq('workspace_id', w);
    for (const [X, nombre] of [[A, 'Cliente A S.L.'], [B, 'Cliente B S.L.']] as const) {
      const r1 = await cliente.from('companies').insert({ id: X.empresa, workspace_id: w, name: nombre });
      const r2 = await cliente.from('contacts').insert({ id: X.persona, workspace_id: w, name: `Persona de ${nombre}`, company_id: X.empresa, email: `${X.persona}@example.com` });
      const r3 = await cliente.from('projects').insert({ id: X.proyecto, workspace_id: w, name: `Proyecto ${nombre}`, contact_id: X.persona, budget: 1000 });
      const r4 = await cliente.from('contracts').insert({ id: X.contrato, workspace_id: w, title: `Contrato ${nombre}`, project_id: X.proyecto, company_id: X.empresa, contact_id: X.persona, deposit: 30, status: 'enviado', sent_at: hoyMadrid() });
      for (const r of [r1, r2, r3, r4]) if (r.error) throw r.error;
    }
    enlaceA = (await crearEnlacePortal(servicio, w, A.empresa, A.persona, 'https://x'))!.split('/portal/')[1];
    enlaceB = (await crearEnlacePortal(servicio, w, B.empresa, B.persona, 'https://x'))!.split('/portal/')[1];
  });

  afterAll(async () => {
    if (!servicio) return;
    const { data: ws } = await servicio.from('workspaces').select('id').in('created_by', creados);
    for (const id of creados) await servicio.auth.admin.deleteUser(id);
    for (const w of ws ?? []) await servicio.from('workspaces').delete().eq('id', w.id);
  });

  it('el enlace se guarda solo como huella y abre únicamente su empresa', async () => {
    const { data } = await servicio.from('portal_tokens').select('token_hash').eq('company_id', A.empresa);
    expect(data?.[0].token_hash).toBe(huellaHex(enlaceA));
    expect(JSON.stringify(data)).not.toContain(enlaceA);
    expect(await leerEnlace(servicio, enlaceA)).toMatchObject({ ws: ana.espacio, companyId: A.empresa });
    expect(await leerEnlace(servicio, 'inventado-' + 'x'.repeat(40))).toBeNull();
  });

  it('el portal de A no contiene nada de B', async () => {
    const e = (await leerEnlace(servicio, enlaceA))!;
    const { c, ajustes } = await cargarEspacio(servicio, e.ws);
    const d = datosPortal(c, e.companyId, ajustes, hoyMadrid())!;
    const todo = JSON.stringify(d);
    expect(todo).toContain('Cliente A S.L.');
    expect(todo).not.toContain('Cliente B S.L.');
    expect(todo).not.toContain(B.contrato);
    expect(d.contratos.map((k) => k.id)).toEqual([A.contrato]);
  });

  it('con el enlace de B no se puede firmar el contrato de A', async () => {
    const e = (await leerEnlace(servicio, enlaceB))!;
    const { c, ajustes } = await cargarEspacio(servicio, e.ws);
    const r = await accionPortal({ tipo: 'firmar', id: A.contrato, nombre: 'Intruso', acepta: true }, e.companyId, contextoServidor(servicio, e.ws, c, ajustes, 'https://x'), ejecutorServidor(servicio, e.ws, c), { ip: '9.9.9.9', navegador: 'x' });
    expect(r.ok).toBe(false);
    const { data } = await servicio.from('contracts').select('status').eq('id', A.contrato).single();
    expect(data?.status).toBe('enviado');
  });

  it('desde la app nadie puede marcar un contrato como firmado', async () => {
    const r = await ana.cliente.from('contracts').update({ status: 'firmado', signed_by: 'Yo misma' }).eq('id', A.contrato);
    expect(r.error?.message).toMatch(/Solo el cliente/);
    const n = await ana.cliente.from('contracts').insert({ workspace_id: ana.espacio, title: 'Falso', status: 'firmado' });
    expect(n.error?.message).toMatch(/Solo el cliente/);
  });

  it('firmar desde el portal guarda el rastro, emite el anticipo y el contrato firmado ya no se cambia', async () => {
    const e = (await leerEnlace(servicio, enlaceA))!;
    const { c, ajustes } = await cargarEspacio(servicio, e.ws);
    const r = await accionPortal({ tipo: 'firmar', id: A.contrato, nombre: 'Persona de A', acepta: true }, e.companyId, contextoServidor(servicio, e.ws, c, ajustes, 'https://x'), ejecutorServidor(servicio, e.ws, c), { ip: '1.2.3.4', navegador: 'Prueba' });
    expect(r.ok).toBe(true);
    const { data: k } = await servicio.from('contracts').select('*').eq('id', A.contrato).single();
    expect(k).toMatchObject({ status: 'firmado', signed_by: 'Persona de A', signed_ip: '1.2.3.4' });
    expect(k!.document_hash).toMatch(/^[0-9a-f]{64}$/);
    const { data: f } = await servicio.from('invoices').select('number, status, lines').eq('id', k!.deposit_invoice_id).single();
    expect(f).toMatchObject({ status: 'emitida' });
    expect(f!.number).toMatch(/^F-\d{4}-\d{3}$/);
    const cambio = await ana.cliente.from('contracts').update({ extra: 'cambiado' }).eq('id', A.contrato);
    expect(cambio.error?.message).toMatch(/no se puede modificar/);
    const borrar = await ana.cliente.from('contracts').delete().eq('id', A.contrato);
    expect(borrar.error?.message).toMatch(/no se puede borrar/);
  });

  it('la app no puede escribir correos ni enlaces a mano; las ejecuciones no se repiten', async () => {
    expect((await ana.cliente.from('outgoing_emails').insert({ workspace_id: ana.espacio, to: 'x@x.es', subject: 'x' })).error).not.toBeNull();
    expect((await ana.cliente.from('portal_tokens').insert({ workspace_id: ana.espacio, company_id: A.empresa, token_hash: 'a'.repeat(64), expires_at: new Date().toISOString() })).error).not.toBeNull();
    expect((await ana.cliente.from('automation_runs').insert({ workspace_id: ana.espacio, key: 'won', ref: 'x' })).error).toBeNull();
    expect((await ana.cliente.from('automation_runs').insert({ workspace_id: ana.espacio, key: 'won', ref: 'x' })).error).not.toBeNull();
  });
});
