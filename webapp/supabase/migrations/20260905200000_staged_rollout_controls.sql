-- Project Steel: staged rollout controls
--
-- This is intentionally a private, dormant control plane.  Alpha 20 remains
-- the only active phase.  It records the approved rollout phase without
-- altering the Founding 20 allocation rules or enabling later cohorts.

create table if not exists public.rollout_controls (
  id boolean primary key default true check (id),
  phase text not null default 'alpha20'
    check (phase in (
      'alpha20',
      'beta50',
      'extended_beta100',
      'controlled_early_access250',
      'release_candidate500',
      'public_launch'
    )),
  tester_target integer
    check (tester_target is null or tester_target in (20, 50, 100, 250, 500)),
  unrestricted_public_signup_enabled boolean not null default false,
  billing_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (
    (phase = 'alpha20' and tester_target = 20 and not unrestricted_public_signup_enabled and not billing_enabled)
    or (phase = 'beta50' and tester_target = 50 and not unrestricted_public_signup_enabled)
    or (phase = 'extended_beta100' and tester_target = 100 and not unrestricted_public_signup_enabled)
    or (phase = 'controlled_early_access250' and tester_target = 250 and not unrestricted_public_signup_enabled)
    or (phase = 'release_candidate500' and tester_target = 500 and not unrestricted_public_signup_enabled)
    or (phase = 'public_launch' and tester_target is null and unrestricted_public_signup_enabled)
  )
);

insert into public.rollout_controls (id, phase, tester_target)
values (true, 'alpha20', 20)
on conflict (id) do nothing;

alter table public.rollout_controls enable row level security;

-- The control plane has no browser-facing access.  A later, separately
-- reviewed admin/server endpoint may change it only after the relevant gate.
revoke all on table public.rollout_controls from anon, authenticated;

