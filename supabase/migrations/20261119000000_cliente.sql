-- nebúla · Fase 4 · Cliente
-- Contratos con firma y rastro, informes mensuales, automatizaciones (y registro de cada ejecución para que
-- ocurran UNA sola vez), enlaces del portal del cliente, correos enviados, formulario web y página de reservas.
-- Lo que hace el cliente desde fuera (portal, formulario, reservas, cobros) lo ejecuta el servidor con la clave
-- de servicio, siempre filtrando por el espacio y la empresa del enlace.

-- ───────────────────────── Ajustes del espacio ─────────────────────────
alter table public.workspace_settings
  add column public_slug text unique check (public_slug is null or public_slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  add column booking jsonb not null default '{"on":false,"duration":30,"from":"10:00","to":"14:00","days":[1,2,3,4,5]}'::jsonb,
  add column lead_form_on boolean not null default false;
grant update (public_slug, booking, lead_form_on) on public.workspace_settings to authenticated;

-- ───────────────────────── Contratos ─────────────────────────
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null default 'proyecto' check (type in ('proyecto', 'iguala', 'colaborador')),
  title text not null check (char_length(title) between 1 and 200),
  project_id uuid,
  retainer_id uuid,
  company_id uuid,
  contact_id uuid,
  deposit numeric(5, 2) not null default 0 check (deposit between 0 and 100),
  ip text not null default 'cesion' check (ip in ('cesion', 'licencia', 'colaborador')),
  portfolio boolean not null default true,
  scope text not null default '' check (char_length(scope) <= 3000),
  extra text not null default '' check (char_length(extra) <= 3000),
  status text not null default 'borrador' check (status in ('borrador', 'enviado', 'firmado')),
  sent_at date,
  signed_at timestamptz,
  signed_by text not null default '' check (char_length(signed_by) <= 160),
  -- Rastro de la firma: IP, navegador, texto exacto firmado y su huella SHA-256.
  signed_ip text not null default '',
  signed_user_agent text not null default '' check (char_length(signed_user_agent) <= 500),
  signed_text text not null default '',
  document_hash text not null default '',
  deposit_invoice_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id),
  foreign key (workspace_id, retainer_id) references public.retainers (workspace_id, id) on delete set null (retainer_id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, deposit_invoice_id) references public.invoices (workspace_id, id) on delete set null (deposit_invoice_id)
);

-- Un contrato firmado no se cambia (salvo desvincularlo si se borra su proyecto, cliente…).
create or replace function public.proteger_contrato()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'firmado' and exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
      raise exception 'Un contrato firmado no se puede borrar' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if old.status = 'firmado'
     and (to_jsonb(new) - array['project_id', 'retainer_id', 'company_id', 'contact_id', 'deposit_invoice_id', 'updated_at'])
         is distinct from (to_jsonb(old) - array['project_id', 'retainer_id', 'company_id', 'contact_id', 'deposit_invoice_id', 'updated_at']) then
    raise exception 'Un contrato firmado no se puede modificar' using errcode = 'P0001';
  end if;
  -- Desde la app (no desde el portal) no se puede marcar como firmado.
  if new.status = 'firmado' and old.status <> 'firmado' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Solo el cliente puede firmar el contrato, desde su portal' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger contracts_proteger before update or delete on public.contracts for each row execute function public.proteger_contrato();

create or replace function public.contrato_nuevo_sin_firma()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'firmado' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Solo el cliente puede firmar el contrato, desde su portal' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger contracts_nuevo before insert on public.contracts for each row execute function public.contrato_nuevo_sin_firma();

-- ───────────────────────── Informes mensuales ─────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  retainer_id uuid,
  company_id uuid,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  status text not null default 'borrador' check (status in ('borrador', 'enviado')),
  sent_at date,
  kpis jsonb not null default '{}'::jsonb,
  prev jsonb not null default '{}'::jsonb,
  summary text not null default '' check (char_length(summary) <= 3000),
  next text not null default '' check (char_length(next) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, retainer_id, month),
  foreign key (workspace_id, retainer_id) references public.retainers (workspace_id, id) on delete cascade,
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id)
);

-- ───────────────────────── Automatizaciones ─────────────────────────
-- Si no hay fila, vale lo de por defecto (todas activas salvo «retainer»).
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null check (key in ('won', 'signed', 'approved', 'lead', 'overdue', 'nudge', 'retainer')),
  "on" boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, key)
);
-- Cada ejecución, con su referencia: la misma automatización no puede ejecutarse dos veces para lo mismo.
create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null check (char_length(key) <= 20),
  ref text not null check (char_length(ref) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, key, ref)
);

-- ───────────────────────── Correos enviados (o simulados) ─────────────────────────
create table public.outgoing_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid,
  company_id uuid,
  "to" text not null check (char_length("to") <= 300),
  subject text not null check (char_length(subject) <= 300),
  body text not null default '' check (char_length(body) <= 20000),
  kind text not null default 'otro' check (char_length(kind) <= 40),
  status text not null default 'simulado' check (status in ('enviado', 'simulado', 'error')),
  error text not null default '' check (char_length(error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id)
);

-- ───────────────────────── Enlaces del portal ─────────────────────────
-- Se guarda solo la huella del enlace (como una contraseña): quien vea la tabla no puede entrar.
create table public.portal_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid not null,
  contact_id uuid,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete cascade,
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete cascade
);

-- Límite de peticiones de las páginas públicas (formulario, reservas, pedir acceso). Solo el servidor.
create table public.rate_limits (
  id bigserial primary key,
  bucket text not null,
  at timestamptz not null default now()
);
create index on public.rate_limits (bucket, at);

-- Pagos online: referencia del pago en la pasarela, para no apuntarlo dos veces.
alter table public.payments add column external_ref text unique check (external_ref is null or char_length(external_ref) <= 200);

create index on public.contracts (workspace_id);
create index on public.reports (workspace_id);
create index on public.automation_runs (workspace_id, key);
create index on public.outgoing_emails (workspace_id, created_at);
create index on public.portal_tokens (company_id);

do $$
declare
  t text;
begin
  foreach t in array array['contracts', 'reports', 'automations', 'automation_runs', 'outgoing_emails', 'portal_tokens']
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
grant select, insert, update, delete on public.contracts, public.reports, public.automations to authenticated;
grant select, insert on public.automation_runs to authenticated;
-- Los correos y los enlaces del portal los crea el servidor; desde la app solo se ven (y los enlaces se pueden anular).
grant select on public.outgoing_emails to authenticated;
grant select, delete on public.portal_tokens to authenticated;
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- El servidor (portal, cobros, tareas diarias) también puede emitir facturas: misma numeración sin huecos.
create or replace function public.emitir_documento(p_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.invoices;
  s public.workspace_settings;
  co public.companies;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  anio integer := extract(year from (now() at time zone 'Europe/Madrid'))::integer;
  n integer;
begin
  select * into f from public.invoices where id = p_id for update;
  if not found or (not public.is_member(f.workspace_id) and coalesce(auth.role(), '') <> 'service_role') then
    raise exception 'No se encuentra el documento' using errcode = 'P0002';
  end if;
  if f.kind = 'factura' and f.status <> 'borrador' then
    raise exception 'Esta factura ya está emitida (%)', f.number using errcode = 'P0001';
  end if;
  if f.kind = 'presupuesto' and f.number <> '' then
    return f;
  end if;
  if f.kind = 'factura' then
    if f.company_id is null then
      raise exception 'Elige a quién va la factura antes de emitirla' using errcode = 'P0001';
    end if;
    if jsonb_array_length(f.lines) = 0 then
      raise exception 'La factura no tiene ningún concepto' using errcode = 'P0001';
    end if;
  end if;

  insert into public.invoice_counters as c (workspace_id, series, year, last)
  values (f.workspace_id, f.series, anio, 1)
  on conflict (workspace_id, series, year) do update set last = c.last + 1
  returning last into n;

  perform set_config('nebula.emitiendo', '1', true);
  if f.kind = 'factura' then
    select * into s from public.workspace_settings where workspace_id = f.workspace_id;
    select * into co from public.companies where id = f.company_id;
    update public.invoices set
      number = f.series || '-' || anio || '-' || lpad(n::text, 3, '0'),
      status = 'emitida',
      date = hoy,
      due = greatest(coalesce(due, hoy), hoy),
      issued_at = now(),
      client = jsonb_build_object('name', co.name, 'nif', co.nif, 'address', co.address),
      issuer = jsonb_build_object('legalName', coalesce(nullif(s.legal_name, ''), s.business), 'nif', s.nif, 'address', s.address, 'iban', s.iban)
    where id = p_id
    returning * into f;
  else
    update public.invoices set number = f.series || '-' || anio || '-' || lpad(n::text, 3, '0') where id = p_id returning * into f;
  end if;
  perform set_config('nebula.emitiendo', '', true);
  return f;
end;
$$;
grant execute on function public.emitir_documento(uuid) to authenticated, service_role;
revoke execute on function public.proteger_contrato(), public.contrato_nuevo_sin_firma() from public, anon;
