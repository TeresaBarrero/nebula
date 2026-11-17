import { enviarCorreo, espacioDeSesion, json, servicio } from '@/lib/servidor/espacio';

/** Envía un correo desde la app (portal, contrato, informe…). Solo para personas con sesión y cuenta aprobada. */
export async function POST(req: Request) {
  const sesion = await espacioDeSesion();
  if (!sesion) return json({ error: 'Sin sesión' }, 401);
  const sb = servicio();
  if (!sb) return json({ error: 'Falta configurar el servidor (SUPABASE_SECRET_KEY)' }, 503);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const texto = (k: string, max: number) => String(b?.[k] ?? '').slice(0, max);
  const to = texto('to', 300).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !texto('subject', 300).trim()) return json({ error: 'Faltan datos del correo' }, 400);
  // Los enlaces a contactos o empresas tienen que ser de tu espacio.
  const id = (k: string) => (typeof b?.[k] === 'string' && b[k] ? String(b[k]) : null);
  for (const [tabla, k] of [['contacts', 'contactId'], ['companies', 'companyId']] as const) {
    const v = id(k);
    if (v) {
      const { data } = await sb.from(tabla).select('id').eq('id', v).eq('workspace_id', sesion.ws).maybeSingle();
      if (!data) return json({ error: 'No se encuentra' }, 404);
    }
  }
  const fila = await enviarCorreo(sb, sesion.ws, { to, subject: texto('subject', 300), body: texto('body', 20000), kind: texto('kind', 40) || 'otro', contactId: id('contactId'), companyId: id('companyId') }, sesion.email);
  return fila ? json(fila) : json({ error: 'No se ha podido guardar' }, 500);
}
