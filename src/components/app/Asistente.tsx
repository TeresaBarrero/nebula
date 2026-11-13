'use client';

import { useState } from 'react';
import { DISCIPLINAS, type Disciplina } from '@/lib/catalogos/disciplinas';
import { inicioAsistente } from '@/lib/datos/asistente';
import type { DatosAsistente } from '@/lib/datos/tipos';
import { ejemploFactura, eur } from '@/lib/reglas/dinero';
import { irpfDelAsistente } from '@/lib/reglas/irpf';
import { Capa } from '@/components/ui/Modal';
import { Ayuda } from '@/components/ui/Ayuda';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';
import { useNebula } from './Nebula';

const PASOS = 5;

/** Asistente inicial (SPEC §6.1): 5 pasos con puntos de progreso y «Ahora no». */
export function Asistente({ alCerrar }: { alCerrar: () => void }) {
  const { perfil, ajustes, datosPrevios, completarAsistente, saltarAsistente } = useNebula();
  const toast = useToast();
  const [paso, setPaso] = useState(0);
  const [d, setD] = useState<DatosAsistente>(() => {
    const ini = inicioAsistente(perfil, ajustes, datosPrevios);
    // Los datos fiscales de ejemplo de la demo no se muestran como si fueran tuyos.
    return { ...ini, nif: ini.nif === '00000000T' ? '' : ini.nif, iban: ini.iban.startsWith('ES00') ? '' : ini.iban };
  });
  const cambia = <K extends keyof DatosAsistente>(k: K, v: DatosAsistente[K]) => setD((x) => ({ ...x, [k]: v }));

  const opcion = <K extends 'kind' | 'irpfMode' | 'newAutonomo'>(k: K, v: DatosAsistente[K], titulo: string, desc: string) => (
    <button type="button" className={`opt ${d[k] === v ? 'on' : ''}`} aria-pressed={d[k] === v} onClick={() => cambia(k, v)}>
      <b>{titulo}</b>
      <span>{desc}</span>
    </button>
  );

  const terminar = async () => {
    await completarAsistente(d);
    alCerrar();
    toast('¡Listo! nebúla ya está configurada a tu medida');
  };

  const irpf = irpfDelAsistente(d);
  const ej = ejemploFactura(1000, d.iva, irpf);

  const pasos = [
    <>
      <h2>¡Hola! Vamos a dejar nebúla a tu medida</h2>
      <p className="muted">Son 4 preguntas y menos de un minuto. Podrás cambiarlo todo después desde tu perfil.</p>
      <div className="fgrid wz-2">
        <label className="field">
          <span>¿Cómo te llamamos?</span>
          <input className="input" data-autofocus value={d.name} onChange={(e) => cambia('name', e.target.value)} maxLength={60} />
        </label>
        <label className="field">
          <span>Nombre de tu estudio o marca</span>
          <input className="input" value={d.business} onChange={(e) => cambia('business', e.target.value)} maxLength={120} />
        </label>
      </div>
    </>,
    <>
      <h2>¿A qué te dedicas?</h2>
      <p className="muted">Marca todo lo que haces. Usaremos esto para las plantillas de proyecto y los informes.</p>
      <div className="chips-pick">
        {(Object.entries(DISCIPLINAS) as [Disciplina, (typeof DISCIPLINAS)[Disciplina]][]).map(([k, v]) => {
          const on = d.disciplines.includes(k);
          return (
            <button
              key={k}
              type="button"
              className={`pill ${v.cls} ${on ? 'on' : ''}`}
              aria-pressed={on}
              onClick={() => cambia('disciplines', on ? d.disciplines.filter((x) => x !== k) : [...d.disciplines, k])}
            >
              {on ? '✓ ' : ''}
              {v.label}
            </button>
          );
        })}
      </div>
    </>,
    <>
      <h2>¿Cómo trabajas?</h2>
      <p className="muted">
        Esto decide si tus facturas llevan retención de IRPF <Ayuda k="irpf" />
      </p>
      <div className="opts">
        {opcion('kind', 'autonomo', 'Soy autónomo/a', 'Trabajo por mi cuenta, con mi nombre y DNI.')}
        {opcion('kind', 'sociedad', 'Tengo una sociedad', 'Una agencia o estudio con forma de S.L. Las sociedades no aplican retención.')}
      </div>
      {d.kind === 'autonomo' && (
        <>
          <div className="sec-lbl" style={{ marginTop: 16 }}>
            ¿Llevas menos de 3 años como autónomo/a?
          </div>
          <div className="opts">
            {opcion('newAutonomo', true, 'Sí', 'Puedes aplicar una retención reducida del 7 %.')}
            {opcion('newAutonomo', false, 'No', 'Se aplica la retención normal del 15 %.')}
          </div>
        </>
      )}
    </>,
    <>
      <h2>¿A quién facturas normalmente?</h2>
      <p className="muted">La retención solo se aplica cuando el cliente es una empresa o un autónomo.</p>
      <div className="opts">
        {opcion('irpfMode', 'empresas', 'Empresas y autónomos', 'Lo normal en agencias y estudios creativos.')}
        {opcion('irpfMode', 'particulares', 'Particulares', 'Personas que te encargan algo para sí mismas.')}
        {opcion('irpfMode', 'mixto', 'De todo un poco', 'Pondremos retención y la quitaremos sola cuando marques a un cliente como particular.')}
      </div>
    </>,
    <>
      <h2>Así quedarán tus facturas</h2>
      <div className="wz-sum">
        <div>
          <span>Tu trabajo (sin IVA)</span>
          <b>{eur(ej.base)}</b>
        </div>
        <div>
          <span>
            + IVA {d.iva} % <Ayuda k="iva" />
          </span>
          <b>{eur(ej.iva)}</b>
        </div>
        {irpf ? (
          <div>
            <span>
              − Retención {irpf} % <Ayuda k="irpf" />
            </span>
            <b>−{eur(ej.irpf)}</b>
          </div>
        ) : (
          <div>
            <span>Sin retención de IRPF</span>
            <b>0 €</b>
          </div>
        )}
        <div className="grand">
          <span>Te ingresarán</span>
          <b>{eur(ej.total)}</b>
        </div>
      </div>
      <p className="muted">
        Cuando hagas una factura solo tendrás que escribir qué has hecho y cuánto cuesta. Si necesitas algo especial, lo tendrás en «Más opciones».
      </p>
      <div className="sec-lbl">Datos para tus facturas (puedes hacerlo luego)</div>
      <div className="fgrid">
        <label className="field">
          <span>NIF</span>
          <input className="input" value={d.nif} onChange={(e) => cambia('nif', e.target.value)} placeholder="12345678Z" maxLength={20} />
        </label>
        <label className="field">
          <span>Cuenta para cobrar (IBAN)</span>
          <input className="input" value={d.iban} onChange={(e) => cambia('iban', e.target.value)} placeholder="ES12 3456…" maxLength={40} />
        </label>
        <label className="field">
          <span>Tu tarifa por hora (€)</span>
          <input
            className="input num"
            type="number"
            min={0}
            inputMode="decimal"
            value={d.rate}
            onChange={(e) => cambia('rate', Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>
    </>,
  ];

  return (
    <Capa>
      <div className="modal wizard" role="dialog" aria-modal="true" aria-label="Asistente de configuración">
        <div className="wz-top">
          <span className="logo" style={{ fontSize: 30 }}>
            nebúla
          </span>
          <div className="wz-dots" aria-label={`Paso ${paso + 1} de ${PASOS}`}>
            {Array.from({ length: PASOS }, (_, i) => (
              <i key={i} className={i <= paso ? 'on' : ''} />
            ))}
          </div>
          <button
            type="button"
            className="text-link"
            onClick={async () => {
              await saltarAsistente();
              alCerrar();
              toast('Puedes configurarlo cuando quieras desde tu perfil');
            }}
          >
            Ahora no
          </button>
        </div>
        <div className="wz-body" key={paso}>
          {pasos[paso]}
        </div>
        <div className="modal-f">
          {paso > 0 && (
            <button type="button" className="btn ghost" onClick={() => setPaso(paso - 1)}>
              <Icono n="left" />
              Atrás
            </button>
          )}
          <button type="button" className="btn primary" onClick={() => (paso === PASOS - 1 ? terminar() : setPaso(paso + 1))}>
            {paso === PASOS - 1 ? 'Empezar a usar nebúla' : 'Siguiente'}
            {paso < PASOS - 1 && <Icono n="right" />}
          </button>
        </div>
      </div>
    </Capa>
  );
}
