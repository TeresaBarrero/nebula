import { esDisciplina } from '@/lib/catalogos/disciplinas';
import { FASES_OPORTUNIDAD, FASES_PROYECTO, PRIORIDADES } from '@/lib/catalogos/crm';
import { CATEGORIAS_GASTO, TIPOS_RENOVACION } from '@/lib/catalogos/dinero';
import { PLANTILLAS, esPlantilla } from '@/lib/catalogos/plantillas';
import { sumarDias } from '@/lib/reglas/fechas';
import type {
  Contacto,
  Disponibilidad,
  Empresa,
  EstadoContacto,
  FaseOportunidad,
  FaseProyecto,
  Gasto,
  Iguala,
  Nota,
  Oportunidad,
  Prioridad,
  Proyecto,
  Renovacion,
  Repeticion,
  Reunion,
  Tarea,
  TipoContacto,
  TipoRenovacion,
  ViaPermiso,
} from '@/lib/datos/entidades';
import type { TipoForm, Valores } from './definiciones';

type Entidad = Empresa | Contacto | Oportunidad | Proyecto | Tarea | Reunion | Nota | Iguala | Renovacion | Gasto;

const s = (v: Valores, k: string, max = 5000) => String(v[k] ?? '').trim().slice(0, max);
const n = (v: Valores, k: string, def = 0, min = 0, max = 1e9) => {
  const x = Number(String(v[k] ?? '').replace(',', '.'));
  return String(v[k] ?? '').trim() !== '' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def;
};
const nulo = (v: Valores, k: string) => s(v, k) || null;
const b = (v: Valores, k: string) => v[k] === true;

/** Valores iniciales del formulario a partir de una fila (o de los datos por defecto si es nueva). */
export function aValores(tipo: TipoForm, fila: Record<string, unknown>): Valores {
  const v: Valores = {};
  for (const [k, x] of Object.entries(fila)) {
    if (typeof x === 'boolean') v[k] = x;
    else if (Array.isArray(x)) v[k] = x.join(', ');
    else if (x === null || x === undefined) v[k] = '';
    else v[k] = String(x);
  }
  if (tipo === 'task') {
    v.urgent = fila.urgent === true;
    v.important = fila.important !== false;
  }
  return v;
}

/** Datos por defecto de algo nuevo (DEFAULTS del prototipo). */
export function porDefecto(tipo: TipoForm, hoy: string): Record<string, unknown> {
  switch (tipo) {
    case 'contact':
      return { type: 'Cliente', status: 'activo', availability: 'disponible', consent: false };
    case 'company':
      return { isPrivate: false };
    case 'deal':
      return { stage: 'nuevo', prob: 10, value: '' };
    case 'project':
      return { start: hoy, end: sumarDias(hoy, 45), status: 'briefing', priority: 'media', template: '', roundsIncluded: 2 };
    case 'task':
      return { urgent: false, important: true, estimate: 2, repeat: '' };
    case 'event':
      return { date: hoy, time: '10:00' };
    case 'note':
      return { color: 'butter', pinned: false };
    case 'retainer':
      return { active: true, billingDay: 1, start: hoy, fee: '', hours: '' };
    case 'renewal':
      return { type: 'dominio', renewDate: sumarDias(hoy, 365) };
    case 'expense':
      return { date: hoy, category: 'Otros', ivaPct: 21, deductible: true, base: '' };
  }
}

/** Valores del formulario → fila completa para guardar. `previo` es la fila que se edita (o null si es nueva). */
export function aEntidad(tipo: TipoForm, v: Valores, base: { id: string; createdAt: string; hoy: string }, previo: Record<string, unknown> | null): Entidad {
  const comun = { id: base.id, createdAt: base.createdAt };
  switch (tipo) {
    case 'company':
      return {
        ...comun,
        name: s(v, 'name', 200),
        nif: s(v, 'nif', 20),
        sector: s(v, 'sector', 120),
        address: s(v, 'address', 300),
        email: s(v, 'email', 200),
        phone: s(v, 'phone', 40),
        web: s(v, 'web', 200),
        notes: s(v, 'notes'),
        isPrivate: b(v, 'isPrivate'),
      } satisfies Empresa;
    case 'contact': {
      const colab = v.type === 'Colaborador';
      const consent = b(v, 'consent');
      return {
        ...comun,
        name: s(v, 'name', 160),
        companyId: nulo(v, 'companyId'),
        role: s(v, 'role', 160),
        nif: s(v, 'nif', 20),
        email: s(v, 'email', 200),
        phone: s(v, 'phone', 40),
        type: (s(v, 'type') || 'Cliente') as TipoContacto,
        status: (s(v, 'status') || 'activo') as EstadoContacto,
        tags: s(v, 'tags', 300).split(',').map((t) => t.trim()).filter(Boolean),
        notes: s(v, 'notes'),
        specialty: colab && esDisciplina(v.specialty) ? v.specialty : null,
        rate: colab && s(v, 'rate') ? n(v, 'rate', 0, 0, 100000) : null,
        availability: colab ? ((s(v, 'availability') || 'disponible') as Disponibilidad) : null,
        consent,
        consentDate: consent ? s(v, 'consentDate') || base.hoy : null,
        consentVia: consent ? ((nulo(v, 'consentVia') as ViaPermiso | null) ?? null) : null,
      } satisfies Contacto;
    }
    case 'deal': {
      const stage = (s(v, 'stage') || 'nuevo') as FaseOportunidad;
      const cerrada = stage === 'ganado' || stage === 'perdido';
      const antes = previo as Partial<Oportunidad> | null;
      return {
        ...comun,
        title: s(v, 'title', 200),
        discipline: esDisciplina(v.discipline) ? v.discipline : null,
        companyId: nulo(v, 'companyId'),
        contactId: nulo(v, 'contactId'),
        value: n(v, 'value', 0, 0, 1e10),
        prob: stage === 'ganado' ? 100 : stage === 'perdido' ? 0 : Math.round(n(v, 'prob', FASES_OPORTUNIDAD[stage].p, 0, 100)),
        stage,
        expected: nulo(v, 'expected'),
        source: s(v, 'source', 60),
        notes: s(v, 'notes'),
        lostReason: stage === 'perdido' ? s(v, 'lostReason', 60) : '',
        projectId: antes?.projectId ?? null,
        closedAt: cerrada ? (antes?.stage === stage && antes.closedAt ? antes.closedAt : base.hoy) : null,
      } satisfies Oportunidad;
    }
    case 'project': {
      const antes = previo as Partial<Proyecto> | null;
      const T = !antes && esPlantilla(v.template) ? PLANTILLAS[v.template] : null;
      const status = (Object.hasOwn(FASES_PROYECTO, s(v, 'status')) ? s(v, 'status') : 'briefing') as FaseProyecto;
      return {
        ...comun,
        name: s(v, 'name', 200),
        contactId: nulo(v, 'contactId'),
        discipline: esDisciplina(v.discipline) ? v.discipline : (T?.discipline ?? null),
        start: nulo(v, 'start'),
        end: nulo(v, 'end'),
        status,
        // Al pausar desde el formulario se recuerda la fase en la que estaba.
        prevStatus: status === 'pausa' ? (antes?.status && antes.status !== 'pausa' ? antes.status : (antes?.prevStatus ?? null)) : null,
        priority: (Object.hasOwn(PRIORIDADES, s(v, 'priority')) ? s(v, 'priority') : 'media') as Prioridad,
        budget: n(v, 'budget', 0, 0, 1e10),
        hoursBudget: n(v, 'hoursBudget', T?.hours ?? 0, 0, 100000),
        roundsIncluded: Math.round(n(v, 'roundsIncluded', T?.rounds ?? 2, 0, 50)),
        description: s(v, 'description'),
        tags: s(v, 'tags', 300).split(',').map((t) => t.trim()).filter(Boolean),
        collaborators: antes?.collaborators ?? [],
      } satisfies Proyecto;
    }
    case 'task': {
      const antes = previo as Partial<Tarea> | null;
      return {
        ...comun,
        title: s(v, 'title', 300),
        due: nulo(v, 'due'),
        urgent: b(v, 'urgent'),
        important: b(v, 'important'),
        done: antes?.done ?? false,
        projectId: nulo(v, 'projectId'),
        contactId: nulo(v, 'contactId'),
        assigneeId: nulo(v, 'assigneeId'),
        estimate: n(v, 'estimate', 2, 0, 1000),
        repeat: (s(v, 'repeat') || '') as Repeticion,
        blockedBy: nulo(v, 'blockedBy') === base.id ? null : nulo(v, 'blockedBy'),
        nextCreated: antes?.nextCreated ?? false,
        phase: antes?.phase ?? null,
      } satisfies Tarea;
    }
    case 'event': {
      const antes = previo as Partial<Reunion> | null;
      return {
        ...comun,
        title: s(v, 'title', 200),
        date: s(v, 'date') || base.hoy,
        time: /^\d\d:\d\d$/.test(s(v, 'time')) ? s(v, 'time') : '',
        contactId: nulo(v, 'contactId'),
        projectId: nulo(v, 'projectId'),
        source: antes?.source ?? null,
      } satisfies Reunion;
    }
    case 'retainer': {
      const antes = previo as Partial<Iguala> | null;
      return {
        ...comun,
        name: s(v, 'name', 200),
        companyId: nulo(v, 'companyId'),
        contactId: nulo(v, 'contactId'),
        discipline: esDisciplina(v.discipline) ? v.discipline : null,
        fee: n(v, 'fee', 0, 0, 1e9),
        hours: n(v, 'hours', 0, 0, 1000),
        billingDay: Math.round(n(v, 'billingDay', 1, 1, 31)),
        services: s(v, 'services'),
        active: b(v, 'active'),
        start: nulo(v, 'start'),
        lastBilled: antes?.lastBilled ?? '',
        extraBilled: antes?.extraBilled ?? '',
      } satisfies Iguala;
    }
    case 'renewal': {
      const tipo = s(v, 'type');
      return {
        ...comun,
        companyId: nulo(v, 'companyId'),
        type: (Object.hasOwn(TIPOS_RENOVACION, tipo) ? tipo : 'dominio') as TipoRenovacion,
        name: s(v, 'name', 200),
        provider: s(v, 'provider', 120),
        cost: n(v, 'cost', 0, 0, 1e9),
        price: n(v, 'price', 0, 0, 1e9),
        renewDate: s(v, 'renewDate') || base.hoy,
      } satisfies Renovacion;
    }
    case 'expense': {
      const antes = previo as Partial<Gasto> | null;
      const cat = s(v, 'category');
      const iva = n(v, 'ivaPct', 21);
      return {
        ...comun,
        date: s(v, 'date') || base.hoy,
        supplier: s(v, 'supplier', 200),
        contactId: nulo(v, 'contactId'),
        concept: s(v, 'concept', 300),
        category: (CATEGORIAS_GASTO as readonly string[]).includes(cat) ? cat : 'Otros',
        base: n(v, 'base', 0, 0, 1e9),
        ivaPct: [0, 4, 10, 21].includes(iva) ? iva : 21,
        deductible: b(v, 'deductible'),
        projectId: nulo(v, 'projectId'),
        receiptPath: antes?.receiptPath ?? '',
        receiptName: antes?.receiptName ?? '',
      } satisfies Gasto;
    }
    case 'note': {
      const antes = previo as Partial<Nota> | null;
      const color = s(v, 'color');
      return {
        ...comun,
        text: s(v, 'text', 10000),
        color: (['butter', 'peach', 'lilac', 'sage', 'sand'].includes(color) ? color : 'butter') as Nota['color'],
        pinned: b(v, 'pinned'),
        contactId: nulo(v, 'contactId'),
        projectId: nulo(v, 'projectId'),
        date: antes?.date ?? base.hoy,
      } satisfies Nota;
    }
  }
}
