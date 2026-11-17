'use client';

import { AUTOMATIZACIONES, CLAVES_AUTOMATIZACION } from '@/lib/catalogos/cliente';
import type { ClaveAutomatizacion } from '@/lib/datos/entidades';
import { automatizacionActiva, ejecucionesDe } from '@/lib/reglas/cliente';
import { relativa } from '@/lib/reglas/fechas';
import { horas } from '@/lib/reglas/trabajo';
import { ahoraISO, nuevoId, useDatos } from '@/components/app/Datos';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

/** Automatizaciones: interruptores «cuando pasa esto, haz esto otro» (SPEC §6.20). */
export default function Automatizaciones() {
  const { c, hoy, crear, actualizar } = useDatos();
  const toast = useToast();
  const activas = CLAVES_AUTOMATIZACION.filter((k) => automatizacionActiva(c, k));
  const veces = c.automationRuns.length;
  const ultima = c.automationRuns.map((r) => r.createdAt.slice(0, 10)).sort().at(-1) ?? null;

  const cambiar = async (k: ClaveAutomatizacion) => {
    const on = !automatizacionActiva(c, k);
    const fila = c.automations.find((a) => a.key === k);
    const ok = fila ? await actualizar('automations', fila.id, { on }) : await crear('automations', { id: nuevoId(), key: k, on, createdAt: ahoraISO() });
    if (ok) toast(on ? 'Automatización activada' : 'Automatización desactivada');
  };

  return (
    <>
      <Cabecera antetitulo="Que nebúla trabaje por ti" titulo="Automatizaciones">
        Reglas sencillas: «cuando pasa esto, haz esto otro». Actívalas o desactívalas cuando quieras.
      </Cabecera>
      <div className="stats">
        <div className="stat sage">
          <span className="k">Activas</span>
          <span className="v num">{activas.length}</span>
          <span className="s">de {CLAVES_AUTOMATIZACION.length}</span>
        </div>
        <div className="stat lilac">
          <span className="k">Veces que han trabajado por ti</span>
          <span className="v num">{veces}</span>
          <span className="s">Desde que usas nebúla</span>
        </div>
        <div className="stat peach">
          <span className="k">Tiempo ahorrado aprox.</span>
          <span className="v num">{horas(veces * 10)}</span>
          <span className="s">Contando 10 min por vez</span>
        </div>
        <div className="stat butter">
          <span className="k">Última vez</span>
          <span className="v num">{ultima ? relativa(ultima, hoy) : '—'}</span>
          <span className="s">Que se ejecutó una</span>
        </div>
      </div>
      <div className="autos">
        {CLAVES_AUTOMATIZACION.map((k) => {
          const m = AUTOMATIZACIONES[k];
          const on = automatizacionActiva(c, k);
          const e = ejecucionesDe(c, k);
          return (
            <article key={k} className={`auto ${on ? '' : 'off'}`}>
              <div className="auto-h">
                <span className={`tl-ic ${on ? 'sage' : 'mist'}`}>
                  <Icono n={m.icon} />
                </span>
                <b>{m.when}</b>
                <button type="button" className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={`Activar: ${m.when}`} onClick={() => void cambiar(k)} />
              </div>
              <ul>
                {m.then.map((t) => (
                  <li key={t}>
                    <Icono n="arrow" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="chip">{e.veces ? `Se ha ejecutado ${e.veces} ${e.veces === 1 ? 'vez' : 'veces'} · la última ${relativa(e.ultima, hoy).toLowerCase()}` : 'Todavía no se ha ejecutado'}</div>
            </article>
          );
        })}
      </div>
      <p className="foot-note">
        Los recordatorios de pago, los toques por entregables y las facturas de igualas los envía nebúla cada mañana. Los correos solo salen de verdad cuando esté configurado el servicio de correo; mientras, quedan como «simulados».
      </p>
    </>
  );
}
