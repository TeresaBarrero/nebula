-- nebúla · Fase 2 · Dinero
-- Igualas, renovaciones, presupuestos y facturas (con sus líneas), pagos y gastos.
-- Reglas legales (SPEC §7.3) aplicadas DENTRO de la base de datos:
--   · Las facturas en borrador no tienen número. El número se asigna al emitir, de forma atómica,
--     correlativo por serie y año y sin huecos (tabla invoice_counters + bloqueo de fila).
--   · Una factura emitida no se puede modificar ni borrar (solo desvincularla si se borra su cliente o proyecto:
--     sus datos quedan copiados en la propia factura al emitirla).

create table public.retainers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  company_id uuid,
  contact_id uuid,
  discipline text,
  fee numeric(12, 2) not null default 0 check (fee >= 0),
  hours numeric(8, 1) not null default 0 check (hours >= 0),
  billing_day integer not null default 1 check (billing_day between 1 and 31),
  services text not null default '' check (char_length(services) <= 5000),
  active boolean not null default true,
  start date,
  last_billed text not null default '' check (last_billed = '' or last_billed ~ '^\d{4}-\d{2}$'),
  extra_billed text not null default '' check (extra_billed = '' or extra_billed ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id)
);

create table public.renewals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid,
  type text not null default 'dominio' check (type in ('dominio', 'hosting', 'ssl', 'licencia', 'email')),
  name text not null check (char_length(name) between 1 and 200),
  provider text not null default '' check (char_length(provider) <= 120),
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  price numeric(12, 2) not null default 0 check (price >= 0),
  renew_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete cascade
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null check (kind in ('factura', 'presupuesto')),
  series text not null check (series in ('F', 'R', 'P')),
  number text not null default '' check (char_length(number) <= 30),
  status text not null default 'borrador',
  company_id uuid,
  contact_id uuid,
  project_id uuid,
  retainer_id uuid,
  deal_id uuid,
  from_quote_id uuid,
  rectifies_id uuid,
  iva numeric(5, 2) not null default 21 check (iva between 0 and 100),
  irpf numeric(5, 2) not null default 0 check (irpf between 0 and 100),
  date date not null default current_date,
  due date,
  notes text not null default '' check (char_length(notes) <= 2000),
  -- Líneas: [{desc, qty, price}] (price sin IVA). Van dentro de la factura para que sean inmutables con ella.
  lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) <= 200),
  -- Copia de los datos del cliente y de quien factura en el momento de emitir.
  client jsonb,
  issuer jsonb,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check ((kind = 'factura' and series in ('F', 'R') and status in ('borrador', 'emitida'))
      or (kind = 'presupuesto' and series = 'P' and status in ('borrador', 'enviado', 'aceptado', 'rechazado'))),
  check (series <> 'R' or rectifies_id is not null),
  foreign key (workspace_id, company_id) references public.companies (workspace_id, id) on delete set null (company_id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id),
  foreign key (workspace_id, retainer_id) references public.retainers (workspace_id, id) on delete set null (retainer_id),
  foreign key (workspace_id, deal_id) references public.deals (workspace_id, id) on delete set null (deal_id),
  foreign key (workspace_id, from_quote_id) references public.invoices (workspace_id, id) on delete set null (from_quote_id),
  foreign key (workspace_id, rectifies_id) references public.invoices (workspace_id, id) on delete restrict
);
-- Número único por espacio (los borradores no tienen).
create unique index invoices_numero_unico on public.invoices (workspace_id, number) where number <> '';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null,
  date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'Transferencia' check (char_length(method) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, invoice_id) references public.invoices (workspace_id, id) on delete cascade
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  date date not null default current_date,
  supplier text not null check (char_length(supplier) between 1 and 200),
  contact_id uuid,
  concept text not null check (char_length(concept) between 1 and 300),
  category text not null default 'Otros' check (category in ('Colaboradores', 'Software y suscripciones', 'Cuota de autónomos', 'Oficina',
    'Imprenta y material', 'Publicidad', 'Formación', 'Transporte', 'Gestoría y bancos', 'Renovaciones de clientes', 'Otros')),
  base numeric(12, 2) not null default 0 check (base >= 0),
  iva_pct numeric(5, 2) not null default 21 check (iva_pct in (0, 4, 10, 21)),
  deductible boolean not null default true,
  project_id uuid,
  -- Ticket en el almacén de documentos, siempre dentro de la carpeta del espacio.
  receipt_path text not null default '' check (receipt_path = '' or receipt_path like workspace_id::text || '/%'),
  receipt_name text not null default '' check (char_length(receipt_name) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, contact_id) references public.contacts (workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id) on delete set null (project_id)
);

-- Contadores de numeración: último número usado por espacio, serie y año.
create table public.invoice_counters (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  series text not null check (series in ('F', 'R', 'P')),
  year integer not null,
  last integer not null default 0,
  primary key (workspace_id, series, year)
);

create index on public.retainers (workspace_id);
create index on public.renewals (workspace_id);
create index on public.invoices (workspace_id);
create index on public.invoices (company_id);
create index on public.invoices (project_id);
create index on public.payments (invoice_id);
create index on public.expenses (workspace_id);

do $$
declare
  t text;
begin
  foreach t in array array['retainers', 'renewals', 'invoices', 'payments', 'expenses']
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

-- Los contadores solo se tocan desde la función de emitir (nadie los ve ni los cambia a mano).
alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;

-- ───────────────────────── Inmutabilidad de las facturas ─────────────────────────

create or replace function public.proteger_factura()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  emitiendo boolean := coalesce(current_setting('nebula.emitiendo', true), '') = '1';
begin
  if tg_op = 'INSERT' then
    -- Una factura nace siempre como borrador y sin número: el número solo lo da «emitir».
    if new.kind = 'factura' and (new.status <> 'borrador' or new.number <> '' or new.issued_at is not null) and not emitiendo then
      raise exception 'Las facturas se crean como borrador y reciben su número al emitirlas' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- (Si se borra el espacio de trabajo entero, sí se van con él.)
    if old.kind = 'factura' and old.status = 'emitida' and exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
      raise exception 'Una factura emitida no se puede borrar. Corrígela con una rectificativa.' using errcode = 'P0001';
    end if;
    return old;
  end if;

  -- UPDATE
  if old.kind = 'factura' and old.status = 'emitida' then
    -- Solo se permite desvincular (al borrar el cliente, proyecto, iguala…): sus datos ya están copiados en la factura.
    if (to_jsonb(new) - array['company_id', 'contact_id', 'project_id', 'retainer_id', 'deal_id', 'from_quote_id', 'updated_at'])
       is distinct from (to_jsonb(old) - array['company_id', 'contact_id', 'project_id', 'retainer_id', 'deal_id', 'from_quote_id', 'updated_at'])
       or (new.company_id is not null and new.company_id is distinct from old.company_id)
       or (new.contact_id is not null and new.contact_id is distinct from old.contact_id)
       or (new.project_id is not null and new.project_id is distinct from old.project_id)
       or (new.retainer_id is not null and new.retainer_id is distinct from old.retainer_id)
       or (new.deal_id is not null and new.deal_id is distinct from old.deal_id)
       or (new.from_quote_id is not null and new.from_quote_id is distinct from old.from_quote_id) then
      raise exception 'Una factura emitida no se puede modificar. Corrígela con una rectificativa.' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.kind <> old.kind or new.series <> old.series then
    raise exception 'No se puede cambiar el tipo ni la serie de un documento' using errcode = 'P0001';
  end if;
  if old.kind = 'factura' and not emitiendo and (new.status <> 'borrador' or new.number <> '' or new.issued_at is not null) then
    raise exception 'Para emitir una factura usa «Emitir»: así recibe su número correlativo' using errcode = 'P0001';
  end if;
  if old.kind = 'presupuesto' and old.number <> '' and new.number <> old.number then
    raise exception 'El número de un presupuesto no se cambia' using errcode = 'P0001';
  end if;
  if old.kind = 'presupuesto' and old.number = '' and new.number <> '' and not emitiendo then
    raise exception 'El número del presupuesto lo pone nebúla' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger invoices_proteger before insert or update or delete on public.invoices
  for each row execute function public.proteger_factura();

-- Los pagos solo se apuntan en facturas emitidas.
create or replace function public.comprobar_pago()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.invoices i where i.id = new.invoice_id and i.workspace_id = new.workspace_id
                 and i.kind = 'factura' and i.status = 'emitida') then
    raise exception 'Solo se pueden apuntar pagos en facturas emitidas' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger payments_comprobar before insert or update on public.payments
  for each row execute function public.comprobar_pago();

-- ───────────────────────── Emitir y numerar ─────────────────────────
-- emitir_documento(id):
--   · Factura en borrador → número F-AAAA-NNN (o R-…), estado «emitida», fecha de hoy y copia de los datos
--     del cliente y de quien factura. El contador se bloquea fila a fila: dos emisiones a la vez nunca
--     reciben el mismo número ni dejan huecos (si algo falla, la transacción entera se deshace).
--   · Presupuesto sin número → número P-AAAA-NNN (sin cambiar su estado).
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
  if not found or not public.is_member(f.workspace_id) then
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

revoke execute on function public.emitir_documento(uuid), public.proteger_factura(), public.comprobar_pago() from public, anon;
grant execute on function public.emitir_documento(uuid) to authenticated;

-- Tickets de gastos: mismo almacén «documentos» y mismas reglas por carpeta del espacio (ya creadas en la Fase 1).
