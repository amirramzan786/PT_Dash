-- Source-controlled reconciliation for the Coach application, review and
-- activation pipeline already used by the live pilot.

create table if not exists public.coach_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null default 'draft' check (state in ('draft','submitted','approved','returned','unpublished')),
  display_name text,
  headline text,
  bio text,
  specialties text[] not null default '{}',
  coaching_style text,
  ideal_client text,
  service_boundaries text,
  timezone text not null default 'Europe/London',
  availability_note text,
  qualification_status text not null default 'not_declared' check (qualification_status in ('not_declared','declared','verified')),
  insurance_status text not null default 'not_declared' check (insurance_status in ('not_declared','declared','verified')),
  safeguarding_acknowledged boolean not null default false,
  privacy_ai_agreement_acknowledged boolean not null default false,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(specialties) <= 6),
  check (state <> 'submitted' or (
    char_length(trim(coalesce(display_name,''))) between 2 and 80
    and char_length(trim(coalesce(headline,''))) between 8 and 120
    and char_length(trim(coalesce(bio,''))) between 80 and 1200
    and cardinality(specialties) > 0
    and qualification_status = 'declared'
    and insurance_status = 'declared'
    and safeguarding_acknowledged
    and privacy_ai_agreement_acknowledged
  ))
);

create table if not exists public.coach_applications (
  id uuid primary key default gen_random_uuid(),
  state text not null default 'submitted' check (state in ('submitted','in_review','returned','approved','activated','declined','withdrawn')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  email text not null check (email = lower(email) and char_length(email) between 5 and 254),
  location text,
  headline text not null check (char_length(trim(headline)) between 8 and 120),
  bio text not null check (char_length(trim(bio)) between 80 and 1600),
  specialties text[] not null default '{}' check (cardinality(specialties) between 1 and 6),
  coaching_style text,
  ideal_client text,
  availability_note text,
  qualification_declaration boolean not null default false,
  insurance_declaration boolean not null default false,
  right_to_coach_declaration boolean not null default false,
  safeguarding_acknowledged boolean not null default false,
  privacy_ai_agreement_acknowledged boolean not null default false,
  terms_acknowledged boolean not null default false,
  source text not null default 'marketing-site' check (source ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  reviewer_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (qualification_declaration and insurance_declaration and right_to_coach_declaration and safeguarding_acknowledged and privacy_ai_agreement_acknowledged and terms_acknowledged)
);

create table if not exists public.coach_application_audit (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.coach_applications(id) on delete cascade,
  action text not null check (action in ('review_started','returned','approved','declined','activated','unpublished')),
  note text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_directory_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  application_id uuid unique references public.coach_applications(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  headline text not null check (char_length(trim(headline)) between 8 and 120),
  bio text not null check (char_length(trim(bio)) between 80 and 1600),
  specialties text[] not null default '{}' check (cardinality(specialties) between 1 and 6),
  coaching_style text,
  ideal_client text,
  availability_note text,
  state text not null default 'approved' check (state in ('approved','unpublished')),
  approved_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists coach_profiles_review_queue_idx on public.coach_profiles (state, submitted_at) where state = 'submitted';
create unique index if not exists coach_applications_open_email_idx on public.coach_applications (email) where state in ('submitted','in_review','returned','approved');
create index if not exists coach_applications_review_queue_idx on public.coach_applications (state, created_at) where state in ('submitted','in_review');

alter table public.coach_profiles enable row level security;
alter table public.coach_applications enable row level security;
alter table public.coach_application_audit enable row level security;
alter table public.coach_directory_profiles enable row level security;

drop policy if exists "trainers can read their own coach profile" on public.coach_profiles;
create policy "trainers can read their own coach profile" on public.coach_profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "trainers can create their private coach application" on public.coach_profiles;
create policy "trainers can create their private coach application" on public.coach_profiles for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'trainer') and state in ('draft','submitted'));
drop policy if exists "trainers can edit drafts or returned coach applications" on public.coach_profiles;
create policy "trainers can edit drafts or returned coach applications" on public.coach_profiles for update to authenticated using ((select auth.uid()) = user_id and state in ('draft','returned') and exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'trainer')) with check ((select auth.uid()) = user_id and state in ('draft','submitted'));

drop policy if exists "Steel admins can review coach applications" on public.coach_applications;
create policy "Steel admins can review coach applications" on public.coach_applications for select to authenticated using (private.is_admin());
drop policy if exists "Steel admins can update coach applications" on public.coach_applications;
create policy "Steel admins can update coach applications" on public.coach_applications for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists "Steel admins can access coach application audit" on public.coach_application_audit;
create policy "Steel admins can access coach application audit" on public.coach_application_audit for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists "Steel admins manage coach directory profiles" on public.coach_directory_profiles;
create policy "Steel admins manage coach directory profiles" on public.coach_directory_profiles for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists "members can view approved coach directory profiles" on public.coach_directory_profiles;
create policy "members can view approved coach directory profiles" on public.coach_directory_profiles for select to authenticated using (state = 'approved' or private.is_admin() or (select auth.uid()) = user_id);

revoke all on public.coach_applications from anon, authenticated;
grant select, update on public.coach_applications to authenticated;
grant all on public.coach_applications to service_role;
revoke all on public.coach_application_audit from anon, authenticated;
grant select, insert on public.coach_application_audit to authenticated;
grant all on public.coach_application_audit to service_role;
revoke all on public.coach_profiles from anon;
grant all on public.coach_profiles to authenticated, service_role;
revoke all on public.coach_directory_profiles from anon;
grant all on public.coach_directory_profiles to authenticated, service_role;
