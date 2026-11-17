import { huecoLibre, huecosReserva, hoyMadrid } from '@/lib/reglas/cliente';
import { fechaLargaDe } from '@/lib/reglas/fechas';
import { reservasDesde } from '@/lib/datos/almacen-nube';
import { dentroDeLimite, enviarCorreo, espacioPorSlug, ipDe, json, servicio } from '@/lib/servidor/espacio';

async function datos(slug: string) {
  const sb = servicio();
  if (!sb) return null;
  const ws = await espacioPorSlug(sb, slug);
  if (!ws) return null;
  const { data: aj } = await sb.from('workspace_settings').select('business, legal_name, booking').eq('workspace_id', ws).maybeSingle();
  const b = reservasDesde(aj?.booking);
  if (!b.on) return null;
  // Solo fecha y hora de las reuniones: nunca su título ni con quién (privacidad).
  const { data: ev } = await sb.from('events').select('date, time').eq('workspace_id', ws).gte('date', hoyMadrid());
  return { sb, ws, b, estudio: aj?.business || aj?.legal_name || '', eventos: (ev ?? []) as { date: string; time: string }[] };
}

/** Huecos libres de la página de reservas (SPEC §6.18). */
export async function GET(_req: Request, ctx: RouteContext<'/api/reservar/[slug]'>) {
  const { slug } = await ctx.params;
  const d = await datos(slug);
  if (!d) return json({ error: 'Esta página de reservas no está disponible' }, 404);
  return json({ estudio: d.estudio, duracion: d.b.duration, huecos: huecosReserva(d.b, d.eventos, hoyMadrid()) });
}

/** Reserva un hueco: crea la reunión (origen «reserva») y el contacto con su permiso. */
export async function POST(req: Request, ctx: RouteContext<'/api/reservar/[slug]'>) {
  const { slug } = await ctx.params;
  const d = await datos(slug);
  if (!d) return json({ ok: false, mensaje: 'Esta página de reservas no está disponible' }, 404);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const t = (k: string, max: number) => String(b?.[k] ?? '').trim().slice(0, max);
  if (t('web', 200)) return json({ ok: true, mensaje: 'Reserva confirmada' });
  const nombre = t('nombre', 160);
  const email = t('email', 200).toLowerCase();
  const fecha = t('fecha', 10);
  const hora = t('hora', 5);
  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, mensaje: 'Escribe tu nombre y un email válido' }, 400);
  if (b?.acepta !== true) return json({ ok: false, mensaje: 'Hay que aceptar la protección de datos' }, 400);
  if (!(await dentroDeLimite(d.sb, 'reserva', ipDe(req), 5))) return json({ ok: false, mensaje: 'Demasiadas reservas seguidas. Inténtalo dentro de un rato.' }, 429);
  if (!huecoLibre(d.b, d.eventos, hoyMadrid(), fecha, hora)) return json({ ok: false, mensaje: 'Ese hueco ya no está libre. Elige otro.' }, 409);
  const hoy = hoyMadrid();
  const { data: ya } = await d.sb.from('contacts').select('id').eq('workspace_id', d.ws).ilike('email', email).maybeSingle();
  let contactId = ya?.id ?? null;
  if (!contactId) {
    const { data: nuevo } = await d.sb
      .from('contacts')
      .insert({ workspace_id: d.ws, name: nombre, email, status: 'potencial', tags: ['reserva'], consent: true, consent_date: hoy, consent_via: 'Formulario web' })
      .select('id')
      .single();
    contactId = nuevo?.id ?? null;
  }
  const motivo = t('motivo', 300);
  const { error } = await d.sb.from('events').insert({ workspace_id: d.ws, title: `Reserva: ${nombre}${motivo ? ` · ${motivo}` : ''}`.slice(0, 200), date: fecha, time: hora, contact_id: contactId, source: 'reserva' });
  if (error) return json({ ok: false, mensaje: 'No se ha podido reservar. Inténtalo de nuevo.' }, 500);
  await enviarCorreo(d.sb, d.ws, {
    to: email, kind: 'reserva', contactId, companyId: null,
    subject: `Reunión reservada con ${d.estudio}: ${fechaLargaDe(fecha)} a las ${hora}`,
    body: `Hola ${nombre.split(' ')[0]}:\n\nTu reunión de ${d.b.duration} minutos queda reservada para el ${fechaLargaDe(fecha)} a las ${hora}.${motivo ? `\n\nMotivo: ${motivo}` : ''}\n\nSi no puedes venir, responde a este correo.\n\nUn saludo,\n${d.estudio}`,
  });
  return json({ ok: true, mensaje: `¡Reservado! Te esperamos el ${fechaLargaDe(fecha)} a las ${hora}. Te hemos enviado la confirmación por correo.` });
}
