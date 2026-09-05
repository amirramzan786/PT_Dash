-- A snack is an optional food moment alongside the member's core meals.
-- Profiles are already owner-scoped by the existing profiles RLS policies; no
-- policy is broadened by these two columns.
alter table public.profiles
  add column if not exists snacks_enabled boolean not null default true,
  add column if not exists snack_preferences text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_snack_preferences_valid;

alter table public.profiles
  add constraint profiles_snack_preferences_valid
  check (snack_preferences <@ array['Sweet', 'Savoury', 'Fruity', 'Crunchy', 'High protein', 'Grab-and-go']::text[]);

comment on column public.profiles.snacks_enabled is 'Whether the member wants a snack section in their daily food diary.';
comment on column public.profiles.snack_preferences is 'Member-selected snack taste and convenience preferences used to prioritise snack defaults.';
