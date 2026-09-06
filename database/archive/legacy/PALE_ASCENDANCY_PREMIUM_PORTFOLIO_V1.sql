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
