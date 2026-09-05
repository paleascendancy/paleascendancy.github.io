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
