'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DISCIPLINAS } from '@/lib/catalogos/disciplinas';
import type { Tema } from '@/lib/datos/tipos';
import { ejemploFactura, eur } from '@/lib/reglas/dinero';
import { irpfPorDefecto } from '@/lib/reglas/irpf';
import { iniciales } from '@/lib/reglas/textos';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { useCarcasa } from '@/components/app/Carcasa';
import { EditarPerfil } from '@/components/app/EditarPerfil';
import { AjustesCliente } from '@/components/cliente/AjustesCliente';
import { useNebula } from '@/components/app/Nebula';
import { Ayuda } from '@/components/ui/Ayuda';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

const TEMAS: [Tema, string][] = [
  ['system', 'Sistema'],
  ['light', 'Claro'],
  ['dark', 'Oscuro'],
];

export default function PaginaPerfil() {
  const n = useNebula();
  const { perfil: p, ajustes: a, modo } = n;
  const { abrirAsistente } = useCarcasa();
  const toast = useToast();
  const [editar, setEditar] = useState(false);
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  // Lo que se está escribiendo en «capacidad»; null = mostrar lo guardado.
  const [borradorCapacidad, setBorradorCapacidad] = useState<string | null>(null);
  const capacidad = borradorCapacidad ?? String(a.capacity);
  const [pendientes, setPendientes] = useState<number | null>(null);

  useEffect(() => {
    if (!n.esAdmin) return;
    supabaseNavegador()
      .rpc('admin_list_accounts')
      .then(({ data }) => setPendientes((data ?? []).filter((c) => c.status === 'pendiente').length));
  }, [n.esAdmin]);

  const irpf = irpfPorDefecto(a);
  const ej = ejemploFactura(1000, a.iva, irpf);

  const guardarCapacidad = () => {
    const v = Number(capacidad);
    setBorradorCapacidad(null);
    if (capacidad.trim() === '' || !Number.isFinite(v) || v < 0 || v > 168) {
      toast('Escribe un número de horas entre 0 y 168');
      return;
    }
    if (v !== a.capacity) void n.guardarAjustes({ capacity: v }).then((ok) => ok && toast('Capacidad guardada'));
  };

  return (
    <>
      <Cabecera
        antetitulo="Cuenta"
        titulo="Perfil"
        acciones={
          <button type="button" className="btn" onClick={() => setEditar(true)}>
            <Icono n="edit" />
            Editar perfil
          </button>
        }
      />
      <div className="grid g-prof">
        <section className="card prof-card">
          <span className="avatar xl" style={{ background: 'var(--surface)', color: 'var(--peach-ink)' }}>
            {iniciales(p.fullName || p.name)}
          </span>
          <h2>{p.fullName || p.name || 'Tu nombre'}</h2>
          <div>{p.role}</div>
          <div className="tags" style={{ justifyContent: 'center', marginTop: 8 }}>
            {a.disciplines.map((k) => (
              <span key={k} className={`pill ${DISCIPLINAS[k].cls}`}>
                {DISCIPLINAS[k].label}
              </span>
            ))}
          </div>
          <div className="prof-rows">
            {a.business && <div>{a.business}</div>}
            <div>{p.email}</div>
            {p.phone && <div>{p.phone}</div>}
          </div>
          <button type="button" className="btn" style={{ marginTop: 16 }} onClick={() => void n.salir()}>
            <Icono n={modo === 'demo' ? 'door' : 'logout'} />
            {modo === 'demo' ? 'Salir de la demostración' : 'Cerrar sesión'}
          </button>
        </section>

        <div className="stack">
          {n.esAdmin && (
            <section className="card">
              <div className="card-h">
                <h2>
                  <Icono n="shield" />
                  Solicitudes de acceso
                </h2>
                <Link href="/perfil/solicitudes" className="text-link">
                  Ver todas
                </Link>
              </div>
              <div className={`warn ${pendientes ? 'butter' : 'sage'}`}>
                {pendientes === null
                  ? 'Comprobando…'
                  : pendientes
                    ? `${pendientes} ${pendientes === 1 ? 'persona espera' : 'personas esperan'} tu aprobación para usar nebúla.`
                    : 'No hay nadie esperando aprobación.'}
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="receipt" />
                Cómo facturas
              </h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="text-link" onClick={abrirAsistente}>
                  Repetir asistente
                </button>
                <button type="button" className="text-link" onClick={() => setEditar(true)}>
                  Editar
                </button>
              </div>
            </div>
            <div className="warn sage" style={{ marginBottom: 14 }}>
              {a.kind === 'sociedad' ? 'Facturas como sociedad' : 'Facturas como autónomo/a'}. Tus facturas llevan <b>IVA {a.iva} %</b>{' '}
              <Ayuda k="iva" /> y <b>{irpf ? `retención del ${irpf} %` : 'sin retención'}</b> <Ayuda k="irpf" />.
              <br />
              Ejemplo: por un trabajo de {eur(ej.base)}, te ingresarán <b>{eur(ej.total)}</b>.
            </div>
            <dl className="info" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
              <div>
                <dt>Nombre fiscal</dt>
                <dd>{a.legalName || '—'}</dd>
              </div>
              <div>
                <dt>NIF</dt>
                <dd>{a.nif || '—'}</dd>
              </div>
              <div className="full">
                <dt>Dirección fiscal</dt>
                <dd>{a.address || '—'}</dd>
              </div>
              <div>
                <dt>Cuenta para cobrar (IBAN)</dt>
                <dd>{a.iban || '—'}</dd>
              </div>
              <div>
                <dt>Plazo de pago</dt>
                <dd>{a.payDays} días</dd>
              </div>
              <div>
                <dt>Tu tarifa por hora</dt>
                <dd>{eur(a.rate)}</dd>
              </div>
              <div>
                <dt>Precio de una ronda de cambios extra</dt>
                <dd>{eur(a.extraRound)}</dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="layers" />
                Tu capacidad
              </h2>
            </div>
            <div className="pref">
              <div>
                <b>Horas que puedes trabajar a la semana</b>
                <span>Se usa en «Carga de trabajo» para avisarte antes de saturarte.</span>
              </div>
              <input
                className="input num"
                type="number"
                min={0}
                max={168}
                style={{ width: 90 }}
                value={capacidad}
                onChange={(e) => setBorradorCapacidad(e.target.value)}
                onBlur={guardarCapacidad}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                aria-label="Horas a la semana"
              />
            </div>
          </section>

          <section className="card">
            <div className="card-h">
              <h2>Preferencias</h2>
            </div>
            <div className="pref">
              <div>
                <b>Tema</b>
                <span>Sigue al sistema o elige uno fijo.</span>
              </div>
              <div className="seg" role="group" aria-label="Tema">
                {TEMAS.map(([k, l]) => (
                  <button key={k} type="button" className={p.prefs.theme === k ? 'on' : ''} aria-pressed={p.prefs.theme === k} onClick={() => n.cambiarTema(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="pref">
              <div>
                <b>Menú lateral compacto</b>
                <span>Muestra solo los iconos para ganar espacio.</span>
              </div>
              <button
                type="button"
                className={`switch ${p.prefs.compact ? 'on' : ''}`}
                role="switch"
                aria-checked={p.prefs.compact}
                aria-label="Menú compacto"
                onClick={() => n.cambiarCompacto(!p.prefs.compact)}
              />
            </div>
            <div className="pref">
              <div>
                <b>Atajos de teclado</b>
                <span>
                  <kbd>⌘K</kbd> o <kbd>Ctrl K</kbd> buscar · <kbd>/</kbd> buscar · <kbd>N</kbd> nueva tarea · <kbd>Esc</kbd> cerrar
                </span>
              </div>
            </div>
            {modo === 'demo' && (
              <div className="pref">
                <div>
                  <b>Datos de ejemplo</b>
                  <span>La demostración guarda tus cambios solo en este navegador.</span>
                </div>
                <button
                  type="button"
                  className="btn danger"
                  onClick={async () => {
                    if (!confirmarReinicio) return setConfirmarReinicio(true);
                    setConfirmarReinicio(false);
                    await n.reiniciarDemo();
                    toast('Datos de ejemplo restablecidos');
                  }}
                >
                  {confirmarReinicio ? 'Pulsa otra vez para confirmar' : 'Empezar de cero la demo'}
                </button>
              </div>
            )}
          </section>

          <AjustesCliente />

          <section className="card">
            <div className="card-h">
              <h2>
                <Icono n="link" />
                Próximamente
              </h2>
            </div>
            <div className="pref">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="tl-ic mist">
                  <Icono n="mail" />
                </span>
                <div>
                  <b>Conexiones</b>
                  <span>Gmail, Outlook y Google Calendar.</span>
                </div>
              </div>
              <span className="pill mist">Fase 5</span>
            </div>
            <div className="pref">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="tl-ic mist">
                  <Icono n="shield" />
                </span>
                <div>
                  <b>
                    Protección de datos <Ayuda k="rgpd" />
                  </b>
                  <span>Registro de solicitudes, exportar y borrar datos de un contacto.</span>
                </div>
              </div>
              <span className="pill mist">Fase 5</span>
            </div>
          </section>
        </div>
      </div>
      {editar && <EditarPerfil alCerrar={() => setEditar(false)} />}
    </>
  );
}
