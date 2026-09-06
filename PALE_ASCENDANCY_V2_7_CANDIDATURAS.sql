-- PALE ASCENDANCY V2.7 — CANDIDATURAS PROFISSIONAIS
-- Execute SOMENTE este SQL no Supabase SQL Editor.
-- Não depende de profile.professional_application.

begin;

create table if not exists public.professional_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profile(id) on delete cascade,
  requested_role text not null default 'editor'
    check (requested_role in ('editor','designer','editor_designer')),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  note text
);

alter table public.professional_applications
  add column if not exists profile_id uuid,
  add column if not exists requested_role text,
  add column if not exists status text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists note text;

create unique index if not exists professional_applications_one_pending_per_profile
on public.professional_applications(profile_id)
where status = 'pending';

alter table public.professional_applications enable row level security;

drop policy if exists "professional applications self insert" on public.professional_applications;
create policy "professional applications self insert"
on public.professional_applications
for insert to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "professional applications self read" on public.professional_applications;
create policy "professional applications self read"
on public.professional_applications
for select to authenticated
using (auth.uid() = profile_id or public.is_admin());

drop policy if exists "professional applications admin update" on public.professional_applications;
create policy "professional applications admin update"
on public.professional_applications
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.submit_professional_application(
  p_profile_id uuid,
  p_requested_role text,
  p_nome text default null,
  p_nome_artistico text default null,
  p_especialidade text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := case when p_requested_role = 'both' then 'editor_designer' else p_requested_role end;
  v_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    raise exception 'Acesso negado';
  end if;

  if v_role not in ('editor','designer','editor_designer') then
    v_role := 'editor';
  end if;

  update public.profile
  set
    nome = coalesce(p_nome, nome),
    nome_artistico = coalesce(p_nome_artistico, nome_artistico),
    especialidade = coalesce(p_especialidade, especialidade),
    is_editor = false,
    is_designer = false,
    professional_login_enabled = false,
    is_public = false
  where id = p_profile_id;

  insert into public.professional_applications(profile_id, requested_role, status)
  values (p_profile_id, v_role, 'pending')
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.professional_applications
    where profile_id = p_profile_id and status = 'pending'
    order by submitted_at desc
    limit 1;
  end if;

  return jsonb_build_object('id',v_id,'profile_id',p_profile_id,'requested_role',v_role,'status','pending');
end;
$$;

create or replace function public.list_professional_applications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;

  -- Migra automaticamente contas antigas que foram marcadas como profissionais,
  -- mas ainda não receberam aprovação/login profissional.
  insert into public.professional_applications(profile_id, requested_role, status, submitted_at)
  select
    p.id,
    case when p.is_editor and p.is_designer then 'editor_designer'
         when p.is_designer then 'designer'
         else 'editor' end,
    'pending',
    coalesce(p.created_at, now())
  from public.profile p
  where (p.is_editor or p.is_designer)
    and coalesce(p.professional_login_enabled,false) = false
    and coalesce(p.is_public,false) = false
    and not exists (
      select 1 from public.professional_applications a
      where a.profile_id=p.id and a.status='pending'
    );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',a.id,'profile_id',a.profile_id,'requested_role',a.requested_role,
      'status',a.status,'submitted_at',a.submitted_at,'reviewed_at',a.reviewed_at,
      'reviewed_by',a.reviewed_by,'note',a.note,
      'profile',jsonb_build_object(
        'id',p.id,'email',p.email,'nome',p.nome,'nome_artistico',p.nome_artistico,
        'especialidade',p.especialidade,'avatar_url',p.avatar_url,
        'is_editor',p.is_editor,'is_designer',p.is_designer,
        'is_public',p.is_public,'professional_login_enabled',p.professional_login_enabled
      )
    ) order by a.submitted_at desc
  ),'[]'::jsonb)
  into result
  from public.professional_applications a
  join public.profile p on p.id=a.profile_id
  where a.status='pending';

  return result;
end;
$$;

create or replace function public.decide_professional_application(
  p_application_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a public.professional_applications%rowtype;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;

  select * into a from public.professional_applications
  where id=p_application_id for update;

  if a.id is null then raise exception 'Solicitação não encontrada'; end if;

  if p_decision='approved' then
    update public.profile set
      professional_login_enabled=true,
      is_public=true,
      is_editor=(a.requested_role in ('editor','editor_designer')),
      is_designer=(a.requested_role in ('designer','editor_designer'))
    where id=a.profile_id;
    update public.professional_applications set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where id=a.id;
  elsif p_decision='rejected' then
    update public.profile set
      professional_login_enabled=false,is_public=false,is_editor=false,is_designer=false
    where id=a.profile_id;
    update public.professional_applications set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where id=a.id;
  else
    raise exception 'Decisão inválida';
  end if;

  return jsonb_build_object('id',a.id,'profile_id',a.profile_id,'status',p_decision);
end;
$$;

grant execute on function public.submit_professional_application(uuid,text,text,text,text) to authenticated;
grant execute on function public.list_professional_applications() to authenticated;
grant execute on function public.decide_professional_application(uuid,text) to authenticated;

commit;

select count(*) as total_solicitacoes
from public.professional_applications
where status='pending';
