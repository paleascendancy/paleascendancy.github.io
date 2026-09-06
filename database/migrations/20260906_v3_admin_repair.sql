-- Pale Ascendancy V3 — admin repair
-- Execute in Supabase SQL Editor.
-- Repairs: permissions, global appearance, plan changes, public visibility and admin roles.

alter table public.admin_users
  add column if not exists role text not null default 'admin',
  add column if not exists is_owner boolean not null default false,
  add column if not exists permissions jsonb not null default '{}'::jsonb;

update public.admin_users
set permissions = coalesce(permissions,'{}'::jsonb) || jsonb_build_object(
  'users', true,
  'professionals', true,
  'applications', true,
  'plans', true,
  'appearance', true,
  'content', true,
  'admins', true
)
where is_owner = true;

update public.admin_users
set is_owner = true,
    role = 'admin',
    permissions = coalesce(permissions,'{}'::jsonb) || '{"users":true,"professionals":true,"applications":true,"plans":true,"appearance":true,"content":true,"admins":true}'::jsonb
where user_id = (
  select user_id from public.admin_users order by created_at asc limit 1
)
and not exists(select 1 from public.admin_users where is_owner = true);

create or replace function public.admin_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
      and (a.is_owner = true or coalesce((a.permissions->>p_permission)::boolean,false) = true)
  );
$$;

create or replace function public.admin_update_profile(
  p_profile_id uuid,
  p_patch jsonb
)
returns public.profile
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.profile;
  p jsonb := coalesce(p_patch,'{}'::jsonb);
  requested_plan text;
  requested_limit integer;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  if (p ? 'is_featured' or p ? 'professional_login_enabled' or p ? 'is_editor' or p ? 'is_designer')
     and not public.admin_has_permission('professionals') then
    raise exception 'Sem permissão para gerenciar profissionais';
  end if;

  if p ? 'is_public' and not public.admin_has_permission('content') then
    raise exception 'Sem permissão para gerenciar conteúdo';
  end if;

  if (p ? 'professional_plan' or p ? 'portfolio_limit' or p ? 'plan_status' or p ? 'plan_expires_at')
     and not public.admin_has_permission('plans') then
    raise exception 'Sem permissão para gerenciar planos';
  end if;

  requested_plan := case when p ? 'professional_plan' then p->>'professional_plan' else null end;
  if requested_plan is not null and requested_plan not in ('free','premium','pro','studio','elite') then
    raise exception 'Plano inválido';
  end if;

  requested_limit := case requested_plan
    when 'premium' then 5
    when 'pro' then 10
    when 'studio' then 20
    when 'elite' then 40
    when 'free' then 2
    else null
  end;

  update public.profile
  set
    is_featured = case when p ? 'is_featured' then (p->>'is_featured')::boolean else is_featured end,
    professional_login_enabled = case when p ? 'professional_login_enabled' then (p->>'professional_login_enabled')::boolean else professional_login_enabled end,
    is_editor = case when p ? 'is_editor' then (p->>'is_editor')::boolean else is_editor end,
    is_designer = case when p ? 'is_designer' then (p->>'is_designer')::boolean else is_designer end,
    is_public = case when p ? 'is_public' then (p->>'is_public')::boolean else is_public end,
    professional_plan = coalesce(requested_plan,professional_plan),
    portfolio_limit = case when requested_limit is not null then requested_limit when p ? 'portfolio_limit' then (p->>'portfolio_limit')::integer else portfolio_limit end,
    plan_status = case
      when requested_plan = 'free' then 'inactive'
      when requested_plan is not null then 'active'
      when p ? 'plan_status' then p->>'plan_status'
      else plan_status
    end,
    plan_expires_at = case when p ? 'plan_expires_at' then nullif(p->>'plan_expires_at','')::timestamptz else plan_expires_at end
  where id = p_profile_id
  returning * into v;

  if v.id is null then raise exception 'Perfil não encontrado'; end if;
  return v;
end;
$$;

grant execute on function public.admin_update_profile(uuid,jsonb) to authenticated;

-- The public directory must respect the admin visibility switch.
drop view if exists public.editor_directory;
create view public.editor_directory as
select
  id,nome_artistico,especialidade,bio,avatar_url,tiktok,instagram,youtube,discord,
  editor_categories,portfolio_url,editor_software,availability,is_featured,is_editor,is_designer,
  professional_plan,plan_status,plan_expires_at
from public.profile
where coalesce(is_public,false) = true
  and (coalesce(is_editor,false) = true or coalesce(is_designer,false) = true);
grant select on public.editor_directory to anon,authenticated;

-- Use the schema actually consumed by script.js/admin.html: id='global', theme jsonb.
create table if not exists public.site_settings(
  id text primary key,
  theme jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function public.save_site_appearance(p_settings jsonb)
returns public.site_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.site_settings;
begin
  if not public.admin_has_permission('appearance') then
    raise exception 'Sem permissão para alterar a aparência';
  end if;
  insert into public.site_settings(id,theme,updated_by,updated_at)
  values('global',coalesce(p_settings,'{}'::jsonb),auth.uid(),now())
  on conflict(id) do update
    set theme = excluded.theme,
        updated_by = auth.uid(),
        updated_at = now()
  returning * into v;
  return v;
end;
$$;
grant execute on function public.save_site_appearance(jsonb) to authenticated;

create or replace function public.list_admin_users()
returns table(user_id uuid,email text,role text,is_owner boolean,permissions jsonb,created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select a.user_id,u.email::text,a.role,a.is_owner,a.permissions,a.created_at
  from public.admin_users a
  join auth.users u on u.id=a.user_id
  where public.admin_has_permission('admins')
     or exists(select 1 from public.admin_users me where me.user_id=auth.uid() and me.is_owner=true)
  order by a.is_owner desc,a.created_at asc;
$$;
grant execute on function public.list_admin_users() to authenticated;

create or replace function public.update_admin_user_role(p_user_id uuid,p_role text,p_permissions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists(select 1 from public.admin_users where user_id=auth.uid() and is_owner=true) then
    raise exception 'Somente o administrador principal pode alterar cargos e permissões';
  end if;
  if p_role not in ('admin','moderator') then raise exception 'Cargo inválido'; end if;
  if p_user_id = auth.uid() then raise exception 'O administrador principal não pode alterar o próprio cargo por esta ação'; end if;
  update public.admin_users
     set role=p_role,
         permissions=coalesce(p_permissions,'{}'::jsonb),
         is_owner=false
   where user_id=p_user_id;
  if not found then raise exception 'Administrador não encontrado'; end if;
  return jsonb_build_object('success',true);
end;
$$;
grant execute on function public.update_admin_user_role(uuid,text,jsonb) to authenticated;

grant execute on function public.admin_has_permission(text) to authenticated;
notify pgrst,'reload schema';
