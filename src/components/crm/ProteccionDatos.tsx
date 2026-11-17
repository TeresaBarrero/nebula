'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Contacto } from '@/lib/datos/entidades';
import { exportarContacto } from '@/lib/reglas/rgpd';
import { normalizar } from '@/lib/reglas/textos';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';

/** Descarga un archivo de texto en el navegador. */
export function descargar(nombre: string, texto: string, tipo = 'text/plain') {
  const url = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** «Darle sus datos» y «Borrar sus datos» de un contacto (SPEC §7.12). */
export function BotonesRgpd({ x }: { x: Contacto }) {
  const { c, hoy, crear } = useDatos();
  const toast = useToast();
  const [borrar, setBorrar] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn sm"
        onClick={async () => {
          const datos = exportarContacto(c, x.id, hoy);
          if (!datos) return;
          descargar(`datos-${normalizar(x.name).replace(/[^a-z0-9]+/g, '-')}.json`, JSON.stringify(datos, null, 2), 'application/json');
          await crear('rgpdLog', { id: nuevoId(), date: hoy, action: 'Exportación de datos', detail: 'Se entregaron sus datos a una persona que lo pidió.', createdAt: ahoraISO() });
          toast('Archivo descargado. Envíaselo a la persona por un canal seguro.');
        }}
      >
        <Icono n="download" />
        Darle sus datos
      </button>
      <button type="button" className="btn sm danger" onClick={() => setBorrar(true)}>
        <Icono n="trash" />
        Borrar sus datos
      </button>
      {borrar && <ConfirmarBorrado x={x} alCerrar={() => setBorrar(false)} />}
    </>
  );
}

function ConfirmarBorrado({ x, alCerrar }: { x: Contacto; alCerrar: () => void }) {
  const { c, borrarDatosContacto } = useDatos();
  const toast = useToast();
  const router = useRouter();
  const [escrito, setEscrito] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const facturas = c.invoices.filter((f) => f.contactId === x.id && f.status === 'emitida').length;
  const contratos = c.contracts.filter((k) => k.contactId === x.id && k.status === 'firmado').length;
  const ok = normalizar(escrito.trim()) === normalizar(x.name.trim());
  return (
    <Modal
      titulo={`Borrar los datos de ${x.name}`}
      alCerrar={alCerrar}
      ancho={560}
      comoFormulario={async () => {
        if (!ok) return toast('Escribe su nombre exactamente para confirmar');
        setOcupado(true);
        const hecho = await borrarDatosContacto(x.id);
        setOcupado(false);
        if (!hecho) return;
        alCerrar();
        router.replace('/contactos');
        toast('Datos borrados. Queda apuntado en el registro de protección de datos (sin sus datos).');
      }}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn danger" disabled={!ok || ocupado}>
            <Icono n="trash" />
            Borrar para siempre
          </button>
        </>
      }
    >
      <div className="modal-b block">
        <div className="warn rose">Esto no se puede deshacer.</div>
        <p style={{ margin: 0 }}>Se borran su ficha, apuntes del historial, reuniones, notas, documentos, correos y su acceso al portal. Las tareas, oportunidades, gastos y proyectos se quedan, pero sin su nombre.</p>
        {(facturas > 0 || contratos > 0) && (
          <p className="muted" style={{ margin: 0 }}>
            {facturas > 0 && `Sus ${facturas} facturas emitidas se conservan (la ley obliga a guardarlas), sin vínculo con su ficha. `}
            {contratos > 0 && `Sus ${contratos} contratos firmados también se conservan como prueba legal.`}
          </p>
        )}
        <label className="field">
          <span>Para confirmar, escribe su nombre: {x.name}</span>
          <input className="input" data-autofocus value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" />
        </label>
      </div>
    </Modal>
  );
}
