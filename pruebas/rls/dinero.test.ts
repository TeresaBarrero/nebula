/**
 * Facturas en la base de datos real (SPEC §7.3 y §13):
 * numeración correlativa sin huecos también con emisiones simultáneas, factura emitida inmutable por API
 * y cada espacio solo ve su dinero.
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
const TABLAS = ['retainers', 'renewals', 'invoices', 'payments', 'expenses'];

type Usuario = { id: string; cliente: SupabaseClient; espacio: string };

describe.skipIf(!hayClaves)('Dinero en la base de datos', () => {
  let servicio: SupabaseClient;
  let ana: Usuario;
  let beto: Usuario;
  const creados: string[] = [];
  const empresa = crypto.randomUUID();
  const lineas = [{ desc: 'Diseño de logotipo', qty: 1, price: 1000 }];

  async function usuario(nombre: string): Promise<Usuario> {
    const email = `nebula-prueba-dinero-${nombre}-${marca}@example.com`;
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
  const borrador = async (u: Usuario, o: object = {}) => {
    const id = crypto.randomUUID();
    const { error } = await u.cliente.from('invoices').insert({ id, workspace_id: u.espacio, kind: 'factura', series: 'F', company_id: empresa, lines: lineas, ...o });
    if (error) throw new Error(error.message);
    return id;
  };
  const emitir = (u: Usuario, id: string) => u.cliente.rpc('emitir_documento', { p_id: id });

  beforeAll(async () => {
    servicio = createClient(URL, SECRETA, opciones);
    [ana, beto] = await Promise.all([usuario('ana'), usuario('beto')]);
    await ana.cliente.from('workspace_settings').update({ legal_name: 'Ana Pruebas', nif: '00000000T', address: 'C/ Prueba 1', iban: 'ES00' }).eq('workspace_id', ana.espacio);
    const { error } = await ana.cliente.from('companies').insert({ id: empresa, workspace_id: ana.espacio, name: 'Cliente S.L.', nif: 'B11111111', address: 'C/ Cliente 2' });
    if (error) throw error;
  });

  afterAll(async () => {
    if (!servicio) return;
    const { data: ws } = await servicio.from('workspaces').select('id').in('created_by', creados);
    for (const id of creados) await servicio.auth.admin.deleteUser(id);
    for (const w of ws ?? []) await servicio.from('workspaces').delete().eq('id', w.id);
  });

  it('una factura nace como borrador sin número: no se puede crear ya emitida ni numerada', async () => {
    const r1 = await ana.cliente.from('invoices').insert({ workspace_id: ana.espacio, kind: 'factura', series: 'F', status: 'emitida', company_id: empresa, lines: lineas });
    expect(r1.error?.message).toMatch(/borrador/);
    const r2 = await ana.cliente.from('invoices').insert({ workspace_id: ana.espacio, kind: 'factura', series: 'F', number: 'F-2026-999', company_id: empresa, lines: lineas });
    expect(r2.error).not.toBeNull();
    const id = await borrador(ana);
    const r3 = await ana.cliente.from('invoices').update({ status: 'emitida', number: 'F-2026-500' }).eq('id', id);
    expect(r3.error?.message).toMatch(/Emitir/);
  });

  it('emitir da número, fecha de hoy y copia los datos del cliente y de quien factura', async () => {
    const id = await borrador(ana, { date: '2020-01-01' });
    const { data, error } = await emitir(ana, id);
    expect(error).toBeNull();
    const anio = new Date().getFullYear();
    expect(data.number).toMatch(new RegExp(`^F-${anio}-\\d{3}$`));
    expect(data.status).toBe('emitida');
    expect(data.date).not.toBe('2020-01-01');
    expect(data.client).toEqual({ name: 'Cliente S.L.', nif: 'B11111111', address: 'C/ Cliente 2' });
    expect(data.issuer).toMatchObject({ legalName: 'Ana Pruebas', nif: '00000000T' });
    expect((await emitir(ana, id)).error?.message).toMatch(/ya está emitida/);
  });

  it('numeración correlativa y sin huecos aunque se emitan 8 facturas a la vez', async () => {
    const ids = await Promise.all(Array.from({ length: 8 }, () => borrador(ana)));
    const res = await Promise.all(ids.map((id) => emitir(ana, id)));
    expect(res.map((r) => r.error)).toEqual(Array(8).fill(null));
    const { data } = await ana.cliente.from('invoices').select('number').eq('series', 'F').neq('number', '');
    const nums = (data ?? []).map((f) => Number(String(f.number).split('-').pop())).sort((a, b) => a - b);
    expect(nums).toEqual(nums.map((_, i) => i + 1));
    expect(new Set(nums).size).toBe(nums.length);
  });

  it('una factura emitida no se puede modificar ni borrar por la API', async () => {
    const id = await borrador(ana);
    await emitir(ana, id);
    for (const cambio of [{ lines: [] }, { notes: 'cambiada' }, { iva: 0 }, { number: 'F-2000-001' }, { status: 'borrador' }, { company_id: crypto.randomUUID() }]) {
      const { error } = await ana.cliente.from('invoices').update(cambio).eq('id', id);
      expect(error?.message, JSON.stringify(cambio)).toMatch(/no se puede modificar|Emitir/);
    }
    const d = await ana.cliente.from('invoices').delete().eq('id', id);
    expect(d.error?.message).toMatch(/no se puede borrar/);
    const { data } = await ana.cliente.from('invoices').select('id').eq('id', id);
    expect(data).toHaveLength(1);
  });

  it('la rectificativa tiene su propia serie R y referencia a la original', async () => {
    const o = await borrador(ana);
    await emitir(ana, o);
    const sinOriginal = await ana.cliente.from('invoices').insert({ workspace_id: ana.espacio, kind: 'factura', series: 'R', company_id: empresa, lines: lineas });
    expect(sinOriginal.error).not.toBeNull();
    const r = await borrador(ana, { series: 'R', rectifies_id: o, lines: [{ desc: 'Anulación', qty: -1, price: 1000 }] });
    const { data } = await emitir(ana, r);
    expect(data.number).toMatch(/^R-\d{4}-001$/);
  });

  it('solo se apuntan pagos en facturas emitidas', async () => {
    const id = await borrador(ana);
    const p1 = await ana.cliente.from('payments').insert({ workspace_id: ana.espacio, invoice_id: id, amount: 100 });
    expect(p1.error?.message).toMatch(/emitidas/);
    await emitir(ana, id);
    const p2 = await ana.cliente.from('payments').insert({ workspace_id: ana.espacio, invoice_id: id, amount: 100 });
    expect(p2.error).toBeNull();
  });

  it('borrar al cliente desvincula sus facturas emitidas, que conservan sus datos', async () => {
    const otra = crypto.randomUUID();
    await ana.cliente.from('companies').insert({ id: otra, workspace_id: ana.espacio, name: 'Se va S.L.' });
    const id = await borrador(ana, { company_id: otra });
    await emitir(ana, id);
    expect((await ana.cliente.from('companies').delete().eq('id', otra)).error).toBeNull();
    const { data } = await ana.cliente.from('invoices').select('company_id, client').eq('id', id).single();
    expect(data).toMatchObject({ company_id: null, client: { name: 'Se va S.L.' } });
  });

  it('los presupuestos se numeran en su serie P', async () => {
    const id = crypto.randomUUID();
    await ana.cliente.from('invoices').insert({ id, workspace_id: ana.espacio, kind: 'presupuesto', series: 'P', company_id: empresa, lines: lineas });
    const { data } = await emitir(ana, id);
    expect(data.number).toMatch(/^P-\d{4}-001$/);
    expect(data.status).toBe('borrador');
  });

  it('Beto no ve, ni emite, ni toca el dinero de Ana', async () => {
    await ana.cliente.from('retainers').insert({ workspace_id: ana.espacio, name: 'Iguala de Ana', company_id: empresa, fee: 100 });
    await ana.cliente.from('renewals').insert({ workspace_id: ana.espacio, name: 'ana.es', company_id: empresa, renew_date: '2027-01-01' });
    await ana.cliente.from('expenses').insert({ workspace_id: ana.espacio, supplier: 'Adobe', concept: 'CC', base: 60 });
    for (const t of TABLAS) {
      const { data } = await beto.cliente.from(t).select('id');
      expect(data, t).toEqual([]);
    }
    const id = await borrador(ana);
    expect((await emitir(beto, id)).error?.message).toMatch(/No se encuentra/);
    const meter = await beto.cliente.from('invoices').insert({ workspace_id: ana.espacio, kind: 'factura', series: 'F', lines: lineas });
    expect(meter.error).not.toBeNull();
    // Beto no puede enlazar una factura suya a la empresa de Ana.
    const cruzada = await beto.cliente.from('invoices').insert({ workspace_id: beto.espacio, kind: 'factura', series: 'F', company_id: empresa, lines: lineas });
    expect(cruzada.error).not.toBeNull();
    const contadores = await beto.cliente.from('invoice_counters').select('*');
    expect(contadores.data ?? []).toEqual([]);
  });
});
