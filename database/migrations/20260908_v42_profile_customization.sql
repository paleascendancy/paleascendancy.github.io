-- Pale Ascendancy V4.2 — personalização de perfil profissional
-- Adiciona estilos de card e bordas de avatar escolhidos pelo próprio profissional.

alter table public.profile
  add column if not exists avatar_border_style text not null default 'minimal';

alter table public.profile
  add column if not exists profile_card_style text not null default 'editorial';

update public.profile
set avatar_border_style = 'minimal'
where avatar_border_style is null
   or avatar_border_style not in ('minimal','halo','aurora','chrome','circuit','pulse');

update public.profile
set profile_card_style = 'editorial'
where profile_card_style is null
   or profile_card_style not in ('editorial','glass','frame','spotlight');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profile_avatar_border_style_check'
  ) then
    alter table public.profile
      add constraint profile_avatar_border_style_check
      check (avatar_border_style in ('minimal','halo','aurora','chrome','circuit','pulse'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profile_card_style_check'
  ) then
    alter table public.profile
      add constraint profile_card_style_check
      check (profile_card_style in ('editorial','glass','frame','spotlight'));
  end if;
end $$;

create or replace view public.editor_directory as
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
  plan_expires_at,
  avatar_border_style,
  profile_card_style
from public.profile
where coalesce(is_public,false) = true
  and (coalesce(is_editor,false) = true or coalesce(is_designer,false) = true);

grant select on public.editor_directory to anon, authenticated;

comment on column public.profile.avatar_border_style is 'Borda visual escolhida pelo profissional para o avatar.';
comment on column public.profile.profile_card_style is 'Estilo visual escolhido pelo profissional para o card público.';
