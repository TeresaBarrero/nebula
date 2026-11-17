import { correos } from '@/lib/automatizaciones';
import { crearEnlacePortal, dentroDeLimite, enviarCorreo, ipDe, json, origenDe, servicio } from '@/lib/servidor/espacio';

/**
 * «Pedir un enlace nuevo»: si el email es de un contacto con empresa, se le manda el enlace a ESE email.
 * La respuesta es siempre la misma (no revela si el email existe). Máx. 5 peticiones por hora e IP.
 */
export async function POST(req: Request) {
  const sb = servicio();
  if (!sb) return json({ error: 'No configurado' }, 503);
  const b = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = String(b?.email ?? '').trim().toLowerCase().slice(0, 200);
  const respuesta = json({ ok: true, mensaje: 'Si ese email está en nuestra agenda, te llegará un enlace en unos minutos.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, mensaje: 'Escribe un email válido' }, 400);
  if (!(await dentroDeLimite(sb, 'acceso', ipDe(req), 5))) return respuesta;
  const { data: personas } = await sb.from('contacts').select('id, name, workspace_id, company_id').ilike('email', email).not('company_id', 'is', null).limit(5);
  for (const p of personas ?? []) {
    const { data: aj } = await sb.from('workspace_settings').select('business, legal_name').eq('workspace_id', p.workspace_id).maybeSingle();
    const estudio = aj?.business || aj?.legal_name || 'tu estudio';
    const enlace = await crearEnlacePortal(sb, p.workspace_id, p.company_id!, p.id, origenDe(req));
    if (enlace) await enviarCorreo(sb, p.workspace_id, { to: email, ...correos.portal(p.name, estudio, enlace), kind: 'portal', contactId: p.id, companyId: p.company_id });
  }
  return respuesta;
}
