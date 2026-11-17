-- nebúla · Fase 5 · Integraciones y cierre
-- Registro de protección de datos (RGPD), borrado de los datos de un contacto de una sola vez
-- y conexión con Google Calendar (permiso guardado cifrado, como las contraseñas de los accesos).

-- ───────────────────────── RGPD ─────────────────────────
-- El registro NO guarda datos personales de la persona tras un borrado.
create table public.rgpd_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  date date not null default current_date,
  action text not null check (char_length(action) between 1 and 80),
  detail text not null default '' check (char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
alter table public.rgpd_log enable row level security;
revoke all on public.rgpd_log from anon, authenticated;
grant select, insert on public.rgpd_log to authenticated;
create policy "Ves lo de tu espacio" on public.rgpd_log for select to authenticated using (public.is_member(workspace_id));
create policy "Creas en tu espacio" on public.rgpd_log for insert to authenticated with check (public.is_member(workspace_id));
create trigger rgpd_log_updated_at before update on public.rgpd_log for each row execute function public.set_updated_at();

-- «Borrar sus datos» (SPEC §7.12): borra ficha, apuntes, reuniones, notas, documentos, correos y enlaces del portal;
-- desvincula tareas, oportunidades, gastos, facturas y contratos (las facturas se conservan por obligación legal,
-- sin vínculo con la persona). Todo o nada. Devuelve las rutas de los archivos para borrarlos del almacén.
create or replace function public.borrar_datos_contacto(p_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  rutas text[];
begin
  select workspace_id into ws from public.contacts where id = p_id;
  if ws is null or not public.is_member(ws) then
    raise exception 'No se encuentra el contacto' using errcode = 'P0002';
  end if;
  select coalesce(array_agg(storage_path) filter (where storage_path <> ''), '{}') into rutas from public.files where contact_id = p_id;
  delete from public.activities where contact_id = p_id;
  delete from public.events where contact_id = p_id;
  delete from public.notes where contact_id = p_id;
  delete from public.files where contact_id = p_id;
  delete from public.outgoing_emails where contact_id = p_id;
  delete from public.portal_tokens where contact_id = p_id;
  -- El resto (tareas, oportunidades, gastos, facturas, contratos, proyectos) se desvincula solo al borrar la ficha.
  delete from public.contacts where id = p_id;
  insert into public.rgpd_log (workspace_id, action, detail)
  values (ws, 'Borrado de datos', 'Se borraron los datos de una persona a petición suya. Sus facturas se conservan sin vínculo con ella.');
  return rutas;
end;
$$;
revoke execute on function public.borrar_datos_contacto(uuid) from public, anon;
grant execute on function public.borrar_datos_contacto(uuid) to authenticated;

-- ───────────────────────── Google Calendar ─────────────────────────
alter table public.events add column google_event_id text check (google_event_id is null or char_length(google_event_id) <= 300);
create unique index events_google_unico on public.events (workspace_id, google_event_id) where google_event_id is not null;

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider text not null check (provider in ('gcal')),
  account_email text not null default '' check (char_length(account_email) <= 200),
  -- Permiso de Google (refresh token), cifrado. Solo lo descifra el servidor.
  token_enc bytea,
  on_ boolean not null default true,
  last_sync_at timestamptz,
  last_error text not null default '' check (char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, provider)
);
alter table public.integrations enable row level security;
revoke all on public.integrations from anon, authenticated;
grant select (id, workspace_id, provider, account_email, on_, last_sync_at, last_error, created_at, updated_at) on public.integrations to authenticated;
grant delete on public.integrations to authenticated;
create policy "Ves lo de tu espacio" on public.integrations for select to authenticated using (public.is_member(workspace_id));
create policy "Borras lo de tu espacio" on public.integrations for delete to authenticated using (public.is_member(workspace_id));
create trigger integrations_updated_at before update on public.integrations for each row execute function public.set_updated_at();

-- Solo el servidor (clave de servicio) guarda y lee el permiso de Google.
create or replace function public.guardar_integracion(p_ws uuid, p_provider text, p_email text, p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.integrations (workspace_id, provider, account_email, token_enc, on_, last_error)
  values (p_ws, p_provider, coalesce(p_email, ''), extensions.pgp_sym_encrypt(p_token, public.clave_accesos()), true, '')
  on conflict (workspace_id, provider) do update
    set account_email = excluded.account_email, token_enc = excluded.token_enc, on_ = true, last_error = '';
end;
$$;

create or replace function public.leer_integracion(p_ws uuid, p_provider text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select extensions.pgp_sym_decrypt(token_enc, public.clave_accesos())
  from public.integrations where workspace_id = p_ws and provider = p_provider and on_ and token_enc is not null;
$$;

revoke execute on function public.guardar_integracion(uuid, text, text, text), public.leer_integracion(uuid, text) from public, anon, authenticated;
grant execute on function public.guardar_integracion(uuid, text, text, text), public.leer_integracion(uuid, text) to service_role;
