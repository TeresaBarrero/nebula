import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Id } from '@/lib/datos/entidades';
import { hoyMadrid } from '@/lib/reglas/cliente';
import { sumarDias } from '@/lib/reglas/fechas';

/** Google Calendar (SPEC §4.18): necesita GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET (proyecto de Google Cloud). */
export const googleConfigurado = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.SUPABASE_SECRET_KEY);
const ALCANCE = 'openid email https://www.googleapis.com/auth/calendar.events';
const ZONA = 'Europe/Madrid';

/** «state» firmado para que nadie pueda conectar su Google a un espacio ajeno. */
export function firmarEstado(ws: Id): string {
  const ts = Date.now().toString(36);
  const firma = createHmac('sha256', process.env.SUPABASE_SECRET_KEY!).update(`${ws}.${ts}`).digest('base64url');
  return `${ws}.${ts}.${firma}`;
}
export function leerEstado(estado: string): Id | null {
  const [ws, ts, firma] = estado.split('.');
  if (!ws || !ts || !firma || Date.now() - parseInt(ts, 36) > 15 * 60_000) return null;
  const esperada = createHmac('sha256', process.env.SUPABASE_SECRET_KEY!).update(`${ws}.${ts}`).digest('base64url');
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b) ? ws : null;
}

export function urlAutorizacion(origen: string, ws: Id): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: `${origen}/api/google/callback`, response_type: 'code',
    scope: ALCANCE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: firmarEstado(ws),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/** Cambia el código de Google por el permiso duradero (refresh token) y el email de la cuenta. */
export async function canjearCodigo(codigo: string, origen: string): Promise<{ refresh: string; email: string } | null> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: codigo, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: `${origen}/api/google/callback`, grant_type: 'authorization_code' }),
  });
  const j = (await r.json().catch(() => null)) as { refresh_token?: string; id_token?: string } | null;
  if (!r.ok || !j?.refresh_token) return null;
  let email = '';
  try {
    email = JSON.parse(Buffer.from((j.id_token ?? '').split('.')[1] ?? '', 'base64url').toString()).email ?? '';
  } catch {}
  return { refresh: j.refresh_token, email };
}

async function accesoTemporal(refresh: string): Promise<string | null> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refresh, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }),
  });
  const j = (await r.json().catch(() => null)) as { access_token?: string } | null;
  return r.ok ? (j?.access_token ?? null) : null;
}

type EventoGoogle = { id: string; status?: string; summary?: string; start?: { date?: string; dateTime?: string }; extendedProperties?: { private?: Record<string, string> } };
const masUnaHora = (h: string) => `${String(Math.min(23, Number(h.slice(0, 2)) + 1)).padStart(2, '0')}:${h.slice(3, 5)}`;
const cuerpo = (e: { title: string; date: string; time: string; id: string }) => ({
  summary: e.title,
  start: e.time ? { dateTime: `${e.date}T${e.time}:00`, timeZone: ZONA } : { date: e.date },
  end: e.time ? { dateTime: `${e.date}T${masUnaHora(e.time)}:00`, timeZone: ZONA } : { date: sumarDias(e.date, 1) },
  extendedProperties: { private: { nebula: e.id } },
});
/** Fecha y hora de Madrid de un evento de Google. */
function fechaHora(g: EventoGoogle): { date: string; time: string } | null {
  if (g.start?.date) return { date: g.start.date, time: '' };
  if (!g.start?.dateTime) return null;
  const d = new Date(g.start.dateTime);
  const p = Object.fromEntries(new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/**
 * Sincroniza en los dos sentidos (de 7 días atrás a 60 días adelante):
 * · nebúla → Google: reuniones creadas en nebúla (se crean o se actualizan).
 * · Google → nebúla: eventos de Google que no vienen de nebúla (origen «google»); si se borran allí, se borran aquí.
 */
export async function sincronizar(sb: SupabaseClient, ws: Id): Promise<{ ok: boolean; subidas: number; bajadas: number; error?: string }> {
  const { data: refresh } = await sb.rpc('leer_integracion', { p_ws: ws, p_provider: 'gcal' });
  if (!refresh) return { ok: false, subidas: 0, bajadas: 0, error: 'Google Calendar no está conectado' };
  const fallo = async (error: string) => {
    await sb.from('integrations').update({ last_error: error.slice(0, 500) }).eq('workspace_id', ws).eq('provider', 'gcal');
    return { ok: false, subidas: 0, bajadas: 0, error };
  };
  const token = await accesoTemporal(String(refresh));
  if (!token) return fallo('Google ha retirado el permiso. Vuelve a conectar tu calendario.');
  const api = (ruta: string, init: RequestInit = {}) =>
    fetch(`https://www.googleapis.com/calendar/v3/calendars/primary${ruta}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const hoy = hoyMadrid();
  const desde = sumarDias(hoy, -7);
  const { data: propias } = await sb.from('events').select('id, title, date, time, source, google_event_id').eq('workspace_id', ws).gte('date', desde).lte('date', sumarDias(hoy, 60));
  let subidas = 0;
  let bajadas = 0;
  for (const e of (propias ?? []).filter((x) => x.source !== 'google')) {
    const r = e.google_event_id ? await api(`/events/${encodeURIComponent(e.google_event_id)}`, { method: 'PATCH', body: JSON.stringify(cuerpo(e)) }) : await api('/events', { method: 'POST', body: JSON.stringify(cuerpo(e)) });
    if (!r.ok) continue;
    if (!e.google_event_id) {
      const g = (await r.json()) as EventoGoogle;
      await sb.from('events').update({ google_event_id: g.id }).eq('id', e.id).eq('workspace_id', ws);
    }
    subidas++;
  }
  const q = new URLSearchParams({ timeMin: `${desde}T00:00:00Z`, timeMax: `${sumarDias(hoy, 61)}T00:00:00Z`, singleEvents: 'true', showDeleted: 'true', maxResults: '250' });
  const r = await api(`/events?${q}`);
  if (!r.ok) return fallo('No se ha podido leer tu Google Calendar.');
  const items = ((await r.json()) as { items?: EventoGoogle[] }).items ?? [];
  const deGoogle = new Map((propias ?? []).filter((x) => x.google_event_id).map((x) => [x.google_event_id as string, x]));
  for (const g of items) {
    if (g.extendedProperties?.private?.nebula) continue; // viene de nebúla
    const ya = deGoogle.get(g.id);
    if (g.status === 'cancelled') {
      if (ya?.source === 'google') {
        await sb.from('events').delete().eq('id', ya.id).eq('workspace_id', ws);
        bajadas++;
      }
      continue;
    }
    const fh = fechaHora(g);
    if (!fh) continue;
    const fila = { title: (g.summary || 'Evento de Google').slice(0, 200), date: fh.date, time: fh.time };
    if (ya) {
      if (ya.source === 'google' && (ya.title !== fila.title || ya.date !== fila.date || ya.time !== fila.time)) {
        await sb.from('events').update(fila).eq('id', ya.id).eq('workspace_id', ws);
        bajadas++;
      }
    } else {
      await sb.from('events').insert({ ...fila, workspace_id: ws, source: 'google', google_event_id: g.id });
      bajadas++;
    }
  }
  await sb.from('integrations').update({ last_sync_at: new Date().toISOString(), last_error: '' }).eq('workspace_id', ws).eq('provider', 'gcal');
  return { ok: true, subidas, bajadas };
}
