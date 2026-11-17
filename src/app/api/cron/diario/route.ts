import { tareasDiarias } from '@/lib/automatizaciones';
import { sincronizar } from '@/lib/servidor/google';
import { cargarEspacio, contextoServidor, ejecutorServidor, json, servicio } from '@/lib/servidor/espacio';

/**
 * Tarea de cada mañana (Vercel Cron, ver vercel.json): recordatorios de pago, toques por entregables
 * facturas de igualas y sincronización con Google Calendar en todos los espacios. Protegida con CRON_SECRET.
 */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get('authorization') !== `Bearer ${secreto}`) return json({ error: 'No autorizado' }, 401);
  const sb = servicio();
  if (!sb) return json({ error: 'No configurado' }, 503);
  const origen = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const { data: espacios } = await sb.from('workspaces').select('id');
  const resumen: Record<string, unknown> = {};
  for (const { id } of espacios ?? []) {
    try {
      const { c, ajustes } = await cargarEspacio(sb, id);
      if (!ajustes.onboarded) continue;
      resumen[id] = await tareasDiarias(contextoServidor(sb, id, c, ajustes, origen), ejecutorServidor(sb, id, c));
      // Google Calendar, si está conectado.
      if (c.integrations.some((i) => i.provider === 'gcal')) await sincronizar(sb, id);
    } catch (e) {
      resumen[id] = { error: String(e).slice(0, 200) };
    }
  }
  // Limpieza: límites de peticiones de hace más de un día.
  await sb.from('rate_limits').delete().lt('at', new Date(Date.now() - 864e5).toISOString());
  return json({ ok: true, resumen });
}
