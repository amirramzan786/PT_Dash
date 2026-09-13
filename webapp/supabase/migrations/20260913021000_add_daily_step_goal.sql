-- Member-owned preference used by the Sprint 01 steps dashboard. This is
-- additive and uses the existing owner-only profiles RLS policy.
alter table public.profiles
  add column if not exists daily_step_goal integer not null default 10000
  check (daily_step_goal between 1000 and 100000);
