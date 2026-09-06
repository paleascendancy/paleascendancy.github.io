-- Pale Ascendancy V3 — project requests
-- Execute in Supabase SQL Editor after reviewing on a test project.

create table if not exists public.project_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid null references auth.users(id) on delete set null,
  professional_id uuid null references public.profile(id) on delete set null,
  client_name text not null check (char_length(client_name) between 1 and 80),
  client_contact text not null check (char_length(client_contact) between 1 and 120),
  project_type text not null check (char_length(project_type) between 1 and 80),
  deadline_text text null check (char_length(coalesce(deadline_text,'')) <= 120),
  budget_text text null check (char_length(coalesce(budget_text,'')) <= 120),
  description text not null check (char_length(description) between 1 and 2500),
  references_text text null check (char_length(coalesce(references_text,'')) <= 1500),
  status text not null default 'new' check (status in ('new','reviewing','contacted','accepted','declined','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_requests enable row level security;

-- Anyone may submit a project request from the public briefing form.
-- Inserts are constrained to status=new and no arbitrary authenticated identity.
drop policy if exists "project_requests_public_insert" on public.project_requests;
create policy "project_requests_public_insert"
on public.project_requests for insert
to anon, authenticated
with check (
  status = 'new'
  and (client_id is null or client_id = auth.uid())
);

-- Logged-in clients can see requests tied to their own account.
drop policy if exists "project_requests_client_read" on public.project_requests;
create policy "project_requests_client_read"
on public.project_requests for select
to authenticated
using (client_id = auth.uid());

-- Professionals can see requests explicitly directed to their profile.
drop policy if exists "project_requests_professional_read" on public.project_requests;
create policy "project_requests_professional_read"
on public.project_requests for select
to authenticated
using (professional_id = auth.uid());

-- Existing admin helper controls administration access.
drop policy if exists "project_requests_admin_all" on public.project_requests;
create policy "project_requests_admin_all"
on public.project_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists project_requests_created_at_idx on public.project_requests(created_at desc);
create index if not exists project_requests_professional_id_idx on public.project_requests(professional_id);
create index if not exists project_requests_client_id_idx on public.project_requests(client_id);
create index if not exists project_requests_status_idx on public.project_requests(status);

comment on table public.project_requests is 'Project briefings submitted through Pale Ascendancy V3.';