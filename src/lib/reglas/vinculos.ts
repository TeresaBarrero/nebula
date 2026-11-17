import type { Colecciones, FilaDe, Id, NombreColeccion } from '@/lib/datos/entidades';

/**
 * Qué campo de cada colección apunta a qué otra colección, y qué pasa al borrar la apuntada.
 * Refleja exactamente las claves ajenas de la base de datos (supabase/migrations/…_nucleo_crm.sql):
 * «null» = se desvincula (on delete set null) · «cascada» = se borra con ella.
 */
type Vinculo = { col: NombreColeccion; campo: string; alBorrar: 'null' | 'cascada' };

const VINCULOS: Partial<Record<NombreColeccion, Vinculo[]>> = {
  companies: [
    { col: 'contacts', campo: 'companyId', alBorrar: 'null' },
    { col: 'deals', campo: 'companyId', alBorrar: 'null' },
    { col: 'files', campo: 'companyId', alBorrar: 'null' },
    { col: 'retainers', campo: 'companyId', alBorrar: 'null' },
    { col: 'renewals', campo: 'companyId', alBorrar: 'cascada' },
    { col: 'invoices', campo: 'companyId', alBorrar: 'null' },
  ],
  contacts: [
    { col: 'projects', campo: 'contactId', alBorrar: 'null' },
    { col: 'deals', campo: 'contactId', alBorrar: 'null' },
    { col: 'tasks', campo: 'contactId', alBorrar: 'null' },
    { col: 'tasks', campo: 'assigneeId', alBorrar: 'null' },
    { col: 'events', campo: 'contactId', alBorrar: 'null' },
    { col: 'notes', campo: 'contactId', alBorrar: 'null' },
    { col: 'activities', campo: 'contactId', alBorrar: 'null' },
    { col: 'files', campo: 'contactId', alBorrar: 'null' },
    { col: 'retainers', campo: 'contactId', alBorrar: 'null' },
    { col: 'invoices', campo: 'contactId', alBorrar: 'null' },
    { col: 'expenses', campo: 'contactId', alBorrar: 'null' },
  ],
  projects: [
    { col: 'deals', campo: 'projectId', alBorrar: 'null' },
    { col: 'tasks', campo: 'projectId', alBorrar: 'null' },
    { col: 'events', campo: 'projectId', alBorrar: 'null' },
    { col: 'notes', campo: 'projectId', alBorrar: 'null' },
    { col: 'activities', campo: 'projectId', alBorrar: 'null' },
    { col: 'files', campo: 'projectId', alBorrar: 'null' },
    { col: 'deliverables', campo: 'projectId', alBorrar: 'cascada' },
    { col: 'invoices', campo: 'projectId', alBorrar: 'null' },
    { col: 'expenses', campo: 'projectId', alBorrar: 'null' },
  ],
  deals: [{ col: 'invoices', campo: 'dealId', alBorrar: 'null' }],
  retainers: [{ col: 'invoices', campo: 'retainerId', alBorrar: 'null' }],
  invoices: [
    { col: 'payments', campo: 'invoiceId', alBorrar: 'cascada' },
    { col: 'invoices', campo: 'fromQuoteId', alBorrar: 'null' },
  ],
  tasks: [{ col: 'tasks', campo: 'blockedBy', alBorrar: 'null' }],
};

type Fila = { id: Id } & Record<string, unknown>;

/** Cambios que provoca borrar algo: filas que se borran y campos que se vacían. Sirve también para deshacer. */
export type EfectoBorrado = {
  borradas: { col: NombreColeccion; fila: Fila }[];
  /** `fija`: factura emitida; al deshacer no se vuelve a enlazar (no se puede modificar y ya guarda los datos del cliente). */
  desvinculadas: { col: NombreColeccion; id: Id; campo: string; antes: unknown; fija?: boolean }[];
};

function filas(c: Colecciones, col: NombreColeccion): Fila[] {
  return c[col] as unknown as Fila[];
}

/** Calcula todo lo que cambia al borrar `id` de `col` (sin modificar nada). */
export function efectoDeBorrar(c: Colecciones, col: NombreColeccion, id: Id): EfectoBorrado {
  const ef: EfectoBorrado = { borradas: [], desvinculadas: [] };
  const visitar = (col: NombreColeccion, id: Id) => {
    const fila = filas(c, col).find((f) => f.id === id);
    if (!fila || ef.borradas.some((b) => b.col === col && b.fila.id === id)) return;
    ef.borradas.push({ col, fila });
    for (const v of VINCULOS[col] ?? []) {
      for (const f of filas(c, v.col)) {
        if (f[v.campo] !== id) continue;
        if (v.alBorrar === 'cascada') visitar(v.col, f.id);
        else ef.desvinculadas.push({ col: v.col, id: f.id, campo: v.campo, antes: id, ...(v.col === 'invoices' && f.kind === 'factura' && f.status === 'emitida' ? { fija: true } : {}) });
      }
    }
    // Un contacto borrado sale del equipo de los proyectos.
    if (col === 'contacts')
      for (const p of c.projects)
        if (p.collaborators.includes(id)) ef.desvinculadas.push({ col: 'projects', id: p.id, campo: 'collaborators', antes: [...p.collaborators] });
  };
  visitar(col, id);
  // Lo que se borra entero no hace falta desvincularlo.
  ef.desvinculadas = ef.desvinculadas.filter((d) => !ef.borradas.some((b) => b.col === d.col && b.fila.id === d.id));
  return ef;
}

/** Aplica un borrado a las colecciones y devuelve las nuevas. */
export function aplicarBorrado(c: Colecciones, ef: EfectoBorrado): Colecciones {
  const n: Colecciones = { ...c };
  const tocadas = new Set<NombreColeccion>([...ef.borradas.map((b) => b.col), ...ef.desvinculadas.map((d) => d.col)]);
  for (const col of tocadas) {
    const fuera = new Set(ef.borradas.filter((b) => b.col === col).map((b) => b.fila.id));
    const cambios = ef.desvinculadas.filter((d) => d.col === col);
    (n[col] as unknown as Fila[]) = filas(c, col)
      .filter((f) => !fuera.has(f.id))
      .map((f) => {
        const mios = cambios.filter((d) => d.id === f.id);
        if (!mios.length) return f;
        const g = { ...f };
        for (const d of mios) {
          if (d.campo === 'collaborators') {
            const borrado = ef.borradas.find((b) => b.col === 'contacts')?.fila.id;
            g.collaborators = (g.collaborators as Id[]).filter((x) => x !== borrado);
          } else g[d.campo] = null;
        }
        return g;
      });
  }
  return n;
}

/** Deshace un borrado: vuelve a poner las filas y los vínculos. */
export function deshacerBorrado(c: Colecciones, ef: EfectoBorrado): Colecciones {
  const n: Colecciones = { ...c };
  const tocadas = new Set<NombreColeccion>([...ef.borradas.map((b) => b.col), ...ef.desvinculadas.map((d) => d.col)]);
  for (const col of tocadas) {
    const vueltas = ef.borradas.filter((b) => b.col === col).map((b) => b.fila);
    const cambios = ef.desvinculadas.filter((d) => d.col === col && !d.fija);
    (n[col] as unknown as Fila[]) = [
      ...filas(c, col).map((f) => {
        const mios = cambios.filter((d) => d.id === f.id);
        if (!mios.length) return f;
        const g = { ...f };
        for (const d of mios) g[d.campo] = d.antes;
        return g;
      }),
      ...vueltas,
    ];
  }
  return n;
}

/** Inserta o sustituye una fila. */
export function ponerFila<K extends NombreColeccion>(c: Colecciones, col: K, fila: FilaDe<K>): Colecciones {
  const lista = c[col] as unknown as Fila[];
  const f = fila as unknown as Fila;
  const existe = lista.some((x) => x.id === f.id);
  return { ...c, [col]: existe ? lista.map((x) => (x.id === f.id ? f : x)) : [...lista, f] };
}

/** Cambia campos de una fila. */
export function cambiarFila<K extends NombreColeccion>(c: Colecciones, col: K, id: Id, cambios: Partial<FilaDe<K>>): Colecciones {
  const lista = c[col] as unknown as Fila[];
  return { ...c, [col]: lista.map((x) => (x.id === id ? { ...x, ...(cambios as object) } : x)) };
}
