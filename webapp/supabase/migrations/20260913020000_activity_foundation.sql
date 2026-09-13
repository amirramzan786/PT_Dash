-- Sprint 01 activity foundation. This is intentionally additive: it preserves
-- the deployed daily_steps manual-entry contract while making future imported
-- activity explicit, deduplicable and owner-scoped.

alter table public.daily_steps
  add column if not exists distance_m integer,
  add column if not exists active_calories_kcal integer,
  add column if not exists workout_minutes integer,
  add column if not exists observed_at timestamptz,
  add column if not exists source_record_id text,
  add column if not exists timezone text,
  add column if not exists confidence numeric(3,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'daily_steps_distance_m_nonnegative') then
    alter table public.daily_steps add constraint daily_steps_distance_m_nonnegative check (distance_m is null or distance_m >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_steps_active_calories_nonnegative') then
    alter table public.daily_steps add constraint daily_steps_active_calories_nonnegative check (active_calories_kcal is null or active_calories_kcal >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_steps_workout_minutes_nonnegative') then
    alter table public.daily_steps add constraint daily_steps_workout_minutes_nonnegative check (workout_minutes is null or workout_minutes >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_steps_confidence_range') then
    alter table public.daily_steps add constraint daily_steps_confidence_range check (confidence is null or confidence between 0 and 1);
  end if;
end $$;

-- A provider record may be re-sent during sync, but must not become another
-- daily source total. Null is permitted for manual records and older data.
create unique index if not exists daily_steps_source_record_unique
  on public.daily_steps (user_id, source, source_record_id)
  where source_record_id is not null;

create table if not exists public.activity_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('apple_health', 'health_connect', 'samsung_health', 'garmin', 'fitbit', 'oura', 'whoop')),
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'sync_issue', 'disconnected')),
  scopes text[] not null default '{}'::text[],
  consented_at timestamptz,
  last_synced_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  disconnected_at timestamptz,
  imported_data_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.activity_connections enable row level security;

create policy "activity_connections_select_own" on public.activity_connections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "activity_connections_insert_own" on public.activity_connections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activity_connections_update_own" on public.activity_connections
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "activity_connections_delete_own" on public.activity_connections
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Explicit API access is still constrained by the owner-only policies above.
grant select, insert, update, delete on table public.activity_connections to authenticated;
