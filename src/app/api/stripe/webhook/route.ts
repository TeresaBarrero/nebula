import { createHmac, timingSafeEqual } from 'node:crypto';
import { hoyMadrid } from '@/lib/reglas/cliente';
import { json, servicio } from '@/lib/servidor/espacio';

/** Comprueba que el aviso viene de Stripe (firma «Stripe-Signature» con el secreto del webhook, máx. 5 min). */
function firmaValida(cuerpo: string, cabecera: string, secreto: string): boolean {
  const partes = Object.fromEntries(cabecera.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(partes.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const esperada = createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex');
  return cabecera
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .some((p) => {
      const v = Buffer.from(p.slice(3), 'hex');
      const e = Buffer.from(esperada, 'hex');
      return v.length === e.length && timingSafeEqual(v, e);
    });
}

/** Stripe avisa de un pago completado → se apunta el pago en la factura (una sola vez). */
export async function POST(req: Request) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  const sb = servicio();
  if (!secreto || !sb) return json({ error: 'No configurado' }, 503);
  const cuerpo = await req.text();
  if (!firmaValida(cuerpo, req.headers.get('stripe-signature') ?? '', secreto)) return json({ error: 'Firma no válida' }, 400);
  const ev = JSON.parse(cuerpo) as { type: string; data: { object: { id: string; payment_status?: string; amount_total?: number; metadata?: Record<string, string> } } };
  if (ev.type !== 'checkout.session.completed') return json({ recibido: true });
  const s = ev.data.object;
  const ws = s.metadata?.workspace;
  const factura = s.metadata?.invoice;
  if (s.payment_status !== 'paid' || !ws || !factura || !s.amount_total) return json({ recibido: true });
  const { data: f } = await sb.from('invoices').select('id').eq('id', factura).eq('workspace_id', ws).maybeSingle();
  if (!f) return json({ recibido: true });
  // external_ref es único: si Stripe repite el aviso, no se apunta dos veces.
  const { error } = await sb.from('payments').insert({ workspace_id: ws, invoice_id: factura, amount: s.amount_total / 100, method: 'Tarjeta (online)', date: hoyMadrid(), external_ref: s.id });
  if (error && error.code !== '23505') return json({ error: 'No se ha podido apuntar' }, 500);
  return json({ recibido: true });
}
