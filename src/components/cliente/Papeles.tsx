import { ESTADOS_CONTRATO, TIPOS_CONTRATO, kpisDe } from '@/lib/catalogos/cliente';
import { CANALES } from '@/lib/catalogos/trabajo';
import type { Disciplina } from '@/lib/catalogos/disciplinas';
import type { Contrato, InformeMensual, Publicacion } from '@/lib/datos/entidades';
import { cambioKpi, etiquetaMes } from '@/lib/reglas/cliente';
import { fechaCorta, fechaLargaDe } from '@/lib/reglas/fechas';
import { horas } from '@/lib/reglas/trabajo';

export type Emisor = { legalName: string; nif: string; address: string; firmante?: string };
export type Para = { name: string; nif: string; address: string } | null;

/** El contrato como lo lee y firma el cliente: cláusulas numeradas, firmas y rastro de la firma. */
export function PapelContrato({ k, clausulas, emisor, para }: { k: Contrato; clausulas: [string, string][]; emisor: Emisor; para: Para }) {
  const st = ESTADOS_CONTRATO[k.status];
  return (
    <article className="paper">
      <div className="paper-h">
        <div>
          <h3>Contrato</h3>
          <div className="muted">{TIPOS_CONTRATO[k.type].label}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className={`pill ${st.cls}`}>{st.label}</span>
        </div>
      </div>
      <dl className="who">
        <div>
          <dt>De</dt>
          <dd>
            <b>{emisor.legalName || '—'}</b>
            <br />
            NIF {emisor.nif || '—'}
            <br />
            {emisor.address}
          </dd>
        </div>
        <div>
          <dt>Para</dt>
          <dd>
            {para ? (
              <>
                <b>{para.name}</b>
                {para.nif && (
                  <>
                    <br />
                    NIF {para.nif}
                  </>
                )}
                {para.address && (
                  <>
                    <br />
                    {para.address}
                  </>
                )}
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>
      <ol className="clauses">
        {clausulas.map(([t, x]) => (
          <li key={t}>
            <b>{t}</b>
            <p>{x}</p>
          </li>
        ))}
      </ol>
      <div className="sigs">
        <div>
          <span>Firma de {emisor.legalName.split(' (')[0]}</span>
          <b className="sig">{emisor.firmante || emisor.legalName}</b>
        </div>
        <div>
          <span>Firma del cliente</span>
          {k.status === 'firmado' ? (
            <>
              <b className="sig">{k.signedBy}</b>
              <small>Firmado electrónicamente el {fechaLargaDe(k.signedAt?.slice(0, 10) ?? null)}</small>
            </>
          ) : (
            <b className="sig pending">Pendiente</b>
          )}
        </div>
      </div>
      {k.status === 'firmado' && k.documentHash && k.documentHash !== 'ejemplo' && (
        <div className="muted" style={{ fontSize: 11.5, overflowWrap: 'anywhere' }}>
          Rastro de la firma: {new Date(k.signedAt ?? '').toLocaleString('es-ES')} · IP {k.signedIp || '—'} · {k.signedUserAgent || '—'}
          <br />
          Huella del documento firmado (SHA-256): {k.documentHash}
        </div>
      )}
      <p className="foot-note" style={{ margin: 0 }}>
        Plantilla orientativa. Revísala con un profesional antes de usarla con clientes.
      </p>
    </article>
  );
}

export type DatosInforme = InformeMensual & {
  iguala: { name: string; hours: number; discipline: Disciplina | null } | null;
  publicaciones: Pick<Publicacion, 'id' | 'title' | 'channel' | 'date'>[];
  minutos: number;
};

/** Informe mensual de una iguala con sus datos, lo publicado y las horas dedicadas (reportPaper del prototipo). */
export function PapelInforme({ rp, estudio, cliente, colorMarca }: { rp: DatosInforme; estudio: string; cliente: string; colorMarca?: string }) {
  const K = kpisDe(rp.iguala?.discipline ?? null);
  return (
    <article className="paper report">
      <div className="rep-band" style={{ background: colorMarca || 'var(--sage-strong)' }} />
      <div className="paper-h">
        <div>
          <div className="muted">
            {estudio} para {cliente}
          </div>
          <h3 style={{ textTransform: 'none', letterSpacing: 0 }}>Informe de {etiquetaMes(rp.month)}</h3>
          <div className="muted">{rp.iguala?.name}</div>
        </div>
      </div>
      <div className="kpis">
        {K.map(([k, l]) => {
          const v = rp.kpis[k];
          const ch = cambioKpi(v, rp.prev[k]);
          const bueno = k === 'coste' ? (ch ?? 0) < 0 : (ch ?? 0) > 0;
          return (
            <div className="kpi" key={k}>
              <span>{l}</span>
              <b className="num">{v !== undefined ? v.toLocaleString('es-ES') : '—'}</b>
              {ch !== null ? (
                <small className={bueno ? 'up' : 'down'}>
                  {ch > 0 ? '▲' : '▼'} {Math.abs(ch)} % vs. mes anterior
                </small>
              ) : (
                <small>Sin mes anterior</small>
              )}
            </div>
          );
        })}
      </div>
      {rp.summary && (
        <div>
          <div className="sec-lbl">Resumen del mes</div>
          <p style={{ margin: 0 }}>{rp.summary}</p>
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        <div>
          <div className="sec-lbl">Lo que hemos publicado · {rp.publicaciones.length}</div>
          {rp.publicaciones.map((p) => (
            <div className="ver" key={p.id}>
              <span className={`pill ${CANALES[p.channel].cls}`}>{CANALES[p.channel].label}</span>
              <span>{p.title}</span>
              <span className="chip">{fechaCorta(p.date)}</span>
            </div>
          ))}
          {!rp.publicaciones.length && (
            <p className="muted" style={{ margin: 0 }}>
              Sin publicaciones registradas.
            </p>
          )}
        </div>
        <div>
          <div className="sec-lbl">Horas dedicadas</div>
          <p style={{ margin: 0 }}>
            <b>{horas(rp.minutos)}</b> de {rp.iguala?.hours ?? 0} h incluidas en tu iguala.
          </p>
          {rp.next && (
            <>
              <div className="sec-lbl">El mes que viene</div>
              <p style={{ margin: 0 }}>{rp.next}</p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
