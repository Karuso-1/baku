-- Baku · esquema de Supabase
-- Pégalo entero en SQL Editor → New query → Run. Se puede ejecutar más de una vez sin romper nada.

-- 1. Datos de cada usuario: una fila por registro de la app (perfil, ajustes, pesos, días, recetas, alimentos, fotos)
create table if not exists public.records (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  store      text not null,
  key        text not null,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, store, key)
);
create index if not exists records_user_updated on public.records (user_id, updated_at);

-- La hora de cambio la pone siempre el servidor
create or replace function public.tocar_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists records_updated on public.records;
create trigger records_updated before insert or update on public.records
  for each row execute function public.tocar_updated_at();

-- 2. Comprobante de la clave de las fotos (no es la clave: solo sirve para saber si un código es correcto)
create table if not exists public.vault (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  check_data text not null,
  created_at timestamptz not null default now()
);

-- 3. Seguridad: cada persona solo ve y toca lo suyo
alter table public.records enable row level security;
alter table public.vault enable row level security;

drop policy if exists "solo lo mío" on public.records;
create policy "solo lo mío" on public.records for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "solo lo mío" on public.vault;
create policy "solo lo mío" on public.vault for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.records, public.vault from anon;
grant select, insert, update, delete on public.records, public.vault to authenticated;

-- 4. Fotos: carpeta privada, cada usuario solo en su subcarpeta. Los archivos ya llegan cifrados desde el móvil.
insert into storage.buckets (id, name, public, file_size_limit)
values ('privado', 'privado', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "baku ver lo mío" on storage.objects;
create policy "baku ver lo mío" on storage.objects for select to authenticated
  using (bucket_id = 'privado' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "baku subir lo mío" on storage.objects;
create policy "baku subir lo mío" on storage.objects for insert to authenticated
  with check (bucket_id = 'privado' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "baku cambiar lo mío" on storage.objects;
create policy "baku cambiar lo mío" on storage.objects for update to authenticated
  using (bucket_id = 'privado' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "baku borrar lo mío" on storage.objects;
create policy "baku borrar lo mío" on storage.objects for delete to authenticated
  using (bucket_id = 'privado' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- 5. Borrar mi cuenta (la app borra antes las fotos). Borra la cuenta y, en cascada, sus datos.
create or replace function public.borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  delete from public.records where user_id = auth.uid();
  delete from public.vault where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;

-- 6. La función que crea "Enable automatic RLS" no debe poder llamarse desde fuera
do $$ begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable' and pronamespace = 'public'::regnamespace) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- ---------- 7. Avisos (recordatorios) ----------
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  tz text not null default 'Europe/Madrid',
  prefs jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,   -- solo fechas: último pesaje, foto, comida, menú y apertura
  last_sent_on date,
  sent jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists push_subs_user on public.push_subs(user_id);
alter table public.push_subs enable row level security;
create policy "avisos: solo lo mío" on public.push_subs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subs to authenticated, service_role;

-- Claves VAPID del servidor (privada: solo la función, nunca en el repositorio)
create table if not exists public.app_config (k text primary key, v text not null);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to service_role;
-- insert into public.app_config(k,v) values ('vapid_public','…'),('vapid_private','…');
