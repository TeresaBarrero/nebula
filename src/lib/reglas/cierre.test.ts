import { describe, expect, it } from 'vitest';
import { crearAlmacenDemo, type Guardado } from '@/lib/datos/almacen-demo';
import { semillaDemo } from '@/lib/datos/semilla';
import { aCsv, copiaDeSeguridad, exportarCsv, importarContactos, leerCsv } from './csv';
import { borrarDatosContacto, exportarContacto, quedaAlgoDe } from './rgpd';

const HOY = '2026-11-20';
const datos = () => semillaDemo(HOY);

describe('Protección de datos (SPEC §7.12 y §13)', () => {
  it('«Darle sus datos» reúne todo lo de la persona y nada de otras', () => {
    const d = exportarContacto(datos(), 'c1', HOY)!;
    expect(d.persona).toMatchObject({ nombre: 'Lucía Fernández', email: 'lucia@estudioalba.es', empresa: 'Estudio Alba S.L.', permiso: { via: 'Contrato' } });
    expect(d.historial.length).toBeGreaterThan(0);
    expect(d.facturas.length).toBeGreaterThan(0);
    expect(JSON.stringify(d)).not.toContain('Marcos Ruiz');
    expect(exportarContacto(datos(), 'no-existe', HOY)).toBeNull();
  });
  it('«Borrar sus datos»: no queda nada personal salvo las facturas (sin vínculo) y los contratos firmados', () => {
    const c = datos();
    const x = c.contacts.find((p) => p.id === 'c1')!;
    const facturasAntes = c.invoices.filter((f) => f.contactId === 'c1').map((f) => f.id);
    const r = borrarDatosContacto(c, 'c1', HOY, { id: 'rg', ahora: `${HOY}T10:00:00Z` });
    expect(quedaAlgoDe(r.c, 'c1', x.name, x.email)).toEqual([]);
    // Las facturas siguen ahí (obligación legal), sin vínculo con la persona.
    for (const id of facturasAntes) expect(r.c.invoices.find((f) => f.id === id)?.contactId).toBeNull();
    expect(r.c.invoices).toHaveLength(c.invoices.length);
    // Tareas y oportunidades se quedan, desvinculadas.
    expect(r.c.tasks).toHaveLength(c.tasks.length);
    expect(r.c.deals.find((d) => d.id === 'd5')?.contactId).toBeNull();
    // Registro sin datos personales.
    const reg = r.c.rgpdLog.at(-1)!;
    expect(reg.action).toBe('Borrado de datos');
    expect(JSON.stringify(reg)).not.toContain('Lucía');
  });
  it('en la demo el borrado es igual y devuelve los archivos a borrar', async () => {
    const mapa = new Map<string, string>();
    const store: Guardado = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => void mapa.set(k, v), removeItem: (k) => void mapa.delete(k) };
    const a = crearAlmacenDemo(store);
    await a.cargarColecciones();
    await a.actualizar('files', 'fl2', { storagePath: 'demo/fl2' });
    expect(await a.borrarDatosContacto('c1')).toEqual(['demo/fl2']);
    const c = await a.cargarColecciones();
    expect(c.contacts.some((p) => p.id === 'c1')).toBe(false);
    expect(quedaAlgoDe(c, 'c1', 'Lucía Fernández', 'lucia@estudioalba.es')).toEqual([]);
  });
});

describe('CSV para Excel', () => {
  it('separador «;», comillas cuando hace falta, decimales con coma y marca BOM', () => {
    const t = aCsv([{ a: 'Hola; adiós', b: 12.5, c: 'Dice "sí"', d: ['x', 'y'] }], [['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'D']]);
    expect(t).toBe('﻿A;B;C;D\r\n"Hola; adiós";12,5;"Dice ""sí""";x, y\r\n');
  });
  it('lee CSV con «;» o «,», comillas y saltos de línea dentro', () => {
    expect(leerCsv('﻿Nombre;Email\r\nAna;ana@x.es\r\n"Pérez; Luis";"l@x.es"\r\n')).toEqual([
      { nombre: 'Ana', email: 'ana@x.es' },
      { nombre: 'Pérez; Luis', email: 'l@x.es' },
    ]);
    expect(leerCsv('Name,E-mail Address,Notes\nBea,b@x.es,"línea 1\nlínea 2"\n')).toEqual([{ name: 'Bea', 'e-mail address': 'b@x.es', notes: 'línea 1\nlínea 2' }]);
    expect(leerCsv('')).toEqual([]);
  });
  it('lo exportado se puede volver a leer', () => {
    const filas = leerCsv(exportarCsv(datos(), 'contactos').texto);
    expect(filas).toHaveLength(datos().contacts.length);
    expect(filas.find((f) => f.nombre === 'Lucía Fernández')).toMatchObject({ email: 'lucia@estudioalba.es', empresa: 'Estudio Alba S.L.' });
    const fact = leerCsv(exportarCsv(datos(), 'facturas').texto);
    expect(fact.every((f) => /^F-\d{4}-\d{3}$/.test(f.numero))).toBe(true);
  });
  it('importa contactos de Google/Outlook/Excel, crea empresas y no repite emails', () => {
    const c = datos();
    let n = 0;
    const filas = leerCsv('First Name,Last Name,E-mail Address,Company,Mobile Phone\nNuria,Gómez,nuria@nueva.es,Estudio Alba S.L.,600\nLucía,Fernández,LUCIA@estudioalba.es,,\n,,solo@x.es,,\nPep,,pep@x.es,Pep Studio,\n');
    const r = importarContactos(filas, c, () => `n${++n}`, `${HOY}T10:00:00Z`);
    expect(r.contacts.map((x) => x.name)).toEqual(['Nuria Gómez', 'Pep']);
    expect(r.contacts[0]).toMatchObject({ companyId: 'co1', email: 'nuria@nueva.es', phone: '600', consent: false });
    expect(r.companies.map((e) => e.name)).toEqual(['Pep Studio']);
    expect(r.repetidas).toBe(1);
    expect(r.saltadas).toBe(1);
  });
  it('la copia de seguridad lleva todo menos las contraseñas de los accesos', () => {
    const c = datos();
    const copia = copiaDeSeguridad(c, {});
    expect(copia.datos.contacts).toHaveLength(c.contacts.length);
    expect(JSON.stringify(copia)).not.toContain('demo-Alba-2026');
  });
});
