'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ESTADOS_CONTRATO, TIPOS_CONTRATO, kpisDe } from '@/lib/catalogos/cliente';
import { correos } from '@/lib/automatizaciones';
import type { Contrato, Id, InformeMensual } from '@/lib/datos/entidades';
import { accionPortal } from '@/lib/portal';
import { clausulas, datosPortal, etiquetaMes, informeDe } from '@/lib/reglas/cliente';
import { relativa } from '@/lib/reglas/fechas';
import { mesDe } from '@/lib/reglas/recurrentes';
import { coloresDe, marcaDe } from '@/lib/reglas/trabajo';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { useEjecutor } from '@/components/app/ejecutor';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { useNebula } from '@/components/app/Nebula';
import { Icono } from '@/components/ui/Icono';
import { Capa, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';
import { PapelContrato, PapelInforme, type DatosInforme } from './Papeles';
import { PortalVista } from './PortalVista';

type AccionesCliente = {
  verContrato: (id: Id) => void;
  enviarContrato: (k: Contrato) => Promise<void>;
  verPortal: (companyId: Id) => void;
  enviarPortal: (companyId: Id, contactId: Id | null) => Promise<void>;
  verInforme: (retainerId: Id, mes: string) => void;
};

const Ctx = createContext<AccionesCliente | null>(null);
export function useCliente(): AccionesCliente {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCliente fuera de ProveedorCliente');
  return v;
}

/** Imprime (PDF) lo que se le pase mientras está montado. */
function Impresion({ titulo, children, alTerminar }: { titulo: string; children: ReactNode; alTerminar: () => void }) {
  useEffect(() => {
    const antes = document.title;
    document.title = titulo;
    window.addEventListener('afterprint', alTerminar);
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', alTerminar);
      document.title = antes;
    };
  }, [titulo, alTerminar]);
  return createPortal(<div className="zona-impresion">{children}</div>, document.body);
}

export function ProveedorCliente({ children }: { children: ReactNode }) {
  const { c, crear } = useDatos();
  const { ajustes } = useNebula();
  const toast = useToast();
  const ejecutor = useEjecutor();
  const [contrato, setContrato] = useState<Id | null>(null);
  const [portal, setPortal] = useState<Id | null>(null);
  const [informe, setInforme] = useState<{ retainerId: Id; mes: string } | null>(null);
  const estudio = ajustes.business || ajustes.legalName;

  const enviarPortal: AccionesCliente['enviarPortal'] = async (companyId, contactId) => {
    const persona = c.contacts.find((x) => x.id === contactId) ?? c.contacts.find((x) => x.companyId === companyId && x.type !== 'Colaborador');
    const to = persona?.email || c.companies.find((e) => e.id === companyId)?.email;
    if (!to) return toast('Esta empresa no tiene email: añádeselo a su persona de contacto');
    const enlace = await ejecutor.enlacePortal(companyId, persona?.id ?? null);
    if (!enlace) return toast('No se ha podido crear el enlace del portal. Inténtalo de nuevo.');
    const m = correos.portal(persona?.name ?? '', estudio, enlace);
    const r = await ejecutor.correo({ to, ...m, kind: 'portal', contactId: persona?.id ?? null, companyId });
    void navigator.clipboard?.writeText(enlace).catch(() => {});
    toast(r?.status === 'enviado' ? `Enlace enviado a ${to} (y copiado)` : `Enlace copiado. ${ejecutor.demo ? 'En la demo el correo no sale' : 'El correo aún no está configurado'}: pégaselo tú.`);
  };

  const acc: AccionesCliente = {
    verContrato: setContrato,
    verPortal: setPortal,
    verInforme: (retainerId, mes) => setInforme({ retainerId, mes }),
    enviarPortal,
    enviarContrato: async (k) => {
      const persona = c.contacts.find((x) => x.id === k.contactId);
      const companyId = k.companyId ?? persona?.companyId ?? null;
      if (!persona?.email) return toast('Elige quién firma y comprueba que tiene email');
      if (!companyId) return toast('El contrato necesita una empresa cliente para firmarse desde su portal');
      const enlace = await ejecutor.enlacePortal(companyId, persona.id);
      if (!enlace) return toast('No se ha podido crear el enlace del portal. Inténtalo de nuevo.');
      if (!(await ejecutor.ej.actualizar('contracts', k.id, { status: 'enviado', sentAt: ejecutor.contexto().hoy, companyId }))) return;
      const r = await ejecutor.correo({ to: persona.email, ...correos.contrato(persona.name, estudio, k.title, enlace), kind: 'contrato', contactId: persona.id, companyId });
      toast(r?.status === 'enviado' ? `Contrato enviado a ${persona.email} para firmar` : 'Contrato marcado como enviado. El correo no ha salido (simulado): puedes copiar el enlace del portal desde su empresa.');
    },
  };

  const k = c.contracts.find((x) => x.id === contrato);
  const ig = informe && c.retainers.find((r) => r.id === informe.retainerId);
  return (
    <Ctx value={acc}>
      {children}
      {k && <PanelContrato key={k.id} k={k} alCerrar={() => setContrato(null)} />}
      {ig && informe && (
        <PanelInforme
          key={`${ig.id}-${informe.mes}`}
          rp={informeDe(c, ig.id, informe.mes, nuevoId(), ahoraISO())}
          guardado={c.reports.some((r) => r.retainerId === ig.id && r.month === informe.mes)}
          alCrear={(rp) => crear('reports', rp)}
          alCerrar={() => setInforme(null)}
        />
      )}
      {portal && <VistaPreviaPortal companyId={portal} alCerrar={() => setPortal(null)} />}
    </Ctx>
  );
}

function PanelContrato({ k, alCerrar }: { k: Contrato; alCerrar: () => void }) {
  const { c, hoy } = useDatos();
  const { ajustes, perfil } = useNebula();
  const abrir = useFormularios();
  const acc = useCliente();
  const [pdf, setPdf] = useState(false);
  const empresa = c.companies.find((e) => e.id === k.companyId);
  const persona = c.contacts.find((x) => x.id === k.contactId);
  const emisor = { legalName: ajustes.legalName || ajustes.business, nif: ajustes.nif, address: ajustes.address, firmante: perfil.fullName };
  const para = empresa ? { name: empresa.name, nif: empresa.nif, address: empresa.address } : persona ? { name: persona.name, nif: persona.nif, address: '' } : null;
  const papel = <PapelContrato k={k} clausulas={clausulas(k, c, ajustes)} emisor={emisor} para={para} />;
  return (
    <Capa alCerrar={alCerrar} className="overlay drawer-ov">
      <aside className="drawer wide" role="dialog" aria-modal="true" aria-label={k.title}>
        <div className="drawer-h">
          <div>
            <div className="tags" style={{ marginBottom: 8 }}>
              <span className={`pill ${ESTADOS_CONTRATO[k.status].cls}`}>{ESTADOS_CONTRATO[k.status].label}</span>
              <span className="pill mist">{TIPOS_CONTRATO[k.type].label}</span>
            </div>
            <h2>{k.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={alCerrar} aria-label="Cerrar" data-autofocus>
            <Icono n="x" />
          </button>
        </div>
        <div className="drawer-b">
          <div className="r-actions">
            {k.status !== 'firmado' && (
              <button type="button" className="btn sm" onClick={() => abrir('contract', { id: k.id })}>
                <Icono n="edit" />
                Editar
              </button>
            )}
            {k.status === 'borrador' && (
              <button type="button" className="btn sm primary" onClick={() => void acc.enviarContrato(k)}>
                <Icono n="send" />
                Enviar para firmar
              </button>
            )}
            {k.status === 'enviado' && (
              <button type="button" className="btn sm" onClick={() => void acc.enviarContrato(k)}>
                <Icono n="send" />
                Volver a enviar
              </button>
            )}
            {(k.companyId ?? persona?.companyId) && (
              <button type="button" className="btn sm" onClick={() => acc.verPortal((k.companyId ?? persona?.companyId)!)}>
                <Icono n="eye" />
                Ver en su portal
              </button>
            )}
            <button type="button" className="btn sm" onClick={() => setPdf(true)}>
              <Icono n="download" />
              PDF
            </button>
          </div>
          {k.status === 'enviado' && <div className="warn butter">Enviado {relativa(k.sentAt, hoy).toLowerCase()}. El cliente lo firma desde su portal, con su nombre, desde cualquier dispositivo.</div>}
          {k.status === 'firmado' && <div className="warn sage">Firmado por {k.signedBy}. Un contrato firmado ya no se puede cambiar.</div>}
          {papel}
        </div>
      </aside>
      {pdf && (
        <Impresion titulo={k.title} alTerminar={() => setPdf(false)}>
          {papel}
        </Impresion>
      )}
    </Capa>
  );
}

function datosDeInforme(c: ReturnType<typeof useDatos>['c'], rp: InformeMensual): DatosInforme {
  const ig = c.retainers.find((x) => x.id === rp.retainerId);
  return {
    ...rp,
    iguala: ig ? { name: ig.name, hours: ig.hours, discipline: ig.discipline } : null,
    publicaciones: c.posts.filter((p) => p.companyId === rp.companyId && mesDe(p.date) === rp.month && p.status === 'publicado'),
    minutos: c.timeEntries.filter((e) => e.retainerId === rp.retainerId && mesDe(e.date) === rp.month).reduce((s, e) => s + e.minutes, 0),
  };
}

function PanelInforme({ rp, guardado, alCrear, alCerrar }: { rp: InformeMensual; guardado: boolean; alCrear: (rp: InformeMensual) => Promise<boolean>; alCerrar: () => void }) {
  const { c, hoy, actualizar } = useDatos();
  const { ajustes } = useNebula();
  const toast = useToast();
  const acc = useCliente();
  const ejecutor = useEjecutor();
  const [editar, setEditar] = useState(false);
  const [pdf, setPdf] = useState(false);
  const empresa = c.companies.find((e) => e.id === rp.companyId);
  const estudio = ajustes.business || ajustes.legalName;
  const asegurar = async () => guardado || (await alCrear(rp));
  const papel = <PapelInforme rp={datosDeInforme(c, rp)} estudio={estudio} cliente={empresa?.name ?? ''} colorMarca={empresa ? coloresDe(marcaDe(empresa))[0] : undefined} />;

  const compartir = async () => {
    if (!(await asegurar())) return;
    if (!(await actualizar('reports', rp.id, { status: 'enviado', sentAt: hoy }))) return;
    const persona = c.contacts.find((x) => x.id === c.retainers.find((r) => r.id === rp.retainerId)?.contactId);
    const enlace = rp.companyId ? await ejecutor.enlacePortal(rp.companyId, persona?.id ?? null) : null;
    if (persona?.email && enlace) {
      const r = await ejecutor.correo({ to: persona.email, ...correos.informe(persona.name, estudio, etiquetaMes(rp.month), enlace), kind: 'informe', contactId: persona.id, companyId: rp.companyId });
      return toast(r?.status === 'enviado' ? `Informe compartido y avisado a ${persona.email}` : 'Informe compartido en su portal (el correo es simulado)');
    }
    toast('Informe compartido en su portal');
  };

  return (
    <Capa alCerrar={alCerrar} className="overlay drawer-ov">
      <aside className="drawer wide" role="dialog" aria-modal="true" aria-label={`Informe de ${etiquetaMes(rp.month)}`}>
        <div className="drawer-h">
          <div>
            <div className="tags" style={{ marginBottom: 8 }}>
              <span className={`pill ${rp.status === 'enviado' ? 'sage' : 'mist'}`}>{rp.status === 'enviado' ? 'Compartido con el cliente' : 'Borrador'}</span>
            </div>
            <h2>Informe de {etiquetaMes(rp.month)}</h2>
            <div className="chip">{empresa?.name}</div>
          </div>
          <button type="button" className="icon-btn" onClick={alCerrar} aria-label="Cerrar" data-autofocus>
            <Icono n="x" />
          </button>
        </div>
        <div className="drawer-b">
          <div className="r-actions">
            <button type="button" className="btn sm" onClick={() => setEditar(true)}>
              <Icono n="edit" />
              Rellenar datos
            </button>
            {rp.status !== 'enviado' && (
              <button type="button" className="btn sm primary" onClick={() => void compartir()}>
                <Icono n="send" />
                Compartir con el cliente
              </button>
            )}
            {rp.companyId && (
              <button type="button" className="btn sm" onClick={() => acc.verPortal(rp.companyId!)}>
                <Icono n="eye" />
                Ver en su portal
              </button>
            )}
            <button type="button" className="btn sm" onClick={() => setPdf(true)}>
              <Icono n="download" />
              PDF
            </button>
          </div>
          {!Object.keys(rp.kpis).length && <div className="warn butter">Rellena los datos del mes (los sacas de Instagram, Google Analytics, Mailchimp…). Las publicaciones y las horas ya están puestas.</div>}
          {papel}
        </div>
      </aside>
      {editar && <DatosInformeVentana rp={rp} guardar={async (cambios) => (await asegurar()) && actualizar('reports', rp.id, cambios)} alCerrar={() => setEditar(false)} />}
      {pdf && (
        <Impresion titulo={`Informe ${rp.month} ${empresa?.name ?? ''}`} alTerminar={() => setPdf(false)}>
          {papel}
        </Impresion>
      )}
    </Capa>
  );
}

function DatosInformeVentana({ rp, guardar, alCerrar }: { rp: InformeMensual; guardar: (c: Partial<InformeMensual>) => Promise<boolean>; alCerrar: () => void }) {
  const { c } = useDatos();
  const toast = useToast();
  const K = kpisDe(c.retainers.find((r) => r.id === rp.retainerId)?.discipline ?? null);
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(K.map(([k]) => [k, rp.kpis[k] !== undefined ? String(rp.kpis[k]) : ''])));
  const [summary, setSummary] = useState(rp.summary);
  const [next, setNext] = useState(rp.next);
  return (
    <Modal
      titulo={`Datos de ${etiquetaMes(rp.month)}`}
      alCerrar={alCerrar}
      comoFormulario={async () => {
        const kpis = Object.fromEntries(
          Object.entries(v)
            .map(([k, x]) => [k, Number(x.replace(',', '.'))] as const)
            .filter(([k, x]) => v[k].trim() !== '' && Number.isFinite(x)),
        );
        if (await guardar({ kpis, summary: summary.trim().slice(0, 3000), next: next.trim().slice(0, 3000) })) {
          alCerrar();
          toast('Informe actualizado');
        }
      }}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn primary">
            Guardar
          </button>
        </>
      }
    >
      <div className="modal-b">
        {K.map(([k, l], i) => (
          <label className="field" key={k}>
            <span>{l}</span>
            <input
              className="input num"
              type="number"
              step="any"
              inputMode="decimal"
              data-autofocus={i === 0 || undefined}
              value={v[k]}
              placeholder={rp.prev[k] !== undefined ? `Mes anterior: ${rp.prev[k]}` : ''}
              onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))}
            />
          </label>
        ))}
        <label className="field full">
          <span>Resumen del mes</span>
          <textarea className="input" rows={3} maxLength={3000} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
        <label className="field full">
          <span>Qué haremos el mes que viene</span>
          <textarea className="input" rows={2} maxLength={3000} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

/** «Ver su portal»: el portal tal y como lo ve el cliente. En la demo se puede actuar como él. */
function VistaPreviaPortal({ companyId, alCerrar }: { companyId: Id; alCerrar: () => void }) {
  const { c, hoy } = useDatos();
  const { ajustes } = useNebula();
  const toast = useToast();
  const ejecutor = useEjecutor();
  const acc = useCliente();
  const d = datosPortal(c, companyId, ajustes, hoy);
  if (!d) return null;
  const hacer = (accion: Parameters<typeof accionPortal>[0]) => async () => {
    const r = await accionPortal(accion, companyId, ejecutor.contexto(), ejecutor.ej, { ip: 'demo (vista previa)', navegador: navigator.userAgent });
    return r.mensaje;
  };
  const acciones = ejecutor.demo
    ? {
        firmar: (id: Id, nombre: string) => hacer({ tipo: 'firmar', id, nombre, acepta: true })(),
        brief: (id: Id, respuestas: Record<string, string>) => hacer({ tipo: 'brief', id, respuestas })(),
        aprobar: (id: Id) => hacer({ tipo: 'aprobar', id })(),
        cambios: (id: Id, texto: string) => hacer({ tipo: 'cambios', id, texto })(),
        presupuesto: (id: Id, acepta: boolean) => hacer({ tipo: 'presupuesto', id, acepta })(),
      }
    : null;
  return (
    <Capa alCerrar={alCerrar} className="portal">
      <div role="dialog" aria-modal="true" aria-label={`Portal de ${d.empresa.name}`}>
        <div className="pt-banner">
          <Icono n="eye" />
          <span>
            Estás viendo el portal como lo ve <b>{d.empresa.name}</b>.{' '}
            {ejecutor.demo ? 'En la demo puedes actuar como el cliente: lo que hagas se refleja en nebúla.' : 'Es solo para mirar: actuar lo hace tu cliente desde su enlace.'}
          </span>
          <button type="button" className="btn sm" onClick={() => void acc.enviarPortal(companyId, d.persona?.id ?? null)}>
            <Icono n="link" />
            Enviar enlace
          </button>
          <button type="button" className="btn sm primary" onClick={alCerrar} data-autofocus>
            <Icono n="door" />
            Volver a nebúla
          </button>
        </div>
        <div className="pt-wrap">
          <header className="pt-head">
            <span className="logo" style={{ fontSize: 30 }}>
              nebúla
            </span>
            <span className="muted">
              {d.estudio} · portal de {d.empresa.name}
            </span>
          </header>
          <PortalVista d={d} acciones={acciones} hoy={hoy} aviso={toast} />
        </div>
      </div>
    </Capa>
  );
}
