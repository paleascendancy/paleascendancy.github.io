-- PALE ASCENDANCY V27
-- Banco: autenticação separada, administração, profissionais, portfólio e tema global.
-- Execute este arquivo inteiro no Supabase SQL Editor.

create extension if not exists pgcrypto;

-- PERFIL
alter table public.profile enable row level security;
alter table public.profile add column if not exists is_editor boolean not null default false;
alter table public.profile add column if not exists is_designer boolean not null default false;
alter table public.profile add column if not exists is_featured boolean not null default false;
alter table public.profile add column if not exists editor_categories text[] not null default '{}';
alter table public.profile add column if not exists portfolio_url text;
alter table public.profile add column if not exists editor_software text;
alter table public.profile add column if not exists availability text not null default 'disponivel';
alter table public.profile add column if not exists professional_plan text not null default 'free';
alter table public.profile add column if not exists portfolio_limit integer not null default 2;
alter table public.profile add column if not exists plan_status text not null default 'inactive';
alter table public.profile add column if not exists plan_expires_at timestamptz;
alter table public.profile add column if not exists professional_application boolean not null default false;
alter table public.profile add column if not exists requested_role text;

-- PERFIL AUTOMÁTICO NO CADASTRO
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profile(id,email,nome,nome_artistico,especialidade,professional_application,requested_role)
  values(
    new.id,new.email,
    coalesce(new.raw_user_meta_data->>'nome',''),
    coalesce(new.raw_user_meta_data->>'nome_artistico',''),
    coalesce(new.raw_user_meta_data->>'especialidade',''),
    coalesce((new.raw_user_meta_data->>'professional_application')::boolean,false),
    new.raw_user_meta_data->>'requested_role'
  )
  on conflict(id) do update set
    email=excluded.email,
    nome=coalesce(nullif(excluded.nome,''),public.profile.nome),
    nome_artistico=coalesce(nullif(excluded.nome_artistico,''),public.profile.nome_artistico),
    especialidade=coalesce(nullif(excluded.especialidade,''),public.profile.especialidade),
    professional_application=excluded.professional_application,
    requested_role=excluded.requested_role;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- ADMINISTRAÇÃO
create table if not exists public.admin_users(
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(select 1 from public.admin_users where user_id=auth.uid());
$$;

create table if not exists public.admin_permissions(
  user_id uuid primary key references public.admin_users(user_id) on delete cascade,
  can_manage_professionals boolean not null default false,
  can_manage_theme boolean not null default false,
  can_manage_users boolean not null default false,
  can_manage_content boolean not null default false
);
alter table public.admin_permissions enable row level security;

create or replace function public.admin_can(permission_name text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when not public.is_admin() then false
    when exists(
      select 1 from public.admin_users a
      where a.user_id=auth.uid()
      and a.created_at=(select min(created_at) from public.admin_users)
    ) then true
    else coalesce((
      select case permission_name
        when 'professionals' then can_manage_professionals
        when 'theme' then can_manage_theme
        when 'users' then can_manage_users
        when 'content' then can_manage_content
        else false
      end
      from public.admin_permissions
      where user_id=auth.uid()
    ),false)
  end;
$$;

-- Só administradores podem consultar/alterar controles administrativos.
drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users for select to authenticated using(public.is_admin());
drop policy if exists admin_permissions_admin on public.admin_permissions;
create policy admin_permissions_admin on public.admin_permissions for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- POLÍTICAS DE PERFIL
drop policy if exists "Users can view their own profile" on public.profile;
drop policy if exists "Users can insert their own profile" on public.profile;
drop policy if exists "Users can update their own profile" on public.profile;
drop policy if exists "Admins can view all profiles" on public.profile;
drop policy if exists "Admins can update profiles" on public.profile;
create policy profile_select on public.profile for select to authenticated using(auth.uid()=id or public.is_admin());
create policy profile_insert on public.profile for insert to authenticated with check(auth.uid()=id);
create policy profile_update on public.profile for update to authenticated using(auth.uid()=id or public.is_admin()) with check(auth.uid()=id or public.is_admin());

-- Protege aprovação, plano e identidade de admin contra alterações do próprio usuário.
create or replace function public.protect_account_control_fields()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then
    new.id:=old.id;
    new.email:=old.email;
    new.created_at:=old.created_at;
    new.is_editor:=old.is_editor;
    new.is_designer:=old.is_designer;
    new.is_featured:=old.is_featured;
    new.professional_plan:=old.professional_plan;
    new.portfolio_limit:=old.portfolio_limit;
    new.plan_status:=old.plan_status;
    new.plan_expires_at:=old.plan_expires_at;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_account_control_fields on public.profile;
create trigger protect_account_control_fields before update on public.profile for each row execute procedure public.protect_account_control_fields();

-- PORTFÓLIO
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
create policy portfolio_owner_insert on public.editor_portfolio_items for insert to authenticated with check(auth.uid()=editor_id and exists(select 1 from public.profile p where p.id=auth.uid() and (p.is_editor or p.is_designer)));
drop policy if exists portfolio_owner_update on public.editor_portfolio_items;
create policy portfolio_owner_update on public.editor_portfolio_items for update to authenticated using(auth.uid()=editor_id) with check(auth.uid()=editor_id);
drop policy if exists portfolio_owner_delete on public.editor_portfolio_items;
create policy portfolio_owner_delete on public.editor_portfolio_items for delete to authenticated using(auth.uid()=editor_id or public.is_admin());

create or replace function public.enforce_portfolio_plan_limit()
returns trigger
language plpgsql
security definer
set search_path=public
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
create trigger enforce_portfolio_plan_limit before insert on public.editor_portfolio_items for each row execute procedure public.enforce_portfolio_plan_limit();

-- DIRETÓRIO PÚBLICO
drop view if exists public.editor_directory;
create view public.editor_directory as
select id,nome_artistico,especialidade,bio,avatar_url,tiktok,instagram,youtube,discord,
editor_categories,portfolio_url,editor_software,availability,is_featured,is_editor,is_designer,
professional_plan,plan_status,plan_expires_at
from public.profile where is_editor=true or is_designer=true;
grant select on public.editor_directory to anon,authenticated;

-- TEMA GLOBAL
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
create policy site_theme_admin_write on public.site_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());

insert into public.site_settings(id,theme)
values('global','{}'::jsonb)
on conflict(id) do nothing;

-- STORAGE: AVATARES E PORTFÓLIO
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

-- RPCs para administrar administradores sem expor a tabela.
create or replace function public.set_admin_by_email(target_email text)
returns boolean language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
 if not public.is_admin() then raise exception 'Acesso negado'; end if;
 select id into uid from auth.users where lower(email)=lower(trim(target_email)) limit 1;
 if uid is null then raise exception 'Conta não encontrada'; end if;
 insert into public.admin_users(user_id) values(uid) on conflict do nothing;
 insert into public.admin_permissions(user_id,can_manage_professionals,can_manage_theme,can_manage_users,can_manage_content)
 values(uid,true,true,false,false) on conflict(user_id) do nothing;
 return true;
end; $$;

create or replace function public.remove_admin_by_email(target_email text)
returns boolean language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
 if not public.is_admin() then raise exception 'Acesso negado'; end if;
 select id into uid from auth.users where lower(email)=lower(trim(target_email)) limit 1;
 if uid=auth.uid() then raise exception 'Você não pode revogar o próprio acesso'; end if;
 delete from public.admin_users where user_id=uid;
 return true;
end; $$;

-- Configuração inicial do limite conforme plano existente.
update public.profile set portfolio_limit=case professional_plan when 'premium' then 5 when 'pro' then 10 when 'studio' then 20 when 'elite' then 40 else 2 end;
