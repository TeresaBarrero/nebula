import type { Contacto, Fecha, Id, Proyecto } from '@/lib/datos/entidades';
import { aFecha, sumarDias } from './fechas';
import { enMarcha } from './proyectos';
import { normalizar } from './textos';

export type TareaRapida = { title: string; due: Fecha | null; urgent: boolean; important: boolean; contactId: Id | null; projectId: Id | null };

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
// Letras con o sin tilde, para quitar la palabra del título tal y como se escribió.
const flexible = (palabra: string) =>
  palabra.replace(/[aeiou]/g, (v) => `[${v}${'áéíóú'['aeiou'.indexOf(v)]}]`).replace(/n/g, '[nñ]');

/**
 * Tarea rápida en lenguaje natural (SPEC §7.10, parseQuick del prototipo).
 * Reconoce hoy · mañana · pasado mañana · días de la semana (la próxima vez que llegue) ·
 * «urgente» o «!» · «importante» · @contacto (y su proyecto en marcha) · #proyecto.
 * Sin prioridad explícita → importante.
 */
export function leerTareaRapida(texto: string, hoy: Fecha, contactos: Contacto[], proyectos: Proyecto[]): TareaRapida {
  let t = ` ${texto} `;
  const r: TareaRapida = { title: '', due: null, urgent: false, important: false, contactId: null, projectId: null };
  const n = normalizar(t);
  const quitar = (palabras: string) => {
    t = t.replace(new RegExp(`\\s${flexible(palabras).replace(/ /g, '\\s+')}(?=\\s)`, 'i'), ' ');
  };

  if (/\spasado\s+manana\s/.test(n)) {
    r.due = sumarDias(hoy, 2);
    quitar('pasado manana');
  } else if (/\smanana\s/.test(n)) {
    r.due = sumarDias(hoy, 1);
    quitar('manana');
  } else if (/\shoy\s/.test(n)) {
    r.due = hoy;
    quitar('hoy');
  } else {
    const m = n.match(/\s(el\s)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s/);
    if (m) {
      let dif = (DIAS.indexOf(m[2]) - aFecha(hoy).getDay() + 7) % 7;
      if (dif === 0) dif = 7;
      r.due = sumarDias(hoy, dif);
      quitar(`${m[1] ? 'el ' : ''}${m[2]}`);
    }
  }
  if (/\surgente\s/.test(n) || t.includes('!')) {
    r.urgent = true;
    quitar('urgente');
    t = t.replace(/!/g, '');
  }
  if (/\simportante\s/.test(n)) {
    r.important = true;
    quitar('importante');
  }

  const cm = t.match(/@([\p{L}\p{N}_-]+)/u);
  if (cm) {
    const buscado = normalizar(cm[1]);
    const c = contactos.find((x) => normalizar(x.name).split(/\s+/).some((p) => p.startsWith(buscado))) ?? contactos.find((x) => normalizar(x.name).includes(buscado));
    if (c) {
      r.contactId = c.id;
      t = t.replace(cm[0], c.name.split(' ')[0]);
    }
  }
  const pm = t.match(/#([\p{L}\p{N}_-]+)/u);
  if (pm) {
    const p = proyectos.find((x) => normalizar(x.name).includes(normalizar(pm[1])));
    if (p) {
      r.projectId = p.id;
      t = t.replace(pm[0], '');
    }
  }
  if (r.contactId && !r.projectId) r.projectId = proyectos.find((p) => p.contactId === r.contactId && enMarcha(p))?.id ?? null;
  if (!r.urgent && !r.important) r.important = true;

  const titulo = t.replace(/\s+/g, ' ').trim();
  r.title = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  return r;
}
