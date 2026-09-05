-- ============================================================
-- PALE ASCENDANCY V17
-- AUTH + PERFIS + ADMINISTRAÇÃO + DIRETÓRIO PÚBLICO
-- ============================================================

-- 1) RLS da tabela de perfis
alter table public.profile enable row level security;

-- 2) Campos usados pelo painel administrativo
alter table public.profile add column if not exists is_editor boolean not null default false;
alter table public.profile add column if not exists is_featured boolean not null default false;
alter table public.profile add column if not exists created_at timestamptz not null default now();

-- 3) Policies básicas do próprio usuário
drop policy if exists "Users can insert their own profile" on public.profile;
drop policy if exists "Users can view their own profile" on public.profile;
drop policy if exists "Users can update their own profile" on public.profile;

create policy "Users can insert their own profile" on public.profile for insert to authenticated with check (auth.uid() = id);
create policy "Users can view their own profile" on public.profile for select to authenticated using (auth.uid() = id);
create policy "Users can update their own profile" on public.profile for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 4) Perfil criado automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile (id,email,nome,nome_artistico,especialidade)
  values (new.id,new.email,new.raw_user_meta_data ->> 'nome',new.raw_user_meta_data ->> 'nome_artistico',new.raw_user_meta_data ->> 'especialidade')
  on conflict (id) do update set
    email = excluded.email,
    nome = excluded.nome,
    nome_artistico = excluded.nome_artistico,
    especialidade = excluded.especialidade;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- 5) Tabela de administradores. NÃO dê acesso direto a esta tabela ao público.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- 6) Função segura para descobrir se a sessão atual é administradora
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- 7) Admin pode ler/alterar perfis. Usuários continuam limitados ao próprio perfil.
drop policy if exists "Admins can view all profiles" on public.profile;
create policy "Admins can view all profiles" on public.profile for select to authenticated using (auth.uid() = id or public.is_admin());

drop policy if exists "Admins can update profiles" on public.profile;
create policy "Admins can update profiles" on public.profile for update to authenticated using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- 8) Diretório público seguro: não expõe e-mail nem outros campos privados.
drop view if exists public.editor_directory;
create view public.editor_directory as
select id,nome_artistico,especialidade,bio,avatar_url,tiktok,instagram,youtube,is_featured
from public.profile
where is_editor = true;

grant select on public.editor_directory to anon, authenticated;

-- ============================================================
-- 9) TORNE SUA CONTA ADMINISTRADORA
--
-- Substitua SEU_EMAIL_AQUI pelo e-mail exato da SUA conta
-- e execute APENAS este bloco depois de criar sua conta.
-- Isso faz com que somente essa conta entre no painel.
-- ============================================================

delete from public.admin_users;

insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('SEU_EMAIL_AQUI')
limit 1;

-- ============================================================
-- 10) Para liberar um perfil cadastrado como editor manualmente:
-- update public.profile set is_editor = true where email = 'EMAIL';
-- ============================================================
