-- BASE V27
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


-- ADMIN PERMISSIONS
-- PALE ASCENDANCY — ADMIN PERMISSIONS V1
-- Execute once in Supabase SQL Editor.
-- Existing administrators are preserved. The first existing admin is marked as owner if none exists.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{"users":true,"professionals":true,"applications":true,"plans":true,"appearance":true,"content":true}'::jsonb;

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin','moderator'));

UPDATE public.admin_users
SET is_owner = true,
    role = 'admin',
    permissions = '{"users":true,"professionals":true,"applications":true,"plans":true,"appearance":true,"content":true}'::jsonb
WHERE user_id = (
  SELECT user_id FROM public.admin_users ORDER BY created_at ASC LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.admin_users WHERE is_owner = true);

CREATE OR REPLACE FUNCTION public.admin_has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users a
    WHERE a.user_id = auth.uid()
      AND (
        a.is_owner = true
        OR COALESCE((a.permissions ->> p_permission)::boolean, false) = true
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_access()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'user_id', a.user_id,
      'role', a.role,
      'is_owner', a.is_owner,
      'permissions', a.permissions
    )
    FROM public.admin_users a
    WHERE a.user_id = auth.uid()
  ), jsonb_build_object('is_owner',false,'role',null,'permissions','{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  role text,
  is_owner boolean,
  permissions jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.user_id, u.email::text, a.role, a.is_owner, a.permissions, a.created_at
  FROM public.admin_users a
  JOIN auth.users u ON u.id = a.user_id
  WHERE public.admin_has_permission('admins') OR EXISTS (
    SELECT 1 FROM public.admin_users me WHERE me.user_id = auth.uid() AND me.is_owner = true
  )
  ORDER BY a.is_owner DESC, a.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.upsert_admin_user(
  p_email text,
  p_role text,
  p_permissions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_permissions jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_owner = true) THEN
    RAISE EXCEPTION 'Somente o administrador principal pode gerenciar administradores';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'A conta com este e-mail ainda não existe na Pale Ascendancy';
  END IF;

  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION 'A conta principal não precisa ser adicionada novamente';
  END IF;

  IF p_role NOT IN ('admin','moderator') THEN
    RAISE EXCEPTION 'Nível administrativo inválido';
  END IF;

  v_permissions := COALESCE(p_permissions, '{}'::jsonb);
  INSERT INTO public.admin_users(user_id, role, is_owner, permissions)
  VALUES (v_user_id, p_role, false, v_permissions)
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        is_owner = false;

  RETURN jsonb_build_object('success',true,'user_id',v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_admin_user_role(
  p_user_id uuid,
  p_role text,
  p_permissions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_owner = true) THEN
    RAISE EXCEPTION 'Somente o administrador principal pode alterar permissões';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'O administrador principal não pode perder o acesso principal';
  END IF;

  IF p_role NOT IN ('admin','moderator') THEN
    RAISE EXCEPTION 'Nível administrativo inválido';
  END IF;

  UPDATE public.admin_users
  SET role = p_role,
      permissions = COALESCE(p_permissions,'{}'::jsonb),
      is_owner = false
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrador não encontrado';
  END IF;

  RETURN jsonb_build_object('success',true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_profile_id uuid,
  p_patch jsonb
)
RETURNS public.profile
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profile;
  v_patch jsonb := COALESCE(p_patch,'{}'::jsonb);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso administrativo necessário';
  END IF;

  IF (v_patch ? 'is_featured' OR v_patch ? 'professional_login_enabled' OR v_patch ? 'is_editor' OR v_patch ? 'is_designer')
     AND NOT public.admin_has_permission('professionals') THEN
    RAISE EXCEPTION 'Você não possui permissão para gerenciar profissionais';
  END IF;

  IF (v_patch ? 'professional_plan' OR v_patch ? 'portfolio_limit' OR v_patch ? 'plan_status' OR v_patch ? 'plan_expires_at')
     AND NOT public.admin_has_permission('plans') THEN
    RAISE EXCEPTION 'Você não possui permissão para gerenciar planos';
  END IF;

  UPDATE public.profile
  SET
    is_featured = CASE WHEN v_patch ? 'is_featured' THEN (v_patch->>'is_featured')::boolean ELSE is_featured END,
    professional_login_enabled = CASE WHEN v_patch ? 'professional_login_enabled' THEN (v_patch->>'professional_login_enabled')::boolean ELSE professional_login_enabled END,
    is_editor = CASE WHEN v_patch ? 'is_editor' THEN (v_patch->>'is_editor')::boolean ELSE is_editor END,
    is_designer = CASE WHEN v_patch ? 'is_designer' THEN (v_patch->>'is_designer')::boolean ELSE is_designer END,
    professional_plan = CASE WHEN v_patch ? 'professional_plan' THEN v_patch->>'professional_plan' ELSE professional_plan END,
    portfolio_limit = CASE WHEN v_patch ? 'portfolio_limit' THEN (v_patch->>'portfolio_limit')::integer ELSE portfolio_limit END,
    plan_status = CASE WHEN v_patch ? 'plan_status' THEN v_patch->>'plan_status' ELSE plan_status END,
    plan_expires_at = CASE WHEN v_patch ? 'plan_expires_at' THEN NULLIF(v_patch->>'plan_expires_at','')::timestamptz ELSE plan_expires_at END
  WHERE id = p_profile_id
  RETURNING * INTO v_profile;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  RETURN v_profile;
END;
$$;

-- Review of professional applications is restricted to the applications permission.
CREATE OR REPLACE FUNCTION public.review_professional_application(
    p_application_id uuid,
    p_decision text
)
RETURNS public.professional_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    app public.professional_applications;
    admin_profile uuid;
    result public.professional_applications;
BEGIN
    IF NOT public.admin_has_permission('applications') THEN
        RAISE EXCEPTION 'Você não possui permissão para analisar solicitações';
    END IF;
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Decisão inválida';
    END IF;
    SELECT id INTO admin_profile FROM public.profile WHERE id = auth.uid() LIMIT 1;
    SELECT * INTO app FROM public.professional_applications WHERE id = p_application_id FOR UPDATE;
    IF app.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
    IF app.status <> 'pending' THEN RAISE EXCEPTION 'Esta solicitação já foi analisada'; END IF;

    IF p_decision = 'approved' THEN
        UPDATE public.profile
        SET is_editor = (app.requested_role IN ('editor','editor_designer')),
            is_designer = (app.requested_role IN ('designer','editor_designer')),
            professional_login_enabled = true
        WHERE id = app.profile_id;
    ELSE
        UPDATE public.profile SET professional_login_enabled = false WHERE id = app.profile_id;
    END IF;

    UPDATE public.professional_applications
    SET status = p_decision, reviewed_at = now(), reviewed_by = admin_profile
    WHERE id = app.id
    RETURNING * INTO result;
    RETURN result;
END;
$$;

-- Appearance save requires the appearance permission.
-- This replaces the existing function if present, preserving its expected signature.
CREATE OR REPLACE FUNCTION public.save_site_appearance(p_settings jsonb)
RETURNS public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned jsonb;
  v_row public.site_settings;
BEGIN
  IF NOT public.admin_has_permission('appearance') THEN
    RAISE EXCEPTION 'Você não possui permissão para alterar a aparência';
  END IF;

  cleaned := jsonb_build_object(
    'primary', lower(coalesce(p_settings->>'primary','#9fe8ff')),
    'secondary', lower(coalesce(p_settings->>'secondary','#a894ff')),
    'background', lower(coalesce(p_settings->>'background','#09080d')),
    'text', lower(coalesce(p_settings->>'text','#f7f4fb')),
    'accent', lower(coalesce(p_settings->>'accent','#e9cf91')),
    'muted', lower(coalesce(p_settings->>'muted','#9c94a8')),
    'text_soft', lower(coalesce(p_settings->>'text_soft','#ddd6e8')),
    'line', coalesce(p_settings->>'line','rgba(235,225,250,.12)'),
    'line_strong', coalesce(p_settings->>'line_strong','rgba(235,225,250,.22)'),
    'button_mode', coalesce(p_settings->>'button_mode','gradient'),
    'surface_preset', coalesce(p_settings->>'surface_preset','obsidian'),
    'font_preset', coalesce(p_settings->>'font_preset','modern'),
    'card_bg', coalesce(p_settings->>'card_bg','rgba(12,10,17,.86)'),
    'card_border', coalesce(p_settings->>'card_border','rgba(255,255,255,.11)'),
    'card_shadow', coalesce(p_settings->>'card_shadow','0 18px 60px rgba(0,0,0,.22)'),
    'card_hover', coalesce(p_settings->>'card_hover','0 24px 70px rgba(0,0,0,.34)'),
    'radius', coalesce(p_settings->>'radius','22px'),
    'font_display', coalesce(p_settings->>'font_display','"Space Grotesk",system-ui,sans-serif'),
    'font_body', coalesce(p_settings->>'font_body','"Manrope",system-ui,sans-serif'),
    'font_mono', coalesce(p_settings->>'font_mono','"JetBrains Mono",monospace'),
    'button_text', lower(coalesce(p_settings->>'button_text','#061018'))
  );

  IF NOT (cleaned->>'primary' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'secondary' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'background' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'text' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'accent' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'muted' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'text_soft' ~ '^#[0-9a-f]{6}$'
      AND cleaned->>'button_mode' IN ('gradient','solid','outline','glass','minimal')
      AND cleaned->>'surface_preset' IN ('obsidian','glass','soft','neon','editorial','minimal')
      AND cleaned->>'font_preset' IN ('modern','editorial','clean','neo','elegant','technical')) THEN
    RAISE EXCEPTION 'Configuração visual inválida';
  END IF;

  UPDATE public.site_settings
     SET settings = cleaned, updated_at = now()
   WHERE id = true
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    INSERT INTO public.site_settings(id, settings) VALUES (true, cleaned) RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_admin_user(text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_user_role(uuid,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_professional_application(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_site_appearance(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- PREMIUM
-- PALE ASCENDANCY — PREMIUM PORTFOLIO V1
-- Premium: R$ 15/mês, 5 espaços, destaque visual e personalização de perfil.
-- Execute após o SQL V27/V24 de planos profissionais.

alter table public.profile
  add column if not exists premium_border text not null default 'minimal';

alter table public.profile
  add column if not exists premium_card_style text not null default 'elegant';

update public.profile
set premium_border = 'minimal'
where premium_border is null or premium_border not in ('minimal','aurora','pale','ascendancy','neon','obsidian');

update public.profile
set premium_card_style = 'elegant'
where premium_card_style is null or premium_card_style not in ('elegant','glass','showcase');

create or replace function public.enforce_premium_customization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_premium boolean;
begin
  active_premium := new.professional_plan = 'premium'
    and new.plan_status = 'active'
    and (new.plan_expires_at is null or new.plan_expires_at > now());

  if not active_premium and not public.is_admin() then
    new.premium_border := 'minimal';
    new.premium_card_style := 'elegant';
  end if;

  if new.premium_border not in ('minimal','aurora','pale','ascendancy','neon','obsidian') then
    new.premium_border := 'minimal';
  end if;

  if new.premium_card_style not in ('elegant','glass','showcase') then
    new.premium_card_style := 'elegant';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_premium_customization on public.profile;
create trigger enforce_premium_customization
before insert or update on public.profile
for each row execute procedure public.enforce_premium_customization();

drop view if exists public.editor_directory;
create view public.editor_directory as
select
  id, nome_artistico, especialidade, bio, avatar_url, tiktok, instagram, youtube, discord,
  editor_categories, portfolio_url, editor_software, availability, is_featured, is_editor, is_designer,
  professional_plan, plan_status, plan_expires_at, premium_border, premium_card_style
from public.profile
where is_editor = true or is_designer = true;

grant select on public.editor_directory to anon, authenticated;


-- PROFESSIONAL LOGIN FIX
-- PALE ASCENDANCY — CORREÇÃO DO LOGIN PROFISSIONAL V2
-- Nenhuma nova aprovação é necessária para profissionais já aprovados.
-- O login profissional considera a aprovação existente em is_editor/is_designer.
-- Este arquivo é apenas uma garantia/checagem de estrutura; o frontend V2 usa editor_directory.

-- Garante que o diretório público continue expondo somente profissionais aprovados.
create or replace view public.editor_directory as
select
  id, nome_artistico, especialidade, bio, avatar_url, tiktok, instagram, youtube, discord,
  editor_categories, portfolio_url, editor_software, availability, is_featured,
  is_editor, is_designer, professional_plan, plan_status, plan_expires_at,
  premium_border, premium_card_style
from public.profile
where is_editor = true or is_designer = true;

grant select on public.editor_directory to anon, authenticated;
