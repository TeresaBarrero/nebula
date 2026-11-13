import { describe, expect, it } from 'vitest';
import { NAV, SECCIONES } from '@/lib/catalogos/nav';
import { ICONOS } from '@/lib/catalogos/iconos';
import {
  CLAVE_DEMO,
  borrarDemo,
  crearAlmacenDemo,
  datosAsistenteDeDemo,
  estadoDemoInicial,
  leerDemo,
  marcarAsistenteDemo,
  type Guardado,
} from './almacen-demo';
import { ajustesDesdeFila, filaDesdeAjustes } from './almacen-nube';
import { inicioAsistente, limpiarDatosAsistente } from './asistente';
import { AJUSTES_POR_DEFECTO } from './tipos';

function memoria(): Guardado & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

describe('Modo demostración (navegador)', () => {
  it('empieza con los datos de ejemplo del prototipo y sin haber hecho el asistente', async () => {
    const d = await crearAlmacenDemo(memoria()).cargar();
    expect(d.perfil.name).toBe('Teresa');
    expect(d.ajustes.business).toBe('Estudio creativo');
    expect(d.ajustes.onboarded).toBe(false);
    expect(d.esAdmin).toBe(false);
  });
  it('guarda los cambios y los recuerda', async () => {
    const m = memoria();
    const a = crearAlmacenDemo(m);
    await a.guardarPerfil({ name: 'Lucía' });
    await a.guardarAjustes({ capacity: 25, onboarded: true });
    const d = await crearAlmacenDemo(m).cargar();
    expect(d.perfil.name).toBe('Lucía');
    expect(d.ajustes.capacity).toBe(25);
    expect(d.ajustes.onboarded).toBe(true);
  });
  it('si los datos guardados están dañados, vuelve a empezar', () => {
    const m = memoria();
    m.setItem(CLAVE_DEMO, '{roto');
    expect(leerDemo(m)).toEqual(estadoDemoInicial());
  });
  it('«Empezar de cero» borra todo', async () => {
    const m = memoria();
    await crearAlmacenDemo(m).guardarPerfil({ name: 'Lucía' });
    borrarDemo(m);
    expect(leerDemo(m).perfil.name).toBe('Teresa');
  });
  it('al registrarse solo se llevan las respuestas del asistente si lo ha completado', async () => {
    const m = memoria();
    const a = crearAlmacenDemo(m);
    expect(datosAsistenteDeDemo(m)).toBeNull();
    await a.guardarPerfil({ name: 'Lucía' });
    await a.guardarAjustes({ business: 'Estudio Lu', disciplines: ['web'], kind: 'sociedad' });
    marcarAsistenteDemo(m);
    const d = datosAsistenteDeDemo(m);
    expect(d).toMatchObject({ name: 'Lucía', business: 'Estudio Lu', disciplines: ['web'], kind: 'sociedad' });
  });
});

describe('Datos del asistente que llegan de fuera', () => {
  it('descarta lo que no es válido', () => {
    const d = limpiarDatosAsistente({
      name: '  Ana  ',
      disciplines: ['web', 'inventada', 'web', 3],
      kind: 'cooperativa',
      irpfMode: 'mixto',
      iva: 17,
      rate: -5,
      newAutonomo: 'sí',
      nif: 'x'.repeat(50),
    });
    expect(d).toMatchObject({ name: 'Ana', disciplines: ['web'], kind: 'autonomo', irpfMode: 'mixto', iva: 21, rate: 50, newAutonomo: false });
    expect(d?.nif.length).toBe(20);
  });
  it('null si no es un objeto', () => {
    expect(limpiarDatosAsistente(null)).toBeNull();
    expect(limpiarDatosAsistente('hola')).toBeNull();
    expect(limpiarDatosAsistente([1])).toBeNull();
  });
  it('el asistente parte de lo traído de la demo solo si aún no se ha hecho', () => {
    const perfil = estadoDemoInicial().perfil;
    const previos = limpiarDatosAsistente({ name: 'Lucía', business: 'Estudio Lu', disciplines: ['web'] });
    expect(inicioAsistente(perfil, { ...AJUSTES_POR_DEFECTO }, previos).name).toBe('Lucía');
    expect(inicioAsistente(perfil, { ...AJUSTES_POR_DEFECTO, onboarded: true }, previos).name).toBe('Teresa');
  });
});

describe('Traducción app ↔ base de datos', () => {
  it('ida y vuelta sin perder nada', () => {
    const a = { ...AJUSTES_POR_DEFECTO, business: 'X', newAutonomo: true, irpf: 7, disciplines: ['web' as const], payOnline: { card: true, bizum: false } };
    const fila = {
      ...filaDesdeAjustes(a),
      id: '1',
      workspace_id: 'w',
      created_at: '',
      updated_at: '',
    } as Parameters<typeof ajustesDesdeFila>[0];
    expect(ajustesDesdeFila(fila)).toEqual(a);
  });
  it('solo envía los campos que cambian', () => {
    expect(filaDesdeAjustes({ capacity: 20 })).toEqual({ capacity: 20 });
  });
});

describe('Navegación (SPEC §3)', () => {
  it('tiene las 18 secciones con id único', () => {
    expect(SECCIONES).toHaveLength(18);
    expect(new Set(SECCIONES.map((s) => s.id)).size).toBe(18);
  });
  it('grupos Trabajo, Dinero y Red en orden', () => {
    expect(NAV.filter((n) => 'group' in n).map((n) => ('group' in n ? n.group : ''))).toEqual(['Trabajo', 'Dinero', 'Red']);
  });
  it('todos los iconos existen', () => {
    for (const s of SECCIONES) expect(ICONOS[s.icon]).toBeTruthy();
  });
});
