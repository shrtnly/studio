-- =====================================================================
-- Talento Admin Dashboard: Leads, Candidates & Email Logs
-- Run this once in Supabase Dashboard -> SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- Helper: is the current auth user an approved admin?
create or replace function public.is_approved_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."Admin_User"
    where id::text = auth.uid()::text
      and coalesce(is_approved, false) = true
  );
$$;

-- ---------------------------------------------------------------------
-- LEADS: prospective clients / hiring partners / talent sources
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  company     text,
  source      text default 'Website',
  status      text not null default 'new'
              check (status in ('new','contacted','qualified','proposal','won','lost')),
  value       numeric,
  notes       text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CANDIDATES: applicants moving through the hiring pipeline
-- ---------------------------------------------------------------------
create table if not exists public.candidates (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  email             text,
  phone             text,
  job_id            text references public.jobs(id) on delete set null,
  stage             text not null default 'applied'
                    check (stage in ('applied','screening','interview','offer','hired','rejected')),
  rating            smallint check (rating between 0 and 5),
  resume_url        text,
  linkedin_url      text,
  experience_years  numeric,
  expected_salary   text,
  source            text default 'Careers Page',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists candidates_job_id_idx on public.candidates(job_id);
create index if not exists candidates_stage_idx  on public.candidates(stage);

-- ---------------------------------------------------------------------
-- EMAIL LOGS: history of emails composed from the dashboard
-- ---------------------------------------------------------------------
create table if not exists public.email_logs (
  id               uuid primary key default gen_random_uuid(),
  recipient_email  text not null,
  recipient_name   text,
  recipient_type   text check (recipient_type in ('candidate','lead','custom')),
  recipient_id     uuid,
  subject          text not null,
  body             text not null,
  template         text,
  status           text not null default 'sent',
  sent_by          uuid default auth.uid(),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

drop trigger if exists candidates_touch on public.candidates;
create trigger candidates_touch before update on public.candidates
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: only approved admins can read/write
-- ---------------------------------------------------------------------
alter table public.leads      enable row level security;
alter table public.candidates enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists "admins manage leads" on public.leads;
create policy "admins manage leads" on public.leads
  for all to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

drop policy if exists "admins manage candidates" on public.candidates;
create policy "admins manage candidates" on public.candidates
  for all to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

drop policy if exists "admins manage email logs" on public.email_logs;
create policy "admins manage email logs" on public.email_logs
  for all to authenticated
  using (public.is_approved_admin())
  with check (public.is_approved_admin());

-- Optional: allow the public careers site to submit applications.
-- Uncomment when you add an "Apply" form on /jobs/[jobId].
-- drop policy if exists "public can apply" on public.candidates;
-- create policy "public can apply" on public.candidates
--   for insert to anon with check (stage = 'applied');
