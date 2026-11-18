-- Lista de interesados (nebúla como demo de portfolio): quien quiere usar nebúla deja sus datos.
-- Solo se escribe desde el servidor (/api/interesados, con la clave secreta) y solo la ve quien administra.

create table public.interesados (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 200),
  discipline text not null default '' check (char_length(discipline) <= 40),
  kind text not null default '' check (char_length(kind) <= 40),
  comment text not null default '' check (char_length(comment) <= 1000),
  privacy_accepted_at timestamptz not null,
  contacted boolean not null default false
);
create unique index interesados_email_unico on public.interesados (lower(email));

alter table public.interesados enable row level security;

-- Supabase da todos los permisos por defecto: se quitan y se dan solo los necesarios.
revoke all on public.interesados from public, anon, authenticated;
grant select, update, delete on public.interesados to authenticated;
grant all on public.interesados to service_role;

create policy "interesados: solo admin lee" on public.interesados for select to authenticated using (public.is_admin());
create policy "interesados: solo admin marca" on public.interesados for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "interesados: solo admin borra" on public.interesados for delete to authenticated using (public.is_admin());
