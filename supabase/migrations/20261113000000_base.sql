-- nebúla · Fase 0 · Base
-- Espacios de trabajo, perfiles, ajustes del negocio, administración y aprobación de cuentas.
-- Seguridad: RLS en todas las tablas. Solo los miembros aprobados de un espacio ven sus datos.

-- ───────────────────────── Utilidades ─────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── Tablas ─────────────────────────

-- Perfil de cada persona con cuenta (uno por usuario; no cuelga de un espacio porque
-- en el futuro una persona podrá pertenecer a varios).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  name text not null default '' check (char_length(name) <= 60),
  role text not null default '' check (char_length(role) <= 120),
  email text not null default '',
  phone text not null default '' check (char_length(phone) <= 40),
  prefs jsonb not null default '{"theme":"system","compact":false}'::jsonb,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  privacy_accepted_at timestamptz,
  -- Respuestas del asistente traídas desde la demo (se validan en la app antes de usarse).
  signup_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quién administra nebúla (aprueba cuentas). Solo se añade desde el panel de Supabase o con scripts/hacer-admin.mjs.
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default '' check (char_length(name) <= 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- Ajustes del negocio (SPEC §4.1). Uno por espacio.
create table public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  business text not null default '' check (char_length(business) <= 120),
  legal_name text not null default '' check (char_length(legal_name) <= 160),
  nif text not null default '' check (char_length(nif) <= 20),
  address text not null default '' check (char_length(address) <= 300),
  iban text not null default '' check (char_length(iban) <= 40),
  kind text not null default 'autonomo' check (kind in ('autonomo', 'sociedad')),
  new_autonomo boolean not null default false,
  irpf_mode text not null default 'empresas' check (irpf_mode in ('empresas', 'particulares', 'mixto')),
  iva numeric(5, 2) not null default 21 check (iva >= 0 and iva <= 100),
  irpf numeric(5, 2) not null default 15 check (irpf >= 0 and irpf <= 100),
  pay_days integer not null default 30 check (pay_days between 0 and 365),
  rate numeric(12, 2) not null default 50 check (rate >= 0),
  extra_round numeric(12, 2) not null default 120 check (extra_round >= 0),
  capacity numeric(5, 1) not null default 30 check (capacity >= 0 and capacity <= 168),
  disciplines text[] not null default '{}',
  pay_online jsonb not null default '{"card":false,"bizum":false}'::jsonb,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger workspace_members_updated_at before update on public.workspace_members
  for each row execute function public.set_updated_at();
create trigger workspace_settings_updated_at before update on public.workspace_settings
  for each row execute function public.set_updated_at();

-- ───────────────────────── Funciones de permiso ─────────────────────────

-- ¿El usuario actual es miembro APROBADO de este espacio? La usan todas las tablas con workspace_id.
create or replace function public.is_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    join public.profiles p on p.id = m.user_id
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and p.status = 'aprobado'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;

-- ───────────────────────── Alta de usuarios ─────────────────────────

-- Al registrarse alguien se crea su perfil en estado «pendiente».
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  nombre text := left(trim(coalesce(meta ->> 'full_name', meta ->> 'name', '')), 120);
  asistente jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(meta -> 'asistente') = 'object' and octet_length((meta -> 'asistente')::text) <= 4000 then
    asistente := meta -> 'asistente';
  end if;

  insert into public.profiles (id, full_name, name, email, signup_data, privacy_accepted_at)
  values (
    new.id,
    nombre,
    left(split_part(nombre, ' ', 1), 60),
    coalesce(new.email, ''),
    asistente,
    case when meta ->> 'acepta_privacidad' = 'true' then now() else null end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Para quien se registra con Google: deja constancia de que acepta la política de privacidad.
create or replace function public.accept_privacy()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set privacy_accepted_at = now()
  where id = (select auth.uid()) and privacy_accepted_at is null;
$$;

-- ───────────────────────── Administración de cuentas ─────────────────────────

create or replace function public.admin_list_accounts()
returns table (
  id uuid,
  full_name text,
  email text,
  status text,
  created_at timestamptz,
  privacy_accepted_at timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, p.email, p.status, p.created_at, p.privacy_accepted_at, u.email_confirmed_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

-- Aprueba o rechaza una cuenta. Al aprobarla por primera vez se crea su espacio de trabajo vacío.
create or replace function public.admin_set_status(target uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  es_servicio boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
begin
  if not (public.is_admin() or es_servicio) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if new_status not in ('pendiente', 'aprobado', 'rechazado') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  if target = (select auth.uid()) then
    raise exception 'No puedes cambiar el estado de tu propia cuenta' using errcode = '42501';
  end if;

  update public.profiles set status = new_status where id = target;
  if not found then
    raise exception 'Cuenta no encontrada' using errcode = 'P0002';
  end if;

  if new_status = 'aprobado' and not exists (select 1 from public.workspace_members where user_id = target) then
    insert into public.workspaces (name, created_by)
      select coalesce(nullif(p.full_name, ''), 'Mi estudio'), target from public.profiles p where p.id = target
      returning id into ws;
    insert into public.workspace_members (workspace_id, user_id, role) values (ws, target, 'owner');
    insert into public.workspace_settings (workspace_id) values (ws);
  end if;
end;
$$;

-- ───────────────────────── Seguridad (RLS y permisos) ─────────────────────────

alter table public.profiles enable row level security;
alter table public.app_admins enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_settings enable row level security;

-- Nadie sin sesión toca estas tablas.
revoke all on public.profiles, public.app_admins, public.workspaces, public.workspace_members, public.workspace_settings from anon;
-- Con sesión: se puede leer (filtrado por RLS) y solo modificar las columnas permitidas.
revoke insert, update, delete, truncate on public.profiles, public.app_admins, public.workspaces, public.workspace_members, public.workspace_settings from authenticated;
grant select on public.profiles, public.app_admins, public.workspaces, public.workspace_members, public.workspace_settings to authenticated;
grant update (full_name, name, role, phone, prefs) on public.profiles to authenticated;
grant update (name) on public.workspaces to authenticated;
grant update (business, legal_name, nif, address, iban, kind, new_autonomo, irpf_mode, iva, irpf, pay_days, rate,
  extra_round, capacity, disciplines, pay_online, onboarded) on public.workspace_settings to authenticated;

create policy "Ves tu perfil; quien administra ve todos"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "Editas tu perfil"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Sabes si eres administradora"
  on public.app_admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Ves tus espacios"
  on public.workspaces for select to authenticated
  using (public.is_member(id));
create policy "Editas tus espacios"
  on public.workspaces for update to authenticated
  using (public.is_member(id))
  with check (public.is_member(id));

create policy "Ves los miembros de tus espacios"
  on public.workspace_members for select to authenticated
  using (public.is_member(workspace_id));

create policy "Ves los ajustes de tus espacios"
  on public.workspace_settings for select to authenticated
  using (public.is_member(workspace_id));
create policy "Editas los ajustes de tus espacios"
  on public.workspace_settings for update to authenticated
  using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

-- Funciones: solo para usuarios con sesión (y el servicio, para scripts y pruebas).
revoke execute on function public.is_member(uuid), public.is_admin(), public.accept_privacy(),
  public.admin_list_accounts(), public.admin_set_status(uuid, text), public.handle_new_user() from public, anon;
grant execute on function public.is_member(uuid), public.is_admin(), public.accept_privacy(),
  public.admin_list_accounts(), public.admin_set_status(uuid, text) to authenticated, service_role;
