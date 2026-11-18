import { describe, expect, it } from 'vitest';
import { avisoInteres, limpiarInteres, validarInteres, type DatosInteres } from './interesados';

const base: DatosInteres = {
  name: 'Lucía Pérez',
  email: 'Lucia@Estudio.es ',
  discipline: 'Diseño web',
  kind: 'Autónomo/a',
  comment: '  Que me avise de las facturas  ',
  acepta: true,
  trampa: '',
  tiempo: 5000,
};

describe('Me interesa', () => {
  it('acepta un formulario correcto', () => {
    expect(validarInteres(base)).toEqual({});
  });
  it('frena a los programas de spam (campo trampa o envío instantáneo)', () => {
    expect(validarInteres({ ...base, trampa: 'x' }).general).toBeTruthy();
    expect(validarInteres({ ...base, tiempo: 500 }).general).toBeTruthy();
  });
  it('pide nombre, email válido y aceptar la privacidad', () => {
    const e = validarInteres({ ...base, name: ' ', email: 'lucia@', acepta: false });
    expect(Object.keys(e).sort()).toEqual(['acepta', 'email', 'name']);
  });
  it('limpia los datos y descarta opciones inventadas', () => {
    const l = limpiarInteres({ ...base, discipline: 'Hackear', kind: 'Agencia o estudio pequeño' });
    expect(l).toEqual({ name: 'Lucía Pérez', email: 'lucia@estudio.es', discipline: '', kind: 'Agencia o estudio pequeño', comment: 'Que me avise de las facturas' });
  });
  it('el aviso por correo solo incluye lo que se ha rellenado', () => {
    const a = avisoInteres(limpiarInteres({ ...base, discipline: '', comment: '' }));
    expect(a.subject).toContain('Lucía Pérez');
    expect(a.body).toContain('lucia@estudio.es');
    expect(a.body).not.toContain('Se dedica a');
    expect(a.body).not.toContain('Lo que le gustaría');
  });
});
