import { describe, expect, it } from 'vitest';
import { ejemploFactura, eur, r2 } from './dinero';
import { irpfDelAsistente, irpfDelPerfil, irpfPorDefecto } from './irpf';
import { validarRegistro, type DatosRegistro } from './registro';
import { iniciales, normalizar, saludo } from './textos';

describe('Cálculo de lo que te ingresarán (SPEC §7.1)', () => {
  it('por 1.000 € con IVA 21 % y retención 15 %, te ingresarán 1.060 € (ejemplo del asistente)', () => {
    expect(ejemploFactura(1000, 21, 15)).toEqual({ base: 1000, iva: 210, irpf: 150, total: 1060 });
  });
  it('sin retención: base + IVA', () => {
    expect(ejemploFactura(1000, 21, 0).total).toBe(1210);
  });
  it('autónomo/a nuevo/a con 7 %: 1.000 € → 1.140 €', () => {
    expect(ejemploFactura(1000, 21, 7).total).toBe(1140);
  });
  it('redondea a 2 decimales en cada paso', () => {
    const e = ejemploFactura(33.335, 21, 15);
    expect(e.base).toBe(33.34);
    expect(e.iva).toBe(7);
    expect(e.irpf).toBe(5);
    expect(e.total).toBe(35.34);
  });
  it('r2 evita errores de coma flotante', () => {
    expect(r2(1.005)).toBe(1.01);
    expect(r2(0.1 + 0.2)).toBe(0.3);
  });
  it('formatea euros en español', () => {
    // Como el prototipo: formato es-ES de Intl (con 4 cifras no pone punto de millar).
    expect(eur(1060)).toMatch(/^1\.?060\s€$/);
    expect(eur(12500)).toMatch(/^12\.500\s€$/);
  });
});

describe('Retención IRPF por defecto (SPEC §7.4)', () => {
  const base = { kind: 'autonomo' as const, irpfMode: 'empresas' as const, irpf: 15 };
  it('autónomo/a que factura a empresas: la del perfil', () => {
    expect(irpfPorDefecto(base)).toBe(15);
    expect(irpfPorDefecto({ ...base, irpf: 7 })).toBe(7);
  });
  it('sociedad: 0', () => {
    expect(irpfPorDefecto({ ...base, kind: 'sociedad' })).toBe(0);
  });
  it('factura a particulares: 0', () => {
    expect(irpfPorDefecto({ ...base, irpfMode: 'particulares' })).toBe(0);
  });
  it('mixto: retención, salvo si la empresa cliente es particular', () => {
    expect(irpfPorDefecto({ ...base, irpfMode: 'mixto' })).toBe(15);
    expect(irpfPorDefecto({ ...base, irpfMode: 'mixto' }, { isPrivate: true })).toBe(0);
  });
  it('empresa cliente particular: 0', () => {
    expect(irpfPorDefecto(base, { isPrivate: true })).toBe(0);
    expect(irpfPorDefecto(base, { isPrivate: false })).toBe(15);
  });
  it('menos de 3 años como autónomo/a → 7 %; si no, 15 %', () => {
    expect(irpfDelPerfil(true)).toBe(7);
    expect(irpfDelPerfil(false)).toBe(15);
  });
  it('el asistente combina las tres respuestas', () => {
    expect(irpfDelAsistente({ kind: 'autonomo', irpfMode: 'empresas', newAutonomo: true })).toBe(7);
    expect(irpfDelAsistente({ kind: 'autonomo', irpfMode: 'empresas', newAutonomo: false })).toBe(15);
    expect(irpfDelAsistente({ kind: 'sociedad', irpfMode: 'empresas', newAutonomo: true })).toBe(0);
    expect(irpfDelAsistente({ kind: 'autonomo', irpfMode: 'particulares', newAutonomo: false })).toBe(0);
  });
});

describe('Textos', () => {
  it('saludo según la hora, como el prototipo', () => {
    expect(saludo(8)).toBe('Buenos días');
    expect(saludo(12)).toBe('Buenos días');
    expect(saludo(13)).toBe('Buenas tardes');
    expect(saludo(20)).toBe('Buenas tardes');
    expect(saludo(21)).toBe('Buenas noches');
    expect(saludo(0)).toBe('Buenos días');
  });
  it('iniciales', () => {
    expect(iniciales('María Teresa')).toBe('MT');
    expect(iniciales('Ruiz & Asociados')).toBe('RA');
    expect(iniciales('')).toBe('?');
  });
  it('normalizar quita tildes y mayúsculas', () => {
    expect(normalizar('Facturación')).toBe('facturacion');
  });
});

describe('Formulario de registro', () => {
  const ok: DatosRegistro = { fullName: 'Ana Pérez', email: 'ana@ejemplo.es', password: 'una-clave-larga', acepta: true, trampa: '', tiempo: 10000 };
  it('acepta datos correctos', () => {
    expect(validarRegistro(ok)).toEqual({});
  });
  it('rechaza programas de spam (campo trampa o envío instantáneo)', () => {
    expect(validarRegistro({ ...ok, trampa: 'http://spam' }).general).toBeTruthy();
    expect(validarRegistro({ ...ok, tiempo: 300 }).general).toBeTruthy();
  });
  it('exige aceptar la política de privacidad', () => {
    expect(validarRegistro({ ...ok, acepta: false }).acepta).toBeTruthy();
  });
  it('contraseña de al menos 8 caracteres', () => {
    expect(validarRegistro({ ...ok, password: 'corta' }).password).toBeTruthy();
  });
  it('email con buen formato', () => {
    expect(validarRegistro({ ...ok, email: 'ana@' }).email).toBeTruthy();
    expect(validarRegistro({ ...ok, email: 'ana ejemplo.es' }).email).toBeTruthy();
  });
  it('nombre obligatorio', () => {
    expect(validarRegistro({ ...ok, fullName: ' ' }).fullName).toBeTruthy();
  });
});
