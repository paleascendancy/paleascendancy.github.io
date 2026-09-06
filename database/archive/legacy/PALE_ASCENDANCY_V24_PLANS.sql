-- PALE ASCENDANCY V24
-- Planos profissionais + limite seguro de portfólio.
-- Execute este arquivo inteiro no Supabase SQL Editor.

alter table public.profile enable row level security;

alter table public.profile
add column if not exists professional_plan text not null default 'free';

alter table public.profile
add column if not exists portfolio_limit integer not null default 2;

alter table public.profile
add column if not exists plan_status text not null default 'inactive';

alter table public.profile
add column if not exists plan_expires_at timestamptz;

-- Normaliza dados antigos.
update public.profile
set professional_plan = 'free'
where professional_plan is null or professional_plan not in ('free','premium','pro','studio','elite');

update public.profile
set portfolio_limit = case professional_plan
  when 'premium' then 5
  when 'pro' then 10
  when 'studio' then 20
  when 'elite' then 40
  else 2
end;

update public.profile
set plan_status = case when professional_plan = 'free' then 'inactive' else coalesce(nullif(plan_status,''),'active') end;

-- Impede usuários comuns/profissionais de alterarem aprovação ou plano.
create or replace function public.protect_professional_account_fields()
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

drop trigger if exists protect_professional_flags on public.profile;
drop trigger if exists protect_professional_account_fields on public.profile;

create trigger protect_professional_account_fields
before update on public.profile
for each row
execute procedure public.protect_professional_account_fields();

-- Limite real no banco. O front-end também mostra o limite,
-- mas esta função impede que alguém burle o limite pelo navegador.
create or replace function public.enforce_portfolio_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  allowed_count integer;
  plan_code text;
  status_code text;
  expires_at timestamptz;
begin
  select professional_plan, plan_status, plan_expires_at
  into plan_code, status_code, expires_at
  from public.profile
  where id = new.editor_id;

  if plan_code is null or plan_code = 'free' or status_code <> 'active' or (expires_at is not null and expires_at <= now()) then
    allowed_count := 2;
  else
    allowed_count := case plan_code
      when 'premium' then 5
      when 'pro' then 10
      when 'studio' then 20
      when 'elite' then 40
      else 2
    end;
  end if;

  select count(*) into current_count
  from public.editor_portfolio_items
  where editor_id = new.editor_id;

  if current_count >= allowed_count then
    raise exception 'Limite do plano atingido: % espaços de portfólio.', allowed_count;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_portfolio_plan_limit on public.editor_portfolio_items;

create trigger enforce_portfolio_plan_limit
before insert on public.editor_portfolio_items
for each row
execute procedure public.enforce_portfolio_plan_limit();

-- Índice para o contador de portfólio.
create index if not exists editor_portfolio_items_editor_id_idx
on public.editor_portfolio_items(editor_id);

-- O diretório público continua sem e-mail e expõe o plano apenas
-- se a interface quiser mostrar o selo profissional.
drop view if exists public.editor_directory;

create view public.editor_directory as
select
  id,
  nome_artistico,
  especialidade,
  bio,
  avatar_url,
  tiktok,
  instagram,
  youtube,
  discord,
  editor_categories,
  portfolio_url,
  editor_software,
  availability,
  is_featured,
  is_editor,
  is_designer,
  professional_plan,
  plan_status,
  plan_expires_at
from public.profile
where is_editor = true or is_designer = true;

grant select on public.editor_directory to anon, authenticated;
