-- nebúla · Fase 1 · Núcleo CRM
-- Empresas, contactos, oportunidades, proyectos (+ equipo), entregables, tareas, reuniones, notas,
-- historial, documentos y avisos leídos. Todas con workspace_id y RLS por is_member().
-- Los vínculos entre tablas son compuestos (workspace_id, id): así es IMPOSIBLE enlazar datos de otro espacio.

-- Columnas comunes de cada tabla: id, workspace_id, created_at, updated_at.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  nif text not null default '' check (char_length(nif) <= 20),
  sector text not null default '' check (char_length(sector) <= 120),
  address text not null default '' check (char_length(address) <= 300),
  email text not null default '' check (char_length(email) <= 200),
  phone text not null default '' check (char_length(phone) <= 40),
  web text not null default '' check (char_length(web) <= 200),
  notes text not null default '' check (char_length(notes) <= 5000),
  is_private boolean not null default false,
  brand jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  company_id uuid,
  role text not null default '' check (char_length(role) <= 160),
  nif text not null default '' check (char_length(nif) <= 20),
  email text not null default '' check (char_length(email) <= 200),
  phone text not null default '' check (char_length(phone) <= 40),
  type text not null default 'Cliente' check (type in ('Cliente', 'Proveedor', 'Colaborador', 'Otro')),
  status text not null default 'activo' check (status in ('activo', 'potencial', 'inactivo')),
  tags text[] not null default '{}',
  notes text not null default '' check (char_length(notes) <= 5000),
  specialty text,
  rate numeric(12, 2) check (rate >= 0),
  availability text check (availability in ('disponible', 'parcial', 'ocupado')),
  consent boolean not null default false,
  consent_date date,
  consent_via text check (consent_via in ('Contrato', 'Formulario web', 'Email', 'Presencial', 'Teléfono')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  contact_id uuid,
  discipline text,
  start date,
  "end" date,
  status text not null default 'briefing'
    check (status in ('briefing', 'investigacion', 'concepto', 'produccion', 'revisiones', 'entregado', 'pausa')),
  prev_status text check (prev_status in ('briefing', 'investigacion', 'concepto', 'produccion', 'revisiones', 'entregado')),
  priority text not null default 'media' check (priority in ('baja', 'media', 'alta', 'urgente')),
  budget numeric(12, 2) not null default 0 check (budget >= 0),
  hours_budget numeric(8, 1) not null default 0 check (hours_budget >= 0),
  rounds_included integer not null default 2 check (rounds_included between 0 and 50),
  description text not null default '' check (char_length(description) <= 5000),
  tags text[] not null default '{}',
  brief jsonb not null default '{"status":"pendiente","answers":{}}'::jsonb,
  portfolio jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id)
);

create table public.project_collaborators (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null,
  contact_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, contact_id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete cascade,
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  discipline text,
  company_id uuid,
  contact_id uuid,
  value numeric(12, 2) not null default 0 check (value >= 0),
  prob integer not null default 10 check (prob between 0 and 100),
  stage text not null default 'nuevo' check (stage in ('nuevo', 'contactado', 'propuesta', 'negociacion', 'ganado', 'perdido')),
  expected date,
  source text not null default '' check (char_length(source) <= 60),
  notes text not null default '' check (char_length(notes) <= 5000),
  lost_reason text not null default '' check (char_length(lost_reason) <= 60),
  project_id uuid,
  closed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id)
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  status text not null default 'en_curso' check (status in ('en_curso', 'enviado', 'cambios', 'aprobado')),
  sent_at date,
  approved_at date,
  billed_extra integer not null default 0 check (billed_extra >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  due date,
  urgent boolean not null default false,
  important boolean not null default true,
  done boolean not null default false,
  project_id uuid,
  contact_id uuid,
  assignee_id uuid,
  estimate numeric(6, 1) not null default 2 check (estimate >= 0),
  repeat text not null default '' check (repeat in ('', 'diaria', 'semanal', 'mensual')),
  blocked_by uuid,
  next_created boolean not null default false,
  phase text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (blocked_by is null or blocked_by <> id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, assignee_id) references public.contacts (workspace_id, id) on delete set null (assignee_id),
  foreign key (workspace_id, blocked_by) references public.tasks (workspace_id, id) on delete set null (blocked_by)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  date date not null,
  time text not null default '' check (time = '' or time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  contact_id uuid,
  project_id uuid,
  source text check (source in ('google', 'reserva')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 10000),
  color text not null default 'butter' check (color in ('butter', 'peach', 'lilac', 'sage', 'sand')),
  pinned boolean not null default false,
  contact_id uuid,
  project_id uuid,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (type in ('nota', 'llamada', 'email', 'reunion')),
  text text not null check (char_length(text) between 1 and 5000),
  date date not null default current_date,
  contact_id uuid,
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id)
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 255),
  size bigint not null default 0 check (size >= 0),
  mime text not null default 'application/octet-stream',
  -- Siempre dentro de la carpeta del espacio: «<workspace_id>/…»
  storage_path text not null default '' check (storage_path = '' or storage_path like workspace_id::text || '/%'),
  contact_id uuid,
  company_id uuid,
  project_id uuid,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id)
);

create table public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

-- Índices para buscar por espacio y por vínculo.
create index on public.contacts (workspace_id);
create index on public.contacts (company_id);
create index on public.deals (workspace_id);
create index on public.projects (workspace_id);
create index on public.project_collaborators (workspace_id);
create index on public.deliverables (project_id);
create index on public.tasks (workspace_id);
create index on public.tasks (project_id);
create index on public.events (workspace_id, date);
create index on public.notes (workspace_id);
create index on public.activities (workspace_id);
create index on public.files (workspace_id);
create index on public.companies (workspace_id);
create index on public.notification_reads (workspace_id);

-- updated_at automático, RLS y permisos: igual en todas las tablas.
do $$
declare
  t text;
begin
  foreach t in array array['companies', 'contacts', 'projects', 'project_collaborators', 'deals', 'deliverables',
                           'tasks', 'events', 'notes', 'activities', 'files', 'notification_reads']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "Ves lo de tu espacio" on public.%I for select to authenticated using (public.is_member(workspace_id))', t);
    execute format('create policy "Creas en tu espacio" on public.%I for insert to authenticated with check (public.is_member(workspace_id))', t);
    execute format('create policy "Cambias lo de tu espacio" on public.%I for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id))', t);
    execute format('create policy "Borras lo de tu espacio" on public.%I for delete to authenticated using (public.is_member(workspace_id))', t);
  end loop;
end;
$$;

-- ───────────────────────── Documentos (Supabase Storage) ─────────────────────────
-- Bucket privado. Cada archivo vive en «<workspace_id>/<archivo>» y solo lo ven los miembros de ese espacio.

insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 52428800)
on conflict (id) do nothing;

-- Primer tramo de la ruta como uuid (o null si no lo es, para no dar error).
create or replace function public.espacio_de_ruta(ruta text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(ruta, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

create policy "Ves los documentos de tu espacio" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.is_member(public.espacio_de_ruta(name)));
create policy "Subes documentos a tu espacio" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.is_member(public.espacio_de_ruta(name)));
create policy "Borras documentos de tu espacio" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.is_member(public.espacio_de_ruta(name)));
