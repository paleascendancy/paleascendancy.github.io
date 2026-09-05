-- PALE ASCENDANCY V2 — BASE COERENTE V27 → CONTENT
-- Execute este arquivo como uma única base SQL.
-- Ele é idempotente onde possível: cria/ajusta estruturas sem depender dos SQLs antigos.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. PERFIL
-- ============================================================
alter table public.profile enable row level security;
alter table public.profile add column if not exists is_editor boolean not null default false;
alter table public.profile add column if not exists is_designer boolean not null default false;
alter table public.profile add column if not exists is_featured boolean not null default false;
alter table public.profile add column if not exists is_public boolean not null default true;
alter table public.profile add column if not exists editor_categories text[] not null default '{}';
alter table public.profile add column if not exists portfolio_url text;
alter table public.profile add column if not exists editor_software text;
alter table public.profile add column if not exists availability text not null default 'disponivel';
alter table public.profile add column if not exists professional_plan text not null default 'free';
alter table public.profile add column if not exists portfolio_limit integer not null default 2;
alter table public.profile add column if not exists plan_status text not null default 'inactive';
alter table public.profile add column if not exists plan_expires_at timestamptz;
alter table public.profile add column if not exists professional_login_enabled boolean not null default false;
alter table public.profile add column if not exists professional_application boolean not null default false;
alter table public.profile add column if not exists requested_role text;

-- ============================================================
-- 2. CRIAÇÃO AUTOMÁTICA DO PERFIL + CANDIDATURA PROFISSIONAL
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_professional boolean := coalesce((new.raw_user_meta_data->>'professional_application')::boolean,false);
  v_role text := nullif(new.raw_user_meta_data->>'requested_role','');
begin
  insert into public.profile(id,email,nome,nome_artistico,especialidade,professional_application,requested_role)
  values(
    new.id,new.email,
    coalesce(new.raw_user_meta_data->>'nome',''),
    coalesce(new.raw_user_meta_data->>'nome_artistico',''),
    coalesce(new.raw_user_meta_data->>'especialidade',''),
    v_professional,
    v_role
  )
  on conflict(id) do update set
    email=excluded.email,
    nome=coalesce(nullif(excluded.nome,''),public.profile.nome),
    nome_artistico=coalesce(nullif(excluded.nome_artistico,''),public.profile.nome_artistico),
    especialidade=coalesce(nullif(excluded.especialidade,''),public.profile.especialidade),
    professional_application=excluded.professional_application,
    requested_role=excluded.requested_role;

  if v_professional and v_role in ('editor','designer','editor_designer') then
    insert into public.professional_applications(profile_id,requested_role,status,note)
    values(new.id,v_role,'pending',null)
    on conflict (profile_id) where status='pending' do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============================================================
-- 3. ADMINISTRAÇÃO
-- ============================================================
create table if not exists public.admin_users(
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users add column if not exists role text not null default 'admin';
alter table public.admin_users add column if not exists is_owner boolean not null default false;
alter table public.admin_users add column if not exists permissions jsonb not null default '{"users":true,"professionals":true,"applications":true,"plans":true,"appearance":true,"content":true,"admins":true}'::jsonb;
alter table public.admin_users enable row level security;

alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check check(role in ('admin','moderator'));

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.admin_users where user_id=auth.uid());
$$;

create or replace function public.admin_has_permission(p_permission text)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.admin_users a
    where a.user_id=auth.uid()
      and (a.is_owner=true or coalesce((a.permissions ->> p_permission)::boolean,false)=true)
  );
$$;

-- Compatibilidade com a estrutura antiga, sem depender dela no painel V2.
create table if not exists public.admin_permissions(
  user_id uuid primary key references public.admin_users(user_id) on delete cascade,
  can_manage_professionals boolean not null default false,
  can_manage_theme boolean not null default false,
  can_manage_users boolean not null default false,
  can_manage_content boolean not null default false
);
alter table public.admin_permissions enable row level security;

-- O primeiro administrador existente torna-se owner somente se ainda não houver owner.
update public.admin_users
set is_owner=true,
    role='admin',
    permissions='{"users":true,"professionals":true,"applications":true,"plans":true,"appearance":true,"content":true,"admins":true}'::jsonb
where user_id=(select user_id from public.admin_users order by created_at asc limit 1)
  and not exists(select 1 from public.admin_users where is_owner=true);

-- ============================================================
-- 4. POLÍTICAS DE PERFIL / ADMIN
-- ============================================================
drop policy if exists profile_select on public.profile;
create policy profile_select on public.profile for select to authenticated
using(auth.uid()=id or public.is_admin());

drop policy if exists profile_insert on public.profile;
create policy profile_insert on public.profile for insert to authenticated
with check(auth.uid()=id);

drop policy if exists profile_update on public.profile;
create policy profile_update on public.profile for update to authenticated
using(auth.uid()=id or public.is_admin())
with check(auth.uid()=id or public.is_admin());

drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users for select to authenticated
using(public.is_admin());

drop policy if exists admin_permissions_admin on public.admin_permissions;
create policy admin_permissions_admin on public.admin_permissions for all to authenticated
using(public.is_admin()) with check(public.is_admin());

-- ============================================================
-- 5. SOLICITAÇÕES PROFISSIONAIS
-- ============================================================
create table if not exists public.professional_applications(
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profile(id) on delete cascade,
  requested_role text not null check(requested_role in ('editor','designer','editor_designer')),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profile(id),
  note text
);
create unique index if not exists professional_applications_pending_unique
on public.professional_applications(profile_id) where status='pending';
alter table public.professional_applications enable row level security;

drop policy if exists professional_application_admin_read on public.professional_applications;
create policy professional_application_admin_read on public.professional_applications for select to authenticated
using(public.is_admin() or auth.uid()=profile_id);

drop policy if exists professional_application_self_insert on public.professional_applications;
create policy professional_application_self_insert on public.professional_applications for insert to authenticated
with check(auth.uid()=profile_id);

drop policy if exists professional_application_admin_update on public.professional_applications;
create policy professional_application_admin_update on public.professional_applications for update to authenticated
using(public.is_admin()) with check(public.is_admin());

create or replace function public.review_professional_application(
  p_application_id uuid,
  p_decision text
)
returns public.professional_applications
language plpgsql security definer set search_path=public
as $$
declare
  app public.professional_applications;
  result public.professional_applications;
begin
  if not public.admin_has_permission('applications') then
    raise exception 'Você não possui permissão para analisar solicitações';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'Decisão inválida';
  end if;
  select * into app from public.professional_applications where id=p_application_id for update;
  if app.id is null then raise exception 'Solicitação não encontrada'; end if;
  if app.status <> 'pending' then raise exception 'Esta solicitação já foi analisada'; end if;

  if p_decision='approved' then
    update public.profile
    set is_editor=(app.requested_role in ('editor','editor_designer')),
        is_designer=(app.requested_role in ('designer','editor_designer')),
        professional_login_enabled=true,
        professional_application=true,
        requested_role=app.requested_role
    where id=app.profile_id;
  else
    update public.profile set professional_login_enabled=false where id=app.profile_id;
  end if;

  update public.professional_applications
  set status=p_decision, reviewed_at=now(), reviewed_by=auth.uid()
  where id=app.id returning * into result;
  return result;
end;
$$;

grant execute on function public.review_professional_application(uuid,text) to authenticated;

-- ============================================================
-- 6. PORTFÓLIO / REELS
-- ============================================================
create table if not exists public.editor_portfolio_items(
  id uuid primary key default gen_random_uuid(),
  editor_id uuid not null references public.profile(id) on delete cascade,
  title text not null,
  description text,
  item_type text not null check(item_type in('image','video','link')),
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.editor_portfolio_items enable row level security;
create index if not exists editor_portfolio_items_editor_id_idx on public.editor_portfolio_items(editor_id);

drop policy if exists portfolio_public_read on public.editor_portfolio_items;
create policy portfolio_public_read on public.editor_portfolio_items for select using(true);
drop policy if exists portfolio_owner_insert on public.editor_portfolio_items;
create policy portfolio_owner_insert on public.editor_portfolio_items for insert to authenticated
with check(auth.uid()=editor_id and exists(select 1 from public.profile p where p.id=auth.uid() and (p.is_editor or p.is_designer)));
drop policy if exists portfolio_owner_update on public.editor_portfolio_items;
create policy portfolio_owner_update on public.editor_portfolio_items for update to authenticated
using(auth.uid()=editor_id) with check(auth.uid()=editor_id);
drop policy if exists portfolio_owner_delete on public.editor_portfolio_items;
create policy portfolio_owner_delete on public.editor_portfolio_items for delete to authenticated
using(auth.uid()=editor_id or public.is_admin());

create or replace function public.enforce_portfolio_plan_limit()
returns trigger language plpgsql security definer set search_path=public
as $$
declare n integer; allowed integer; p text; s text; e timestamptz;
begin
  select professional_plan,plan_status,plan_expires_at into p,s,e from public.profile where id=new.editor_id;
  if p is null or p='free' or s<>'active' or (e is not null and e<=now()) then allowed:=2;
  else allowed:=case p when 'premium' then 5 when 'pro' then 10 when 'studio' then 20 when 'elite' then 40 else 2 end; end if;
  select count(*) into n from public.editor_portfolio_items where editor_id=new.editor_id;
  if n>=allowed then raise exception 'Limite do plano atingido: % espaços de portfólio.',allowed; end if;
  return new;
end;
$$;
drop trigger if exists enforce_portfolio_plan_limit on public.editor_portfolio_items;
create trigger enforce_portfolio_plan_limit before insert on public.editor_portfolio_items
for each row execute procedure public.enforce_portfolio_plan_limit();

-- ============================================================
-- 7. DIRETÓRIO PÚBLICO / CONTENT
-- ============================================================
drop view if exists public.editor_directory;
create view public.editor_directory as
select id,nome_artistico,especialidade,bio,avatar_url,tiktok,instagram,youtube,discord,
       editor_categories,portfolio_url,editor_software,availability,is_featured,is_editor,is_designer,
       professional_plan,plan_status,plan_expires_at
from public.profile
where (is_editor=true or is_designer=true) and is_public=true;
grant select on public.editor_directory to anon,authenticated;

-- ============================================================
-- 8. APARÊNCIA GLOBAL
-- ============================================================
create table if not exists public.site_settings(
  id text primary key,
  theme jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists site_theme_public_read on public.site_settings;
create policy site_theme_public_read on public.site_settings for select using(id='global');
drop policy if exists site_theme_admin_write on public.site_settings;
create policy site_theme_admin_write on public.site_settings for all to authenticated
using(public.is_admin()) with check(public.is_admin());
insert into public.site_settings(id,theme) values('global','{}'::jsonb) on conflict(id) do nothing;

create or replace function public.save_site_appearance(p_settings jsonb)
returns public.site_settings
language plpgsql security definer set search_path=public
as $$
declare v_row public.site_settings;
begin
  if not public.admin_has_permission('appearance') then
    raise exception 'Você não possui permissão para alterar a aparência';
  end if;
  insert into public.site_settings(id,theme,updated_by,updated_at)
  values('global',coalesce(p_settings,'{}'::jsonb),auth.uid(),now())
  on conflict(id) do update set theme=excluded.theme,updated_by=excluded.updated_by,updated_at=now()
  returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.save_site_appearance(jsonb) to authenticated;

-- ============================================================
-- 9. FUNÇÕES DE ADMINISTRADORES
-- ============================================================
create or replace function public.get_admin_access()
returns jsonb language sql stable security definer set search_path=public
as $$
  select coalesce((select jsonb_build_object('user_id',a.user_id,'role',a.role,'is_owner',a.is_owner,'permissions',a.permissions)
  from public.admin_users a where a.user_id=auth.uid()),
  jsonb_build_object('is_owner',false,'role',null,'permissions','{}'::jsonb));
$$;

create or replace function public.list_admin_users()
returns table(user_id uuid,email text,role text,is_owner boolean,permissions jsonb,created_at timestamptz)
language sql security definer set search_path=public
as $$
  select a.user_id,u.email::text,a.role,a.is_owner,a.permissions,a.created_at
  from public.admin_users a join auth.users u on u.id=a.user_id
  where public.admin_has_permission('admins') or exists(select 1 from public.admin_users me where me.user_id=auth.uid() and me.is_owner=true)
  order by a.is_owner desc,a.created_at asc;
$$;

create or replace function public.upsert_admin_user(p_email text,p_role text,p_permissions jsonb)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_user_id uuid;
begin
  if not exists(select 1 from public.admin_users where user_id=auth.uid() and is_owner=true) then
    raise exception 'Somente o administrador principal pode gerenciar administradores';
  end if;
  select id into v_user_id from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'A conta com este e-mail ainda não existe na Pale Ascendancy'; end if;
  if v_user_id=auth.uid() then raise exception 'A conta principal não precisa ser adicionada novamente'; end if;
  if p_role not in ('admin','moderator') then raise exception 'Nível administrativo inválido'; end if;
  insert into public.admin_users(user_id,role,is_owner,permissions)
  values(v_user_id,p_role,false,coalesce(p_permissions,'{}'::jsonb))
  on conflict(user_id) do update set role=excluded.role,permissions=excluded.permissions,is_owner=false;
  return jsonb_build_object('success',true,'user_id',v_user_id);
end;
$$;

grant execute on function public.get_admin_access() to authenticated;
grant execute on function public.list_admin_users() to authenticated;
grant execute on function public.upsert_admin_user(text,text,jsonb) to authenticated;

create or replace function public.update_admin_user_role(p_user_id uuid,p_role text,p_permissions jsonb)
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.admin_users where user_id=auth.uid() and is_owner=true) then
    raise exception 'Somente o administrador principal pode alterar permissões';
  end if;
  if p_user_id=auth.uid() then raise exception 'O administrador principal não pode perder o acesso principal'; end if;
  if p_role not in ('admin','moderator') then raise exception 'Nível administrativo inválido'; end if;
  update public.admin_users set role=p_role,permissions=coalesce(p_permissions,'{}'::jsonb),is_owner=false where user_id=p_user_id;
  if not found then raise exception 'Administrador não encontrado'; end if;
  return jsonb_build_object('success',true);
end;
$$;
grant execute on function public.update_admin_user_role(uuid,text,jsonb) to authenticated;

create or replace function public.admin_update_profile(p_profile_id uuid,p_patch jsonb)
returns public.profile language plpgsql security definer set search_path=public
as $$
declare v public.profile; patch jsonb:=coalesce(p_patch,'{}'::jsonb);
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if (patch ? 'is_featured' or patch ? 'professional_login_enabled' or patch ? 'is_editor' or patch ? 'is_designer') and not public.admin_has_permission('professionals') then
    raise exception 'Você não possui permissão para gerenciar profissionais';
  end if;
  if patch ? 'is_public' and not public.admin_has_permission('content') then
    raise exception 'Você não possui permissão para gerenciar conteúdo';
  end if;
  if (patch ? 'professional_plan' or patch ? 'portfolio_limit' or patch ? 'plan_status' or patch ? 'plan_expires_at') and not public.admin_has_permission('plans') then
    raise exception 'Você não possui permissão para gerenciar planos';
  end if;
  update public.profile set
    is_featured=case when patch ? 'is_featured' then (patch->>'is_featured')::boolean else is_featured end,
    professional_login_enabled=case when patch ? 'professional_login_enabled' then (patch->>'professional_login_enabled')::boolean else professional_login_enabled end,
    is_editor=case when patch ? 'is_editor' then (patch->>'is_editor')::boolean else is_editor end,
    is_designer=case when patch ? 'is_designer' then (patch->>'is_designer')::boolean else is_designer end,
    is_public=case when patch ? 'is_public' then (patch->>'is_public')::boolean else is_public end,
    professional_plan=case when patch ? 'professional_plan' then patch->>'professional_plan' else professional_plan end,
    portfolio_limit=case when patch ? 'portfolio_limit' then (patch->>'portfolio_limit')::integer else portfolio_limit end,
    plan_status=case when patch ? 'plan_status' then patch->>'plan_status' else plan_status end,
    plan_expires_at=case when patch ? 'plan_expires_at' then nullif(patch->>'plan_expires_at','')::timestamptz else plan_expires_at end
  where id=p_profile_id returning * into v;
  if v.id is null then raise exception 'Perfil não encontrado'; end if;
  return v;
end;
$$;
grant execute on function public.admin_update_profile(uuid,jsonb) to authenticated;

-- ============================================================
-- 10. STORAGE
-- ============================================================
insert into storage.buckets(id,name,public) values('avatars','avatars',true) on conflict(id) do update set public=true;
insert into storage.buckets(id,name,public) values('portfolio','portfolio',true) on conflict(id) do update set public=true;

drop policy if exists avatar_public_read on storage.objects;
create policy avatar_public_read on storage.objects for select using(bucket_id='avatars');
drop policy if exists avatar_owner_insert on storage.objects;
create policy avatar_owner_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatar_owner_update on storage.objects;
create policy avatar_owner_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists portfolio_public_read on storage.objects;
create policy portfolio_public_read on storage.objects for select using(bucket_id='portfolio');
drop policy if exists portfolio_owner_insert on storage.objects;
create policy portfolio_owner_insert on storage.objects for insert to authenticated with check(bucket_id='portfolio' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists portfolio_owner_delete on storage.objects;
create policy portfolio_owner_delete on storage.objects for delete to authenticated using(bucket_id='portfolio' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

-- ============================================================
-- 11. LIMITES INICIAIS
-- ============================================================
update public.profile set portfolio_limit=case professional_plan when 'premium' then 5 when 'pro' then 10 when 'studio' then 20 when 'elite' then 40 else 2 end;
