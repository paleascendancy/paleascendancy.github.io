-- Pale Ascendancy V4.3 — correção de acesso profissional e reparo de aprovações

create or replace function public.decide_professional_application(p_application_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare a public.professional_applications%rowtype;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into a from public.professional_applications where id=p_application_id for update;
  if a.id is null then raise exception 'Solicitação não encontrada'; end if;

  if p_decision='approved' then
    update public.profile set
      professional_login_enabled=true,
      is_public=true,
      is_editor=(a.requested_role in ('editor','editor_designer')),
      is_designer=(a.requested_role in ('designer','editor_designer'))
    where id=a.profile_id;

    update public.professional_applications set
      status='approved',
      professional_login_enabled=true,
      reviewed_at=now(),
      reviewed_by=auth.uid()
    where id=a.id;
  elsif p_decision='rejected' then
    update public.profile set
      professional_login_enabled=false,
      is_public=false,
      is_editor=false,
      is_designer=false
    where id=a.profile_id;

    update public.professional_applications set
      status='rejected',
      professional_login_enabled=false,
      reviewed_at=now(),
      reviewed_by=auth.uid()
    where id=a.id;
  else
    raise exception 'Decisão inválida';
  end if;

  return jsonb_build_object('id',a.id,'profile_id',a.profile_id,'status',p_decision);
end;
$$;

create or replace function public.review_professional_application(p_application_id uuid,p_decision text)
returns public.professional_applications
language plpgsql
security definer
set search_path=public
as $$
declare app public.professional_applications; result public.professional_applications;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;

  select * into app from public.professional_applications where id=p_application_id for update;
  if app.id is null then raise exception 'Solicitação não encontrada'; end if;
  if app.status <> 'pending' then raise exception 'Esta solicitação já foi analisada'; end if;

  if p_decision='approved' then
    update public.profile set
      is_editor=(app.requested_role in ('editor','editor_designer')),
      is_designer=(app.requested_role in ('designer','editor_designer')),
      professional_login_enabled=true,
      is_public=true
    where id=app.profile_id;
  else
    update public.profile set
      professional_login_enabled=false,
      is_public=false,
      is_editor=false,
      is_designer=false
    where id=app.profile_id;
  end if;

  update public.professional_applications set
    status=p_decision,
    professional_login_enabled=(p_decision='approved'),
    reviewed_at=now(),
    reviewed_by=auth.uid()
  where id=app.id returning * into result;

  return result;
end;
$$;

-- Corrige solicitações pendentes criadas pelo fluxo antigo para contas que já eram profissionais.
with accidental as (
  select a.id,a.profile_id
  from public.professional_applications a
  join public.profile p on p.id=a.profile_id
  where a.status='pending' and (p.is_editor=true or p.is_designer=true)
)
update public.professional_applications a set
  status='approved',
  professional_login_enabled=true,
  reviewed_at=coalesce(reviewed_at,now())
from accidental x where a.id=x.id;

begin;
alter table public.profile disable trigger protect_professional_account_fields;

with latest_approved as (
  select distinct on (profile_id) profile_id,requested_role
  from public.professional_applications
  where status='approved'
  order by profile_id,coalesce(reviewed_at,submitted_at,created_at) desc
)
update public.profile p set
  is_editor=(a.requested_role in ('editor','editor_designer')),
  is_designer=(a.requested_role in ('designer','editor_designer')),
  professional_login_enabled=true,
  is_public=true
from latest_approved a where p.id=a.profile_id;

update public.professional_applications
set professional_login_enabled=true
where status='approved';

alter table public.profile enable trigger protect_professional_account_fields;
commit;

create or replace function public.protect_professional_account_fields()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then
    new.is_editor := old.is_editor;
    new.is_designer := old.is_designer;
    new.is_featured := old.is_featured;
    new.professional_login_enabled := old.professional_login_enabled;
    new.professional_plan := old.professional_plan;
    new.portfolio_limit := old.portfolio_limit;
    new.plan_status := old.plan_status;
    new.plan_expires_at := old.plan_expires_at;
    new.id := old.id;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;