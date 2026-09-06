-- PALE ASCENDANCY V23
-- Editores + Designers + upload de foto + portfólio público
-- Execute TODO este arquivo no Supabase SQL Editor.

-- 1) Novos campos de atuação
alter table public.profile enable row level security;
alter table public.profile add column if not exists is_editor boolean not null default false;
alter table public.profile add column if not exists is_designer boolean not null default false;
alter table public.profile add column if not exists is_featured boolean not null default false;
alter table public.profile add column if not exists editor_categories text[] not null default '{}';
alter table public.profile add column if not exists portfolio_url text;
alter table public.profile add column if not exists editor_software text;
alter table public.profile add column if not exists availability text not null default 'disponivel';

-- 2) Impede que um usuário transforme a própria conta em editor/designer ou destaque.
-- O administrador continua podendo alterar essas colunas pelo painel.
create or replace function public.protect_professional_flags()
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
    new.id := old.id;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_professional_flags on public.profile;
create trigger protect_professional_flags
before update on public.profile
for each row execute procedure public.protect_professional_flags();

-- 3) Diretório público: editores OU designers aprovados.
drop view if exists public.editor_directory;
create view public.editor_directory
as
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
  is_designer
from public.profile
where is_editor = true or is_designer = true;

grant select on public.editor_directory to anon, authenticated;

-- 4) Portfólio: cada item pertence a um único profissional.
create table if not exists public.editor_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  editor_id uuid not null references public.profile(id) on delete cascade,
  title text not null,
  description text,
  item_type text not null check (item_type in ('image','video','link')),
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.editor_portfolio_items enable row level security;

-- Público pode ver trabalhos apenas de profissionais aprovados.
drop policy if exists "Public can view professional portfolio" on public.editor_portfolio_items;
create policy "Public can view professional portfolio"
on public.editor_portfolio_items
for select
using (true);

-- O próprio profissional pode adicionar seus trabalhos.
drop policy if exists "Professionals can insert own portfolio" on public.editor_portfolio_items;
create policy "Professionals can insert own portfolio"
on public.editor_portfolio_items
for insert
to authenticated
with check (
  editor_id = auth.uid()
  and exists (
    select 1 from public.profile p
    where p.id = auth.uid()
      and (p.is_editor = true or p.is_designer = true)
  )
);

-- O próprio profissional pode editar seus trabalhos.
drop policy if exists "Professionals can update own portfolio" on public.editor_portfolio_items;
create policy "Professionals can update own portfolio"
on public.editor_portfolio_items
for update
to authenticated
using (editor_id = auth.uid())
with check (editor_id = auth.uid());

-- O próprio profissional pode excluir seus trabalhos.
drop policy if exists "Professionals can delete own portfolio" on public.editor_portfolio_items;
create policy "Professionals can delete own portfolio"
on public.editor_portfolio_items
for delete
to authenticated
using (editor_id = auth.uid());

-- 5) Buckets públicos para fotos de perfil e portfólio.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

-- Foto de perfil: cada usuário só grava na própria pasta <user_id>/...
drop policy if exists "Authenticated users can upload own avatar" on storage.objects;
create policy "Authenticated users can upload own avatar"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users can update own avatar" on storage.objects;
create policy "Authenticated users can update own avatar"
on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users can delete own avatar" on storage.objects;
create policy "Authenticated users can delete own avatar"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public can view avatars" on storage.objects;
create policy "Public can view avatars"
on storage.objects
for select to public
using (bucket_id = 'avatars');

-- Portfólio: só profissionais aprovados gravam na própria pasta.
drop policy if exists "Professionals can upload own portfolio files" on storage.objects;
create policy "Professionals can upload own portfolio files"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.profile p
    where p.id = auth.uid()
      and (p.is_editor = true or p.is_designer = true)
  )
);

drop policy if exists "Professionals can update own portfolio files" on storage.objects;
create policy "Professionals can update own portfolio files"
on storage.objects
for update to authenticated
using (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Professionals can delete own portfolio files" on storage.objects;
create policy "Professionals can delete own portfolio files"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public can view portfolio files" on storage.objects;
create policy "Public can view portfolio files"
on storage.objects
for select to public
using (bucket_id = 'portfolio');

-- 6) Índices úteis
create index if not exists editor_portfolio_items_editor_id_idx on public.editor_portfolio_items(editor_id);
create index if not exists editor_portfolio_items_order_idx on public.editor_portfolio_items(editor_id, sort_order, created_at desc);
