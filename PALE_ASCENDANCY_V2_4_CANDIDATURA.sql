-- PALE ASCENDANCY V2.4
-- Corrige o fluxo de candidatura profissional.
-- Execute uma única vez no Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.professional_applications(
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profile(id) on delete cascade,
  requested_role text not null check(requested_role in ('editor','designer','editor_designer')),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  note text
);

create unique index if not exists professional_applications_pending_unique
on public.professional_applications(profile_id)
where status='pending';

alter table public.professional_applications enable row level security;

drop policy if exists professional_application_admin_read on public.professional_applications;
create policy professional_application_admin_read
on public.professional_applications
for select to authenticated
using (public.is_admin() or auth.uid() = profile_id);

drop policy if exists professional_application_self_insert on public.professional_applications;
create policy professional_application_self_insert
on public.professional_applications
for insert to authenticated
with check (auth.uid() = profile_id);

drop policy if exists professional_application_admin_update on public.professional_applications;
create policy professional_application_admin_update
on public.professional_applications
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Garante as colunas usadas pelo cadastro.
alter table public.profile
  add column if not exists professional_application boolean not null default false;

alter table public.profile
  add column if not exists requested_role text;

-- Trigger: toda nova conta profissional cria automaticamente a solicitação.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional boolean := coalesce(
    (new.raw_user_meta_data->>'professional_application')::boolean,
    false
  );
  v_role text := nullif(new.raw_user_meta_data->>'requested_role','');
begin
  insert into public.profile(
    id,email,nome,nome_artistico,especialidade,
    professional_application,requested_role
  )
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome',''),
    coalesce(new.raw_user_meta_data->>'nome_artistico',''),
    coalesce(new.raw_user_meta_data->>'especialidade',''),
    v_professional,
    v_role
  )
  on conflict(id) do update set
    email = excluded.email,
    nome = coalesce(nullif(excluded.nome,''), public.profile.nome),
    nome_artistico = coalesce(nullif(excluded.nome_artistico,''), public.profile.nome_artistico),
    especialidade = coalesce(nullif(excluded.especialidade,''), public.profile.especialidade),
    professional_application = excluded.professional_application,
    requested_role = excluded.requested_role;

  if v_professional and v_role in ('editor','designer','editor_designer') then
    insert into public.professional_applications(
      profile_id,requested_role,status,note
    )
    values(new.id,v_role,'pending',null)
    on conflict (profile_id) where status='pending' do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

grant execute on function public.handle_new_user() to postgres, service_role;

-- Recria solicitações pendentes para contas profissionais já existentes
-- que foram criadas antes da correção e ainda não possuem candidatura.
insert into public.professional_applications(profile_id,requested_role,status)
select
  p.id,
  p.requested_role,
  'pending'
from public.profile p
where p.professional_application = true
  and p.requested_role in ('editor','designer','editor_designer')
  and not exists (
    select 1
    from public.professional_applications a
    where a.profile_id = p.id
      and a.status = 'pending'
  );
