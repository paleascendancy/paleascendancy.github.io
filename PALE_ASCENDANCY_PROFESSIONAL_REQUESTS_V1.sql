-- PALE ASCENDANCY — SOLICITAÇÕES PROFISSIONAIS V1
-- Editor / Designer / Editor + Designer
-- Execute este arquivo no Supabase SQL Editor.

alter table public.profile
  add column if not exists professional_login_enabled boolean not null default false;

create table if not exists public.professional_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profile(id) on delete cascade,
  requested_role text not null check (requested_role in ('editor','designer','editor_designer')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profile(id) on delete set null,
  note text
);

create unique index if not exists professional_applications_one_pending_idx
on public.professional_applications(profile_id)
where status = 'pending';

create index if not exists professional_applications_status_idx
on public.professional_applications(status, submitted_at desc);

alter table public.professional_applications enable row level security;

drop policy if exists "Users can submit own professional application" on public.professional_applications;
create policy "Users can submit own professional application"
on public.professional_applications
for insert to authenticated
with check (profile_id = auth.uid());

drop policy if exists "Users can view own professional applications" on public.professional_applications;
create policy "Users can view own professional applications"
on public.professional_applications
for select to authenticated
using (profile_id = auth.uid() or public.is_admin());

-- Mantém os campos de aprovação e o acesso profissional sob controle administrativo.
create or replace function public.protect_professional_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.is_editor := old.is_editor;
    new.is_designer := old.is_designer;
    new.is_featured := old.is_featured;
    new.professional_login_enabled := old.professional_login_enabled;
    new.id := old.id;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_professional_flags on public.profile;
create trigger protect_professional_flags
before update on public.profile
for each row execute procedure public.protect_professional_flags();

-- Solicitação feita pelo usuário a partir do e-mail da conta já existente.
create or replace function public.submit_professional_application(
  p_email text,
  p_requested_role text,
  p_display_name text default null
)
returns public.professional_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profile;
  result public.professional_applications;
begin
  if p_requested_role not in ('editor','designer','editor_designer') then
    raise exception 'Tipo profissional inválido';
  end if;

  select * into target
  from public.profile
  where lower(email) = lower(trim(p_email))
  limit 1;

  if target.id is null then
    raise exception 'Crie uma conta comum na Pale Ascendancy antes de solicitar acesso profissional.';
  end if;

  if target.is_editor or target.is_designer then
    raise exception 'Esta conta já possui acesso profissional aprovado.';
  end if;

  insert into public.professional_applications(profile_id, requested_role, status, note)
  values (
    target.id,
    p_requested_role,
    'pending',
    nullif(trim(coalesce(p_display_name,'')), '')
  )
  returning * into result;

  return result;
exception
  when unique_violation then
    raise exception 'Esta conta já possui uma solicitação profissional pendente.';
end;
$$;

grant execute on function public.submit_professional_application(text,text,text) to anon, authenticated;

-- Aprovação/rejeição feita exclusivamente pela administração.
create or replace function public.review_professional_application(
  p_application_id uuid,
  p_decision text
)
returns public.professional_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.professional_applications;
  admin_profile uuid;
  result public.professional_applications;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  if p_decision not in ('approved','rejected') then
    raise exception 'Decisão inválida';
  end if;

  select id into admin_profile
  from public.profile
  where id = auth.uid();

  select * into app
  from public.professional_applications
  where id = p_application_id
  for update;

  if app.id is null then
    raise exception 'Solicitação não encontrada';
  end if;

  if app.status <> 'pending' then
    raise exception 'Esta solicitação já foi analisada';
  end if;

  if p_decision = 'approved' then
    update public.profile
    set
      is_editor = app.requested_role in ('editor','editor_designer'),
      is_designer = app.requested_role in ('designer','editor_designer'),
      professional_login_enabled = true
    where id = app.profile_id;
  else
    update public.profile
    set professional_login_enabled = false
    where id = app.profile_id;
  end if;

  update public.professional_applications
  set
    status = p_decision,
    reviewed_at = now(),
    reviewed_by = admin_profile
  where id = app.id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.review_professional_application(uuid,text) to authenticated;

-- A administração pode consultar tudo; usuários só enxergam a própria solicitação.
drop policy if exists "Admins can manage professional applications" on public.professional_applications;
create policy "Admins can manage professional applications"
on public.professional_applications
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Para contas já aprovadas no modelo antigo, libera o login profissional automaticamente.
update public.profile
set professional_login_enabled = true
where (is_editor = true or is_designer = true)
  and professional_login_enabled = false;
