import { CUADRANTES, ESTADOS_ENTREGABLE, FASES_OPORTUNIDAD, FASES_PROYECTO, colorAvatar, type Pastel } from '@/lib/catalogos/crm';
import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import { ESTADOS_FACTURA, TIPOS_RENOVACION } from '@/lib/catalogos/dinero';
import { CANALES } from '@/lib/catalogos/trabajo';
import { eur } from './dinero';
import { estadoDe, totales } from './facturas';
import type { NombreIcono } from '@/lib/catalogos/iconos';
import type { Colecciones, Fecha } from '@/lib/datos/entidades';
import type { Destino } from './avisos';
import { relativa } from './fechas';
import { empresaDe } from './historial';
import { cuadranteDe } from './tareas';
import { normalizar } from './textos';

export type Resultado = { clave: string; label: string; icono: NombreIcono; cls: Pastel; pista: string; destino: Destino };
export type Grupo = { titulo: string; items: Resultado[] };

/**
 * Buscador ⌘K (SPEC §6.19): contactos, empresas, proyectos, oportunidades, tareas, entregables, facturas,
 * igualas, renovaciones, gastos, contenidos, documentos y notas. Contratos y portales se añaden en la Fase 4.
 */
export function buscar(c: Colecciones, texto: string, hoy: Fecha): Grupo[] {
  const q = normalizar(texto.trim());
  if (!q) return [];
  const m = (...partes: (string | null | undefined)[]) => normalizar(partes.join(' ')).includes(q);
  const proyecto = (id: string | null) => c.projects.find((p) => p.id === id);

  const grupos: Grupo[] = [
    {
      titulo: 'Contactos',
      items: c.contacts
        .filter((x) => m(x.name, empresaDe(c, x), x.email, x.tags.join(' '), x.role, x.phone))
        .map((x) => ({ clave: 'c' + x.id, label: x.name, icono: 'user', cls: colorAvatar(x.id), pista: empresaDe(c, x) || x.type, destino: { ruta: `/contactos?id=${x.id}` } })),
    },
    {
      titulo: 'Empresas',
      items: c.companies
        .filter((x) => m(x.name, x.nif, x.sector))
        .map((x) => ({ clave: 'e' + x.id, label: x.name, icono: 'building', cls: colorAvatar(x.id), pista: x.sector, destino: { ruta: `/empresas?id=${x.id}` } })),
    },
    {
      titulo: 'Proyectos',
      items: c.projects
        .filter((p) => m(p.name, p.tags.join(' '), p.discipline ? DISCIPLINAS[p.discipline]?.label : ''))
        .map((p) => ({ clave: 'p' + p.id, label: p.name, icono: 'folder', cls: FASES_PROYECTO[p.status].cls, pista: FASES_PROYECTO[p.status].label, destino: { ruta: `/proyectos?p=${p.id}` } })),
    },
    {
      titulo: 'Oportunidades',
      items: c.deals
        .filter((d) => m(d.title))
        .map((d) => ({ clave: 'd' + d.id, label: d.title, icono: 'funnel', cls: FASES_OPORTUNIDAD[d.stage].cls, pista: FASES_OPORTUNIDAD[d.stage].label, destino: { formulario: 'deal', id: d.id } })),
    },
    {
      titulo: 'Tareas',
      items: c.tasks
        .filter((t) => m(t.title))
        .slice(0, 6)
        .map((t) => ({ clave: 't' + t.id, label: t.title, icono: 'check', cls: CUADRANTES[cuadranteDe(t)].cls, pista: t.done ? 'Hecha' : relativa(t.due, hoy) || 'Sin fecha', destino: { formulario: 'task', id: t.id } })),
    },
    {
      titulo: 'Entregables',
      items: c.deliverables
        .filter((v) => m(v.name))
        .slice(0, 5)
        .map((v) => ({ clave: 'v' + v.id, label: v.name, icono: 'layers', cls: ESTADOS_ENTREGABLE[v.status].cls, pista: proyecto(v.projectId)?.name ?? '', destino: { ruta: `/proyectos?p=${v.projectId}` } })),
    },
    {
      titulo: 'Contenidos',
      items: c.posts
        .filter((x) => m(x.title, x.copy))
        .slice(0, 5)
        .map((x) => ({ clave: 'po' + x.id, label: x.title, icono: 'megaphone', cls: CANALES[x.channel].cls, pista: `${CANALES[x.channel].label} · ${relativa(x.date, hoy)}`, destino: { formulario: 'post', id: x.id } })),
    },
    {
      titulo: 'Facturas',
      items: c.invoices
        .filter((f) => m(f.number || 'borrador', f.lines.map((l) => l.desc).join(' '), f.client?.name ?? c.companies.find((e) => e.id === f.companyId)?.name))
        .slice(0, 6)
        .map((f) => {
          const st = ESTADOS_FACTURA[estadoDe(c, f, hoy)];
          return { clave: 'i' + f.id, label: `${f.number || 'Borrador'} · ${f.lines[0]?.desc ?? ''}`, icono: 'receipt', cls: st.cls, pista: `${f.kind === 'presupuesto' ? 'Presupuesto' : st.label} · ${eur(totales(f).total)}`, destino: { ruta: `/facturas?${f.kind === 'presupuesto' ? 'tipo=presupuesto&' : ''}id=${f.id}` } };
        }),
    },
    {
      titulo: 'Igualas y renovaciones',
      items: [
        ...c.retainers
          .filter((r) => m(r.name, c.companies.find((e) => e.id === r.companyId)?.name))
          .map((r) => ({ clave: 'r' + r.id, label: r.name, icono: 'repeat' as const, cls: 'lilac' as Pastel, pista: `${eur(r.fee)}/mes`, destino: { formulario: 'retainer' as const, id: r.id } })),
        ...c.renewals
          .filter((n) => m(n.name, n.provider))
          .map((n) => ({ clave: 'n' + n.id, label: n.name, icono: 'globe' as const, cls: TIPOS_RENOVACION[n.type].cls, pista: relativa(n.renewDate, hoy), destino: { formulario: 'renewal' as const, id: n.id } })),
      ],
    },
    {
      titulo: 'Gastos',
      items: c.expenses
        .filter((g) => m(g.supplier, g.concept))
        .slice(0, 5)
        .map((g) => ({ clave: 'x' + g.id, label: `${g.supplier} · ${g.concept}`, icono: 'wallet', cls: 'peach', pista: eur(g.base), destino: { formulario: 'expense', id: g.id } })),
    },
    {
      titulo: 'Documentos',
      items: c.files
        .filter((f) => m(f.name))
        .slice(0, 6)
        .map((f) => ({
          clave: 'f' + f.id,
          label: f.name,
          icono: 'paperclip',
          cls: 'mist',
          pista: 'Documento',
          destino: { ruta: f.projectId ? `/proyectos?p=${f.projectId}` : f.contactId ? `/contactos?id=${f.contactId}` : f.companyId ? `/empresas?id=${f.companyId}` : '/inicio' },
        })),
    },
    {
      titulo: 'Notas',
      items: c.notes
        .filter((n) => m(n.text))
        .slice(0, 5)
        .map((n) => ({ clave: 'n' + n.id, label: n.text.replace(/\s+/g, ' ').slice(0, 60), icono: 'note', cls: n.color, pista: 'Nota', destino: { formulario: 'note', id: n.id } })),
    },
  ];
  return grupos.filter((g) => g.items.length);
}
