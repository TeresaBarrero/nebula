'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { FASES_ABIERTAS } from '@/lib/catalogos/crm';
import { TIPOS_RENOVACION } from '@/lib/catalogos/dinero';
import type { Factura, Iguala, Id, LineaFactura, Renovacion } from '@/lib/datos/entidades';
import { borradorDe, documentoNuevo, facturaDePresupuesto, rectificativaDe } from '@/lib/reglas/facturas';
import { fechaLargaDe } from '@/lib/reglas/fechas';
import { mesDe, nombreMes, siguienteRenovacion } from '@/lib/reglas/recurrentes';
import { useAccionesCrm } from '@/components/app/acciones';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { useNebula } from '@/components/app/Nebula';
import { useToast } from '@/components/ui/Toasts';
import { EditorFactura } from './Editor';
import { PanelFactura, VentanaPago } from './Panel';

export type AccionesDinero = {
  /** Abre el editor de un documento nuevo. */
  nueva: (kind: Factura['kind'], o?: Partial<Factura>) => void;
  editar: (f: Factura) => void;
  ver: (id: Id) => void;
  pago: (id: Id) => void;
  emitir: (id: Id) => Promise<void>;
  rectificar: (f: Factura) => void;
  convertir: (q: Factura) => Promise<void>;
  enviado: (q: Factura) => Promise<void>;
  rechazar: (q: Factura) => Promise<void>;
  facturarIguala: (r: Iguala) => Promise<void>;
  renovar: (n: Renovacion) => Promise<void>;
  /** Añade una línea al borrador de factura del cliente (o crea uno). Devuelve su id o null si no se pudo. */
  anadirAlBorrador: (o: { companyId: Id | null; contactId?: Id | null; projectId?: Id | null; linea: LineaFactura }) => Promise<Id | null>;
};

const Ctx = createContext<AccionesDinero | null>(null);

export function useDinero(): AccionesDinero {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDinero fuera de ProveedorDinero');
  return v;
}

/** Ventanas de facturas (editor, vista y pago) disponibles desde cualquier pantalla. */
export function ProveedorDinero({ children }: { children: ReactNode }) {
  const datos = useDatos();
  const { c, hoy, crear, actualizar, emitir: emitirDoc } = datos;
  const { ajustes } = useNebula();
  const toast = useToast();
  const { mover } = useAccionesCrm();
  const [editor, setEditor] = useState<{ f: Factura; n: number } | null>(null);
  const [panel, setPanel] = useState<Id | null>(null);
  const [pago, setPago] = useState<Id | null>(null);

  const base = () => ({ id: nuevoId(), hoy, ahora: ahoraISO(), ajustes, empresas: c.companies });

  const acc: AccionesDinero = useMemo(() => {
    const abrirEditor = (f: Factura) => setEditor((e) => ({ f, n: (e?.n ?? 0) + 1 }));
    const emitir = async (id: Id) => {
      const f = await emitirDoc(id);
      if (!f) return;
      if (f.kind === 'factura') {
        toast(`Factura ${f.number} emitida`);
        setPanel(f.id);
      }
    };
    const deal = (q: Factura) => c.deals.find((d) => d.id === q.dealId);
    const anadirAlBorrador: AccionesDinero['anadirAlBorrador'] = async ({ companyId, contactId, projectId, linea }) => {
      const previo = borradorDe(c.invoices, companyId);
      if (previo) return (await actualizar('invoices', previo.id, { lines: [...previo.lines, linea] })) ? previo.id : null;
      const persona = contactId ?? c.contacts.find((x) => x.companyId === companyId && x.type !== 'Colaborador')?.id ?? null;
      const f = documentoNuevo('factura', { companyId, contactId: persona, projectId: projectId ?? null, lines: [linea] }, base());
      return (await crear('invoices', f)) ? f.id : null;
    };
    return {
      anadirAlBorrador,
      nueva: (kind, o = {}) => abrirEditor(documentoNuevo(kind, o, base())),
      editar: abrirEditor,
      ver: setPanel,
      pago: setPago,
      emitir,
      rectificar: (f) => abrirEditor(rectificativaDe(f, base())),
      convertir: async (q) => {
        if (q.status !== 'aceptado') await actualizar('invoices', q.id, { status: 'aceptado' });
        const d = deal(q);
        // Aceptar el presupuesto gana la oportunidad (y crea su proyecto si aún no lo tiene).
        const proyecto = d && d.stage !== 'ganado' ? await mover(d, 'ganado', false, true) : (d?.projectId ?? null);
        abrirEditor(facturaDePresupuesto(q, base(), q.projectId ?? proyecto));
        toast(proyecto && !q.projectId ? 'Presupuesto aceptado y proyecto creado. Revisa la factura y emítela.' : 'Presupuesto aceptado. Revisa la factura y emítela.');
      },
      enviado: async (q) => {
        if (!(await actualizar('invoices', q.id, { status: 'enviado', date: hoy }))) return;
        const d = deal(q);
        if (d && FASES_ABIERTAS.indexOf(d.stage) >= 0 && FASES_ABIERTAS.indexOf(d.stage) < 2) await mover(d, 'propuesta', false, true);
        toast('Presupuesto marcado como enviado');
      },
      rechazar: async (q) => {
        if (!(await actualizar('invoices', q.id, { status: 'rechazado' }))) return;
        const d = deal(q);
        if (d && d.stage !== 'perdido') await mover(d, 'perdido', false, true);
        toast(d ? 'Presupuesto rechazado. La oportunidad pasa a Perdido.' : 'Presupuesto rechazado');
      },
      facturarIguala: async (r) => {
        const f = documentoNuevo(
          'factura',
          { companyId: r.companyId, contactId: r.contactId, retainerId: r.id, lines: [{ desc: `${r.name} · ${nombreMes(hoy)}`, qty: 1, price: r.fee }] },
          base(),
        );
        if (!(await crear('invoices', f))) return;
        await actualizar('retainers', r.id, { lastBilled: mesDe(hoy) });
        setPanel(f.id);
        toast('Factura preparada. Revísala y pulsa «Emitir factura»');
      },
      renovar: async (n) => {
        const linea = { desc: `Renovación ${TIPOS_RENOVACION[n.type].label.toLowerCase()} ${n.name} · 1 año`, qty: 1, price: n.price };
        const id = await anadirAlBorrador({ companyId: n.companyId, linea });
        if (!id) return;
        if (n.cost)
          await crear('expenses', {
            id: nuevoId(), date: hoy, supplier: n.provider || n.name, contactId: null, concept: `Renovación ${n.name}`, category: 'Renovaciones de clientes',
            base: n.cost, ivaPct: 21, deductible: true, projectId: null, receiptPath: '', receiptName: '', createdAt: ahoraISO(),
          });
        const fecha = siguienteRenovacion(n, hoy);
        await actualizar('renewals', n.id, { renewDate: fecha });
        toast(`Renovado hasta el ${fechaLargaDe(fecha)} y añadido a un borrador de factura`, { label: 'Ver factura', fn: () => setPanel(id) });
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, hoy, ajustes, crear, actualizar, emitirDoc, mover, toast]);

  const guardar = async (f: Factura, emitir: boolean) => {
    const existe = c.invoices.some((x) => x.id === f.id);
    const ok = existe ? await actualizar('invoices', f.id, f) : await crear('invoices', f);
    if (!ok) return;
    setEditor(null);
    if (f.kind === 'presupuesto') {
      const q = f.number ? f : await emitirDoc(f.id);
      toast(`Presupuesto ${q?.number ?? ''} guardado`);
      setPanel(f.id);
      return;
    }
    if (emitir) await acc.emitir(f.id);
    else {
      toast('Borrador guardado');
      setPanel(f.id);
    }
  };

  const enPanel = c.invoices.find((x) => x.id === panel);
  const enPago = c.invoices.find((x) => x.id === pago);
  return (
    <Ctx value={acc}>
      {children}
      {enPanel && <PanelFactura key={enPanel.id} f={enPanel} acc={acc} alCerrar={() => setPanel(null)} />}
      {editor && <EditorFactura key={editor.n} inicial={editor.f} alCerrar={() => setEditor(null)} alGuardar={guardar} />}
      {enPago && <VentanaPago f={enPago} alCerrar={() => setPago(null)} />}
    </Ctx>
  );
}
