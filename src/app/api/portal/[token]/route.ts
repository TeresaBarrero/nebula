import { accionPortal } from '@/lib/portal';
import { datosPortal, hoyMadrid } from '@/lib/reglas/cliente';
import { cargarEspacio, contextoServidor, ejecutorServidor, ipDe, json, leerEnlace, origenDe, servicio } from '@/lib/servidor/espacio';

const stripeActivo = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Lo que ve el cliente en su portal: SOLO los datos de su empresa. */
export async function GET(req: Request, ctx: RouteContext<'/api/portal/[token]'>) {
  const { token } = await ctx.params;
  const sb = servicio();
  if (!sb) return json({ error: 'El portal aún no está configurado' }, 503);
  const e = await leerEnlace(sb, token);
  if (!e) return json({ error: 'Este enlace no es válido o ha caducado. Pide uno nuevo.' }, 404);
  const { c, ajustes } = await cargarEspacio(sb, e.ws);
  const d = datosPortal(c, e.companyId, ajustes, hoyMadrid());
  if (!d) return json({ error: 'No se encuentra tu portal' }, 404);
  return json({ d, hoy: hoyMadrid(), pagoOnline: stripeActivo() && ajustes.payOnline.card, pagado: new URL(req.url).searchParams.get('pagado') === '1' });
}

/** Acciones del cliente: firmar, briefing, aprobar, pedir cambios, responder a un presupuesto o pagar. */
export async function POST(req: Request, ctx: RouteContext<'/api/portal/[token]'>) {
  const { token } = await ctx.params;
  const sb = servicio();
  if (!sb) return json({ error: 'El portal aún no está configurado' }, 503);
  const e = await leerEnlace(sb, token);
  if (!e) return json({ ok: false, mensaje: 'Este enlace no es válido o ha caducado. Pide uno nuevo.' }, 404);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.tipo !== 'string' || typeof b.id !== 'string') return json({ ok: false, mensaje: 'Petición no válida' }, 400);
  const { c, ajustes } = await cargarEspacio(sb, e.ws);
  const origen = origenDe(req);

  if (b.tipo === 'pagar') return pagar(sb, e, c, ajustes, String(b.id), token, origen);

  const accion =
    b.tipo === 'firmar'
      ? { tipo: 'firmar' as const, id: b.id, nombre: String(b.nombre ?? ''), acepta: b.acepta === true }
      : b.tipo === 'brief'
        ? { tipo: 'brief' as const, id: b.id, respuestas: (b.respuestas && typeof b.respuestas === 'object' ? b.respuestas : {}) as Record<string, string> }
        : b.tipo === 'aprobar'
          ? { tipo: 'aprobar' as const, id: b.id }
          : b.tipo === 'cambios'
            ? { tipo: 'cambios' as const, id: b.id, texto: String(b.texto ?? '').slice(0, 1000) }
            : b.tipo === 'presupuesto'
              ? { tipo: 'presupuesto' as const, id: b.id, acepta: b.acepta === true }
              : null;
  if (!accion) return json({ ok: false, mensaje: 'Acción no válida' }, 400);
  const r = await accionPortal(accion, e.companyId, contextoServidor(sb, e.ws, c, ajustes, origen), ejecutorServidor(sb, e.ws, c), {
    ip: ipDe(req),
    navegador: req.headers.get('user-agent') ?? '',
  });
  return json(r, r.ok ? 200 : 400);
}

/** Crea el pago con tarjeta en Stripe (modo pruebas mientras no se active el modo real). */
async function pagar(
  sb: NonNullable<ReturnType<typeof servicio>>,
  e: { ws: string; companyId: string },
  c: Awaited<ReturnType<typeof cargarEspacio>>['c'],
  ajustes: Awaited<ReturnType<typeof cargarEspacio>>['ajustes'],
  facturaId: string,
  token: string,
  origen: string,
) {
  const clave = process.env.STRIPE_SECRET_KEY;
  if (!clave || !ajustes.payOnline.card) return json({ ok: false, mensaje: 'El pago con tarjeta no está disponible. Puedes pagar por transferencia.' }, 400);
  const d = datosPortal(c, e.companyId, ajustes, hoyMadrid());
  const f = d?.facturas.find((x) => x.id === facturaId && x.pending > 0);
  if (!f) return json({ ok: false, mensaje: 'Esta factura ya no está pendiente' }, 400);
  const cuerpo = new URLSearchParams({
    mode: 'payment',
    success_url: `${origen}/portal/${token}?pagado=1`,
    cancel_url: `${origen}/portal/${token}`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(Math.round(f.pending * 100)),
    'line_items[0][price_data][product_data][name]': `Factura ${f.number} · ${ajustes.business || ajustes.legalName}`.slice(0, 250),
    'metadata[workspace]': e.ws,
    'metadata[invoice]': f.id,
    'payment_intent_data[metadata][workspace]': e.ws,
    'payment_intent_data[metadata][invoice]': f.id,
  });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: cuerpo,
  });
  const s = (await r.json().catch(() => null)) as { url?: string } | null;
  if (!r.ok || !s?.url) return json({ ok: false, mensaje: 'No se ha podido abrir el pago. Inténtalo de nuevo o paga por transferencia.' }, 502);
  void sb;
  return json({ ok: true, mensaje: '', url: s.url });
}
