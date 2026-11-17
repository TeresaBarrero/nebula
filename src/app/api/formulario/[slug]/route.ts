import { TRAMOS_PRESUPUESTO } from '@/lib/catalogos/cliente';
import { esDisciplina } from '@/lib/catalogos/disciplinas';
import { alLlegarLead } from '@/lib/automatizaciones';
import { cargarEspacio, contextoServidor, dentroDeLimite, ejecutorServidor, espacioPorSlug, ipDe, json, origenDe, servicio } from '@/lib/servidor/espacio';

/** Datos públicos del formulario: nombre del estudio y disciplinas que ofrece. */
export async function GET(_req: Request, ctx: RouteContext<'/api/formulario/[slug]'>) {
  const { slug } = await ctx.params;
  const sb = servicio();
  if (!sb) return json({ error: 'No configurado' }, 503);
  const ws = await espacioPorSlug(sb, slug);
  const { data } = ws ? await sb.from('workspace_settings').select('business, legal_name, disciplines, lead_form_on').eq('workspace_id', ws).maybeSingle() : { data: null };
  if (!data?.lead_form_on) return json({ error: 'Este formulario no está disponible' }, 404);
  return json({ estudio: data.business || data.legal_name, disciplinas: (data.disciplines ?? []).filter(esDisciplina), tramos: TRAMOS_PRESUPUESTO });
}

/**
 * Llega un mensaje del formulario web (SPEC §6.21): campo trampa, tiempo mínimo, permiso obligatorio
 * y máx. 10 envíos por hora e IP. Crea contacto, empresa, oportunidad y la tarea de llamar (automatización «lead»).
 */
export async function POST(req: Request, ctx: RouteContext<'/api/formulario/[slug]'>) {
  const { slug } = await ctx.params;
  const sb = servicio();
  if (!sb) return json({ error: 'No configurado' }, 503);
  const ws = await espacioPorSlug(sb, slug);
  if (!ws) return json({ ok: false, mensaje: 'Este formulario no está disponible' }, 404);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const t = (k: string, max: number) => String(b?.[k] ?? '').trim().slice(0, max);
  // Los robots rellenan el campo oculto o envían en menos de 3 segundos: se les responde «ok» sin guardar nada.
  if (t('web', 200) || Date.now() - Number(b?.t ?? 0) < 3000) return json({ ok: true, mensaje: '¡Gracias! Te responderemos muy pronto.' });
  const nombre = t('nombre', 160);
  const email = t('email', 200).toLowerCase();
  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, mensaje: 'Escribe tu nombre y un email válido' }, 400);
  if (b?.acepta !== true) return json({ ok: false, mensaje: 'Hay que aceptar la protección de datos' }, 400);
  if (!(await dentroDeLimite(sb, 'formulario', ipDe(req), 10))) return json({ ok: false, mensaje: 'Demasiados envíos seguidos. Inténtalo dentro de un rato.' }, 429);
  const { c, ajustes } = await cargarEspacio(sb, ws);
  if (!ajustes.leadFormOn) return json({ ok: false, mensaje: 'Este formulario no está disponible' }, 404);
  const disc = t('disciplina', 30);
  const tramo = Number(b?.presupuesto);
  const id = await alLlegarLead(
    {
      nombre, email, empresa: t('empresa', 200), telefono: t('telefono', 40), mensaje: t('mensaje', 3000),
      disciplina: esDisciplina(disc) ? disc : (ajustes.disciplines[0] ?? 'grafico'),
      presupuesto: TRAMOS_PRESUPUESTO.some(([v]) => v === tramo) ? tramo : TRAMOS_PRESUPUESTO[1][0],
    },
    contextoServidor(sb, ws, c, ajustes, origenDe(req)),
    ejecutorServidor(sb, ws, c),
  );
  return id ? json({ ok: true, mensaje: '¡Gracias! Te responderemos muy pronto.' }) : json({ ok: false, mensaje: 'No se ha podido enviar. Inténtalo de nuevo.' }, 500);
}
