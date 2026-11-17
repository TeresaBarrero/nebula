import { crearEnlacePortal, espacioDeSesion, json, origenDe, servicio } from '@/lib/servidor/espacio';

/** Crea un enlace mágico al portal de una empresa de tu espacio (30 días). */
export async function POST(req: Request) {
  const sesion = await espacioDeSesion();
  if (!sesion) return json({ error: 'Sin sesión' }, 401);
  const sb = servicio();
  if (!sb) return json({ error: 'Falta configurar el servidor (SUPABASE_SECRET_KEY)' }, 503);
  const b = (await req.json().catch(() => null)) as { companyId?: string; contactId?: string | null } | null;
  if (!b?.companyId) return json({ error: 'Falta la empresa' }, 400);
  const { data: empresa } = await sb.from('companies').select('id').eq('id', b.companyId).eq('workspace_id', sesion.ws).maybeSingle();
  if (!empresa) return json({ error: 'No se encuentra la empresa' }, 404);
  let contactId: string | null = null;
  if (b.contactId) {
    const { data: p } = await sb.from('contacts').select('id').eq('id', b.contactId).eq('workspace_id', sesion.ws).eq('company_id', b.companyId).maybeSingle();
    contactId = p?.id ?? null;
  }
  const url = await crearEnlacePortal(sb, sesion.ws, b.companyId, contactId, origenDe(req));
  return url ? json({ url }) : json({ error: 'No se ha podido crear el enlace' }, 500);
}
