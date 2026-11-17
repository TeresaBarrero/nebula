-- nebúla · Fase 3 · Trabajo creativo
-- Horas trabajadas, cronómetro de cada persona, contenidos, versiones y rondas de los entregables
-- y accesos de clientes con la contraseña CIFRADA (pgcrypto + clave guardada en Supabase Vault).

-- ───────────────────────── Entregables: versiones y rondas de cambios ─────────────────────────
-- versions: [{v, date}] · feedback: [{date, text}] (cada elemento es una ronda de cambios).
alter table public.deliverables
  add column versions jsonb not null default '[]'::jsonb check (jsonb_typeof(versions) = 'array'),
  add column feedback jsonb not null default '[]'::jsonb check (jsonb_typeof(feedback) = 'array');

-- ───────────────────────── Cronómetro en marcha (uno por persona) ─────────────────────────
alter table public.profiles add column active_timer jsonb;
grant update (active_timer) on public.profiles to authenticated;

-- ───────────────────────── Horas ─────────────────────────
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  date date not null default current_date,
  minutes integer not null check (minutes between 1 and 1440),
  project_id uuid,
  retainer_id uuid,
  task_id uuid,
  note text not null default '' check (char_length(note) <= 300),
  billable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (project_id is null or retainer_id is null),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id),
  foreign key (workspace_id, retainer_id) references public.retainers (workspace_id, id) on delete set null (retainer_id),
  foreign key (workspace_id, task_id) references public.tasks (workspace_id, id) on delete set null (task_id)
);

-- ───────────────────────── Contenidos ─────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid, -- vacío = mi marca
  channel text not null default 'instagram'
    check (channel in ('instagram', 'linkedin', 'tiktok', 'facebook', 'blog', 'newsletter', 'prensa', 'interna')),
  date date not null,
  time text not null default '' check (time = '' or time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  title text not null check (char_length(title) between 1 and 200),
  copy text not null default '' check (char_length(copy) <= 5000),
  status text not null default 'idea' check (status in ('idea', 'borrador', 'revision', 'aprobado', 'programado', 'publicado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete cascade
);

-- ───────────────────────── Accesos de clientes ─────────────────────────
create table public.accesses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid,
  service text not null check (char_length(service) between 1 and 200),
  url text not null default '' check (char_length(url) <= 300),
  username text not null default '' check (char_length(username) <= 200),
  -- Contraseña cifrada. Nunca se devuelve tal cual: solo con ver_clave_acceso().
  password_enc bytea,
  has_password boolean generated always as (password_enc is not null) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete cascade
);

create index on public.time_entries (workspace_id, date);
create index on public.time_entries (project_id);
create index on public.posts (workspace_id, date);
create index on public.accesses (workspace_id);

do $$
declare
  t text;
begin
  foreach t in array array['time_entries', 'posts', 'accesses']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy "Ves lo de tu espacio" on public.%I for select to authenticated using (public.is_member(workspace_id))', t);
    execute format('create policy "Creas en tu espacio" on public.%I for insert to authenticated with check (public.is_member(workspace_id))', t);
    execute format('create policy "Cambias lo de tu espacio" on public.%I for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id))', t);
    execute format('create policy "Borras lo de tu espacio" on public.%I for delete to authenticated using (public.is_member(workspace_id))', t);
  end loop;
end;
$$;
grant select, insert, update, delete on public.time_entries, public.posts to authenticated;
-- Accesos: se leen todas las columnas MENOS la contraseña cifrada; se crean y cambian solo con guardar_acceso().
revoke all on public.accesses from authenticated;
grant select (id, workspace_id, company_id, service, url, username, has_password, created_at, updated_at) on public.accesses to authenticated;
grant delete on public.accesses to authenticated;

-- Clave de cifrado: se genera una vez dentro de la base de datos y vive en Supabase Vault.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'nebula_accesos') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'nebula_accesos', 'Clave para cifrar las contraseñas de los accesos de clientes');
  end if;
end;
$$;

create or replace function public.clave_accesos()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'nebula_accesos' limit 1;
$$;
revoke execute on function public.clave_accesos() from public, anon, authenticated;

-- Crea o cambia un acceso. p_password: null = dejar la que había · '' = quitarla · texto = cifrarla.
create or replace function public.guardar_acceso(
  p_id uuid, p_workspace uuid, p_company uuid, p_service text, p_url text, p_username text, p_password text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cifrada bytea := case when p_password is null or p_password = '' then null
                        else extensions.pgp_sym_encrypt(p_password, public.clave_accesos()) end;
  actual public.accesses;
begin
  if not public.is_member(p_workspace) then
    raise exception 'No tienes permiso en este espacio' using errcode = '42501';
  end if;
  if char_length(coalesce(p_password, '')) > 500 then
    raise exception 'La contraseña es demasiado larga' using errcode = '22001';
  end if;
  select * into actual from public.accesses where id = p_id;
  if found and actual.workspace_id <> p_workspace then
    raise exception 'No se encuentra el acceso' using errcode = 'P0002';
  end if;
  if found then
    update public.accesses set company_id = p_company, service = p_service, url = coalesce(p_url, ''), username = coalesce(p_username, ''),
      password_enc = case when p_password is null then password_enc else cifrada end
    where id = p_id;
  else
    insert into public.accesses (id, workspace_id, company_id, service, url, username, password_enc)
    values (p_id, p_workspace, p_company, p_service, coalesce(p_url, ''), coalesce(p_username, ''), cifrada);
  end if;
end;
$$;

-- Descifra la contraseña de un acceso (solo para miembros de su espacio).
create or replace function public.ver_clave_acceso(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.accesses;
begin
  select * into a from public.accesses where id = p_id;
  if not found or not public.is_member(a.workspace_id) then
    raise exception 'No se encuentra el acceso' using errcode = 'P0002';
  end if;
  if a.password_enc is null then
    return '';
  end if;
  return extensions.pgp_sym_decrypt(a.password_enc, public.clave_accesos());
end;
$$;

revoke execute on function public.guardar_acceso(uuid, uuid, uuid, text, text, text, text), public.ver_clave_acceso(uuid) from public, anon;
grant execute on function public.guardar_acceso(uuid, uuid, uuid, text, text, text, text), public.ver_clave_acceso(uuid) to authenticated;
