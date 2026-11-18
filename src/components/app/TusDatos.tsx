'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { copiaDeSeguridad, exportarCsv, importarContactos, leerCsv, type Importacion } from '@/lib/reglas/csv';
import { relativa } from '@/lib/reglas/fechas';
import { descargar } from '@/components/crm/ProteccionDatos';
import { Ayuda } from '@/components/ui/Ayuda';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';
import { ahoraISO, nuevoId, useDatos } from './Datos';
import { useNebula } from './Nebula';

/** Perfil → Conexiones: Google Calendar en los dos sentidos. */
export function Conexiones() {
  const { c, hoy, crear, borrar, anadirLocal } = useDatos();
  const { modo } = useNebula();
  const toast = useToast();
  const params = useSearchParams();
  const [ocupado, setOcupado] = useState(false);
  const g = c.integrations.find((i) => i.provider === 'gcal');
  const resultado = params.get('google');
  useEffect(() => {
    if (resultado === 'ok') toast('Google Calendar conectado y sincronizado');
    if (resultado === 'error') toast('No se ha podido conectar con Google. Inténtalo de nuevo.');
    if (resultado === 'sin-permiso') toast('Falta el permiso del calendario: vuelve a conectar y, en la pantalla de Google, marca la casilla del calendario.');
    if (resultado === 'sin-configurar') toast('Falta configurar la conexión con Google en el servidor (ver instrucciones).');
  }, [resultado, toast]);

  const conectar = async () => {
    // Es una ruta del servidor (lleva a Google), no una página: se navega del todo.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- es una ruta del servidor, no una página
    if (modo !== 'demo') return location.assign(`${location.origin}/api/google/conectar`);
    await crear('integrations', { id: nuevoId(), provider: 'gcal', accountEmail: 'tu-cuenta@gmail.com', on_: true, lastSyncAt: ahoraISO(), lastError: '', createdAt: ahoraISO() });
    toast('En la demo la conexión es simulada: tus reuniones se marcan como sincronizadas');
  };
  const sincronizar = async () => {
    if (modo === 'demo') return toast('Sincronizado (simulado en la demo)');
    setOcupado(true);
    const r = await fetch('/api/google/sincronizar', { method: 'POST' })
      .then((x) => x.json())
      .catch(() => null);
    setOcupado(false);
    if (!r?.ok) return toast(r?.error ?? 'No se ha podido sincronizar');
    toast(`Sincronizado: ${r.subidas} reuniones enviadas a Google y ${r.bajadas} cambios traídos`);
    if (g) anadirLocal('integrations', { ...g, lastSyncAt: ahoraISO(), lastError: '' });
    if (r.bajadas) setTimeout(() => location.reload(), 800);
  };

  return (
    <section className="card">
      <div className="card-h">
        <h2>
          <Icono n="calendar" />
          Conexiones
        </h2>
      </div>
      <div className="pref" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <b>Google Calendar</b>
          <span>
            {g
              ? `Conectado con ${g.accountEmail || 'tu cuenta'}${g.lastSyncAt ? ` · sincronizado ${relativa(g.lastSyncAt.slice(0, 10), hoy).toLowerCase()}` : ''}`
              : 'Tus reuniones de nebúla aparecen en Google y las de Google en nebúla. Se sincroniza cada mañana y cuando pulses «Sincronizar».'}
          </span>
          {g?.lastError && (
            <span className="chip late" style={{ marginTop: 4 }}>
              {g.lastError}
            </span>
          )}
        </div>
        {g ? (
          <div className="r-actions">
            <button type="button" className="btn sm" disabled={ocupado} onClick={() => void sincronizar()}>
              <Icono n="repeat" />
              {ocupado ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <button type="button" className="btn sm ghost" onClick={() => void borrar('integrations', g.id, 'Google Calendar desconectado')}>
              Desconectar
            </button>
          </div>
        ) : (
          <button type="button" className="btn sm primary" onClick={() => void conectar()}>
            <Icono n="link" />
            Conectar
          </button>
        )}
      </div>
      <div className="pref">
        <div>
          <b>Gmail y Outlook</b>
          <span>Para más adelante: Google exige una auditoría de seguridad de pago para leer correo. Mientras, escribe desde «Escribir» en cada contacto.</span>
        </div>
        <span className="pill mist">Más adelante</span>
      </div>
    </section>
  );
}

/** Perfil → Tus datos: exportar a CSV, importar contactos, copia de seguridad y registro de protección de datos. */
export function TusDatos() {
  const { c, hoy, crearVarios } = useDatos();
  const { perfil, ajustes } = useNebula();
  const toast = useToast();
  const [importar, setImportar] = useState<Importacion | null>(null);

  const exportar = (que: Parameters<typeof exportarCsv>[1]) => {
    const r = exportarCsv(c, que);
    descargar(r.nombre, r.texto, 'text/csv');
  };
  const registro = [...c.rgpdLog].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <section className="card">
        <div className="card-h">
          <h2>
            <Icono n="download" />
            Tus datos
          </h2>
        </div>
        <div className="sec-lbl" style={{ marginTop: 0 }}>
          Exportar a Excel (CSV)
        </div>
        <div className="r-actions">
          {(
            [
              ['contactos', 'Contactos'],
              ['empresas', 'Empresas'],
              ['facturas', 'Facturas emitidas'],
              ['gastos', 'Gastos'],
              ['horas', 'Horas'],
            ] as const
          ).map(([k, l]) => (
            <button type="button" key={k} className="btn sm" onClick={() => exportar(k)}>
              <Icono n="download" />
              {l}
            </button>
          ))}
        </div>
        <div className="sec-lbl">Importar contactos</div>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 12.5 }}>
          Un CSV de Google Contacts, Outlook o Excel con columnas como Nombre, Email, Teléfono y Empresa. No se repiten los emails que ya tienes.
        </p>
        <label className="upload">
          <Icono n="plus" />
          Elegir archivo CSV
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Importar contactos desde CSV"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (f.size > 5 * 1024 * 1024) return toast('El archivo pesa más de 5 MB');
              const filas = leerCsv(await f.text());
              const r = importarContactos(filas, c, nuevoId, ahoraISO());
              if (!r.contacts.length) return toast(filas.length ? 'No hay contactos nuevos en ese archivo (¿tiene una columna «Nombre»?)' : 'El archivo está vacío');
              setImportar(r);
            }}
          />
        </label>
        <div className="sec-lbl">Copia de seguridad</div>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 12.5 }}>
          Descarga todo lo que tienes en nebúla en un solo archivo. Guárdalo en un lugar seguro: contiene datos personales de tus clientes (las contraseñas de los accesos no se incluyen).
        </p>
        <button
          type="button"
          className="btn sm"
          onClick={() =>
            descargar(`nebula-copia-${hoy}.json`, JSON.stringify(copiaDeSeguridad(c, { estudio: ajustes.business, persona: perfil.fullName }), null, 1), 'application/json')
          }
        >
          <Icono n="download" />
          Descargar copia completa
        </button>
      </section>
      <section className="card">
        <div className="card-h">
          <h2>
            <Icono n="shield" />
            Protección de datos <Ayuda k="rgpd" />
          </h2>
        </div>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 12.5 }}>
          Lo que has hecho cuando alguien te ha pedido sus datos o que los borres (desde su ficha de contacto: «Darle sus datos» y «Borrar sus datos»).
        </p>
        <div className="list">
          {registro.map((r) => (
            <div className="follow" key={r.id}>
              <span className="tl-ic mist">
                <Icono n="shield" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{r.action}</b>
                <div className="chip ajusta">{r.detail}</div>
              </div>
              <span className="chip">{relativa(r.date, hoy)}</span>
            </div>
          ))}
          {!registro.length && <div className="empty">Aún no hay solicitudes.</div>}
        </div>
      </section>
      {importar && (
        <Modal
          titulo="Importar contactos"
          alCerrar={() => setImportar(null)}
          ancho={520}
          comoFormulario={async () => {
            const ok = (await crearVarios('companies', importar.companies)) && (await crearVarios('contacts', importar.contacts));
            setImportar(null);
            if (ok) toast(`${importar.contacts.length} contactos importados. Recuerda apuntar su permiso de protección de datos.`);
          }}
          pie={
            <>
              <button type="button" className="btn ghost" onClick={() => setImportar(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Importar {importar.contacts.length}
              </button>
            </>
          }
        >
          <div className="modal-b block">
            <p style={{ margin: 0 }}>
              Se van a crear <b>{importar.contacts.length}</b> contactos
              {importar.companies.length ? (
                <>
                  {' '}
                  y <b>{importar.companies.length}</b> empresas nuevas
                </>
              ) : null}
              .
            </p>
            {(importar.repetidas > 0 || importar.saltadas > 0) && (
              <p className="muted" style={{ margin: 0 }}>
                {importar.repetidas > 0 && `${importar.repetidas} ya los tenías (mismo email). `}
                {importar.saltadas > 0 && `${importar.saltadas} filas sin nombre se saltan.`}
              </p>
            )}
            <div className="list">
              {importar.contacts.slice(0, 6).map((x) => (
                <div className="follow" key={x.id}>
                  <b style={{ flex: 1 }}>{x.name}</b>
                  <span className="chip">{x.email}</span>
                </div>
              ))}
              {importar.contacts.length > 6 && <div className="chip">y {importar.contacts.length - 6} más…</div>}
            </div>
            <div className="warn butter">Los contactos importados quedan sin permiso de protección de datos apuntado: regístralo antes de enviarles comunicaciones.</div>
          </div>
        </Modal>
      )}
    </>
  );
}
