import { avisoInteres, limpiarInteres, validarInteres, type DatosInteres } from '@/lib/reglas/interesados';
import { dentroDeLimite, ipDe, json, servicio } from '@/lib/servidor/espacio';

/**
 * «Me interesa»: guarda a la persona en la lista de interesados y avisa por correo a quien administra.
 * Si el email ya estaba apuntado, se actualizan sus datos. Máx. 5 envíos por hora e IP.
 */
export async function POST(req: Request) {
  const sb = servicio();
  if (!sb) return json({ ok: false, errores: { general: 'Ahora mismo no podemos guardar tus datos. Inténtalo más tarde.' } }, 503);
  const b = ((await req.json().catch(() => null)) ?? {}) as Partial<Record<keyof DatosInteres, unknown>>;
  const d: DatosInteres = {
    name: String(b.name ?? ''),
    email: String(b.email ?? ''),
    discipline: String(b.discipline ?? ''),
    kind: String(b.kind ?? ''),
    comment: String(b.comment ?? ''),
    acepta: b.acepta === true,
    trampa: String(b.trampa ?? ''),
    tiempo: Number(b.tiempo) || 0,
  };
  const errores = validarInteres(d);
  if (Object.keys(errores).length) return json({ ok: false, errores }, 400);
  if (!(await dentroDeLimite(sb, 'interes', ipDe(req), 5)))
    return json({ ok: false, errores: { general: 'Has enviado el formulario muchas veces. Prueba dentro de un rato.' } }, 429);

  const i = limpiarInteres(d);
  // El email se guarda siempre en minúsculas (y la base de datos no deja repetirlo).
  const { data: ya } = await sb.from('interesados').select('id').eq('email', i.email).maybeSingle();
  const ahora = new Date().toISOString();
  const { error } = ya
    ? await sb.from('interesados').update({ ...i, privacy_accepted_at: ahora }).eq('id', ya.id)
    : await sb.from('interesados').insert({ ...i, privacy_accepted_at: ahora });
  if (error) return json({ ok: false, errores: { general: 'No hemos podido guardar tus datos. Inténtalo de nuevo.' } }, 500);

  await avisarAdmins(sb, avisoInteres(i), i.email);
  return json({ ok: true });
}

async function avisarAdmins(sb: NonNullable<ReturnType<typeof servicio>>, m: { subject: string; body: string }, responderA: string) {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return;
  const { data: admins } = await sb.from('app_admins').select('user_id');
  const ids = (admins ?? []).map((a) => a.user_id);
  if (!ids.length) return;
  const { data: perfiles } = await sb.from('profiles').select('email').in('id', ids);
  const para = (perfiles ?? []).map((p) => p.email).filter(Boolean);
  if (!para.length) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'nebúla <onboarding@resend.dev>', to: para, subject: m.subject, text: m.body, reply_to: responderA }),
  }).catch(() => null);
}
