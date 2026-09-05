-- A personal step target is account data, so it lives with the existing profile
-- and is protected by the profile's existing owner-only RLS policy.
alter table public.profiles
  add column if not exists daily_step_goal integer not null default 10000
  check (daily_step_goal between 1000 and 100000);
