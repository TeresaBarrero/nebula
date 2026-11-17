import type { Colecciones, Contacto, Empresa, Id, TipoContacto } from '@/lib/datos/entidades';
import { totales, totalesGasto } from './facturas';
import { normalizar } from './textos';

/** CSV con «;» y marca BOM, que es lo que Excel en español abre bien a la primera. */
export function aCsv(filas: Record<string, unknown>[], columnas: [string, string][]): string {
  const celda = (v: unknown) => {
    const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join(', ') : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [columnas.map(([, t]) => celda(t)).join(';'), ...filas.map((f) => columnas.map(([k]) => celda(f[k])).join(';'))].join('\r\n') + '\r\n';
}

/** Lee un CSV (con «;» o «,», comillas incluidas) y devuelve las filas con los nombres de la cabecera. */
export function leerCsv(texto: string): Record<string, string>[] {
  const t = texto.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/)[0] ?? '';
  const sep = (primera.match(/;/g)?.length ?? 0) >= (primera.match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else celda += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) {
      fila.push(celda);
      celda = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
    } else celda += ch;
  }
  if (celda || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  const [cab, ...resto] = filas.filter((f) => f.some((x) => x.trim()));
  if (!cab) return [];
  const claves = cab.map((h) => normalizar(h).trim());
  return resto.map((f) => Object.fromEntries(claves.map((k, i) => [k, (f[i] ?? '').trim()])));
}

// ───────── Exportar ─────────

export function exportarCsv(c: Colecciones, que: 'contactos' | 'empresas' | 'facturas' | 'gastos' | 'horas'): { nombre: string; texto: string } {
  const empresa = (id: Id | null) => c.companies.find((e) => e.id === id)?.name ?? '';
  const proyecto = (id: Id | null) => c.projects.find((p) => p.id === id)?.name ?? '';
  switch (que) {
    case 'contactos':
      return {
        nombre: 'contactos.csv',
        texto: aCsv(
          c.contacts.map((x) => ({ ...x, empresa: empresa(x.companyId), permiso: x.consent ? `Sí (${x.consentVia ?? ''} ${x.consentDate ?? ''})` : 'No' })),
          [['name', 'Nombre'], ['email', 'Email'], ['phone', 'Teléfono'], ['empresa', 'Empresa'], ['role', 'Cargo'], ['nif', 'NIF'], ['type', 'Tipo'], ['status', 'Estado'], ['tags', 'Etiquetas'], ['notes', 'Notas'], ['permiso', 'Permiso RGPD']],
        ),
      };
    case 'empresas':
      return {
        nombre: 'empresas.csv',
        texto: aCsv(c.companies, [['name', 'Nombre'], ['nif', 'NIF'], ['sector', 'Sector'], ['address', 'Dirección'], ['email', 'Email'], ['phone', 'Teléfono'], ['web', 'Web'], ['notes', 'Notas']]),
      };
    case 'facturas':
      return {
        nombre: 'facturas.csv',
        texto: aCsv(
          c.invoices
            .filter((f) => f.kind === 'factura' && f.status === 'emitida')
            .sort((a, b) => a.number.localeCompare(b.number))
            .map((f) => {
              const t = totales(f, c.payments.filter((p) => p.invoiceId === f.id));
              return { numero: f.number, fecha: f.date, vence: f.due, cliente: f.client?.name ?? empresa(f.companyId), nif: f.client?.nif ?? '', concepto: f.lines.map((l) => l.desc).join(' | '), base: t.base, iva: t.iva, irpf: t.irpf, total: t.total, cobrado: t.paid };
            }),
          [['numero', 'Número'], ['fecha', 'Fecha'], ['vence', 'Vence'], ['cliente', 'Cliente'], ['nif', 'NIF cliente'], ['concepto', 'Concepto'], ['base', 'Base imponible'], ['iva', 'IVA'], ['irpf', 'Retención IRPF'], ['total', 'Total'], ['cobrado', 'Cobrado']],
        ),
      };
    case 'gastos':
      return {
        nombre: 'gastos.csv',
        texto: aCsv(
          [...c.expenses].sort((a, b) => a.date.localeCompare(b.date)).map((g) => ({ ...g, ...totalesGasto(g), proyecto: proyecto(g.projectId), deducible: g.deductible ? 'Sí' : 'No', ticket: g.receiptName ? 'Sí' : 'No' })),
          [['date', 'Fecha'], ['supplier', 'Proveedor'], ['concept', 'Concepto'], ['category', 'Categoría'], ['base', 'Base'], ['ivaPct', 'IVA %'], ['iva', 'IVA'], ['total', 'Total'], ['deducible', 'Deducible'], ['proyecto', 'Proyecto'], ['ticket', 'Ticket']],
        ),
      };
    case 'horas':
      return {
        nombre: 'horas.csv',
        texto: aCsv(
          [...c.timeEntries].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ ...e, horas: Math.round((e.minutes / 60) * 100) / 100, proyecto: proyecto(e.projectId), iguala: c.retainers.find((r) => r.id === e.retainerId)?.name ?? '', cliente: e.billable ? 'Sí' : 'No (interno)' })),
          [['date', 'Fecha'], ['horas', 'Horas'], ['proyecto', 'Proyecto'], ['iguala', 'Iguala'], ['note', 'Qué se hizo'], ['cliente', 'Para cliente']],
        ),
      };
  }
}

// ───────── Importar ─────────

const campo = (f: Record<string, string>, ...nombres: string[]) => nombres.map((n) => f[n]).find((v) => v !== undefined && v !== '') ?? '';
const TIPOS: TipoContacto[] = ['Cliente', 'Proveedor', 'Colaborador', 'Otro'];

export type Importacion = { companies: Empresa[]; contacts: Contacto[]; saltadas: number; repetidas: number };

/**
 * Contactos desde un CSV (Google, Outlook, Excel…). Reconoce columnas como Nombre, Email/Correo, Teléfono,
 * Empresa, Cargo, NIF, Etiquetas y Notas. Crea las empresas que falten y no repite emails que ya existan.
 * Los importados quedan SIN permiso RGPD apuntado (hay que registrarlo).
 */
export function importarContactos(filas: Record<string, string>[], c: Pick<Colecciones, 'contacts' | 'companies'>, nuevoId: () => Id, ahora: string): Importacion {
  const r: Importacion = { companies: [], contacts: [], saltadas: 0, repetidas: 0 };
  const emails = new Set(c.contacts.map((x) => x.email.toLowerCase()).filter(Boolean));
  const empresas = [...c.companies];
  for (const f of filas) {
    const nombre = campo(f, 'nombre', 'name', 'nombre completo', 'full name') || [campo(f, 'first name', 'nombre de pila'), campo(f, 'last name', 'apellidos')].filter(Boolean).join(' ');
    const email = campo(f, 'email', 'correo', 'correo electronico', 'e-mail', 'e-mail address', 'email address').toLowerCase();
    if (!nombre.trim()) {
      r.saltadas++;
      continue;
    }
    if (email && emails.has(email)) {
      r.repetidas++;
      continue;
    }
    const nombreEmpresa = campo(f, 'empresa', 'company', 'organizacion', 'organization name', 'compania');
    let empresa = nombreEmpresa ? empresas.find((e) => normalizar(e.name) === normalizar(nombreEmpresa)) : undefined;
    if (nombreEmpresa && !empresa) {
      empresa = { id: nuevoId(), name: nombreEmpresa.slice(0, 200), nif: '', sector: '', address: '', email: '', phone: '', web: '', notes: '', isPrivate: false, createdAt: ahora };
      empresas.push(empresa);
      r.companies.push(empresa);
    }
    const tipo = TIPOS.find((t) => normalizar(t) === normalizar(campo(f, 'tipo', 'type'))) ?? 'Cliente';
    r.contacts.push({
      id: nuevoId(), name: nombre.trim().slice(0, 160), companyId: empresa?.id ?? null, role: campo(f, 'cargo', 'puesto', 'job title', 'title').slice(0, 160), nif: campo(f, 'nif', 'dni', 'cif').slice(0, 20),
      email: email.slice(0, 200), phone: campo(f, 'telefono', 'phone', 'movil', 'phone 1 - value', 'mobile phone').slice(0, 40), type: tipo, status: 'activo',
      tags: campo(f, 'etiquetas', 'tags', 'labels').split(/[,;|]/).map((t) => t.trim()).filter(Boolean).slice(0, 20), notes: campo(f, 'notas', 'notes', 'observaciones').slice(0, 5000),
      specialty: null, rate: null, availability: tipo === 'Colaborador' ? 'disponible' : null, consent: false, consentDate: null, consentVia: null, createdAt: ahora,
    });
    if (email) emails.add(email);
  }
  return r;
}

/** Copia de seguridad completa en JSON (sin contraseñas de accesos). */
export function copiaDeSeguridad(c: Colecciones, extra: Record<string, unknown>) {
  const { accesses, ...resto } = c;
  return { app: 'nebúla', version: 1, creada: new Date().toISOString(), ...extra, datos: { ...resto, accesses: accesses.map((a) => ({ ...a, password: undefined })) } };
}
