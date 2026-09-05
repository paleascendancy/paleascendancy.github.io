-- Pale Ascendancy — Appearance V1
-- Execute after the existing V24 SQL that creates is_admin().

create table if not exists public.site_settings (
  id boolean primary key default true check (id = true),
  settings jsonb not null default jsonb_build_object(
    'primary','#9fe8ff',
    'secondary','#a894ff',
    'background','#09080d',
    'text','#f7f4fb',
    'accent','#e9cf91'
  ),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "site settings public read" on public.site_settings;
create policy "site settings public read"
on public.site_settings for select
using (true);

create or replace function public.save_site_appearance(p_settings jsonb)
returns public.site_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned jsonb;
  result public.site_settings;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  cleaned := jsonb_build_object(
    'primary', lower(coalesce(p_settings->>'primary','#9fe8ff')),
    'secondary', lower(coalesce(p_settings->>'secondary','#a894ff')),
    'background', lower(coalesce(p_settings->>'background','#09080d')),
    'text', lower(coalesce(p_settings->>'text','#f7f4fb')),
    'accent', lower(coalesce(p_settings->>'accent','#e9cf91'))
  );

  if not (cleaned->>'primary' ~ '^#[0-9a-f]{6}$'
      and cleaned->>'secondary' ~ '^#[0-9a-f]{6}$'
      and cleaned->>'background' ~ '^#[0-9a-f]{6}$'
      and cleaned->>'text' ~ '^#[0-9a-f]{6}$'
      and cleaned->>'accent' ~ '^#[0-9a-f]{6}$') then
    raise exception 'Uma ou mais cores são inválidas';
  end if;

  update public.site_settings
     set settings = cleaned,
         updated_at = now()
   where id = true
   returning * into result;

  return result;
end;
$$;

revoke all on function public.save_site_appearance(jsonb) from public;
grant execute on function public.save_site_appearance(jsonb) to anon, authenticated;
