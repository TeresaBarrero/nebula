import { esDisciplina } from '@/lib/catalogos/disciplinas';
import type { Ajustes, DatosAsistente, Perfil } from './tipos';

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const numero = (v: unknown, min: number, max: number, def: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : def;
};

/**
 * Valida datos del asistente que vienen de fuera (la demo, el registro).
 * Devuelve null si no son un objeto; descarta o corrige cada campo que no sea válido.
 */
export function limpiarDatosAsistente(x: unknown): DatosAsistente | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const disciplinas = Array.isArray(o.disciplines) ? [...new Set(o.disciplines.filter(esDisciplina))] : [];
  return {
    name: texto(o.name, 60),
    business: texto(o.business, 120),
    disciplines: disciplinas,
    kind: o.kind === 'sociedad' ? 'sociedad' : 'autonomo',
    newAutonomo: o.newAutonomo === true,
    irpfMode: o.irpfMode === 'particulares' || o.irpfMode === 'mixto' ? o.irpfMode : 'empresas',
    iva: [21, 10, 4, 0].includes(Number(o.iva)) ? Number(o.iva) : 21,
    nif: texto(o.nif, 20),
    iban: texto(o.iban, 40),
    rate: numero(o.rate, 0, 10000, 50),
  };
}

/** Punto de partida del asistente: lo guardado, o lo que trajo de la demo si aún no lo ha hecho. */
export function inicioAsistente(perfil: Perfil, ajustes: Ajustes, previos: DatosAsistente | null): DatosAsistente {
  const base: DatosAsistente = {
    name: perfil.name,
    business: ajustes.business,
    disciplines: [...ajustes.disciplines],
    kind: ajustes.kind,
    newAutonomo: ajustes.newAutonomo,
    irpfMode: ajustes.irpfMode,
    iva: ajustes.iva,
    nif: ajustes.nif,
    iban: ajustes.iban,
    rate: ajustes.rate,
  };
  if (!previos || ajustes.onboarded) return base;
  return {
    ...previos,
    name: previos.name || base.name,
    business: previos.business || base.business,
    nif: previos.nif || base.nif,
    iban: previos.iban || base.iban,
  };
}
