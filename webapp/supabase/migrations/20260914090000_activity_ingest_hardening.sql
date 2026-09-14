-- STEEL-115: harden the authenticated activity ingest boundary before any
-- native provider writes are enabled in production.

-- Imported rows share the daily_steps table with manual entries. Keep the
-- source vocabulary closed so a client cannot introduce an unrecognised
-- provider that would evade the deletion and source-selection rules.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'daily_steps_source_allowed') then
    alter table public.daily_steps add constraint daily_steps_source_allowed
      check (source in ('manual', 'apple_health', 'health_connect', 'samsung_health', 'garmin', 'fitbit', 'oura', 'whoop'));
  end if;
end $$;

-- The existing owner predicates are retained, but the policies are scoped to
-- authenticated sessions explicitly. UPDATE keeps both USING and WITH CHECK
-- so a caller cannot move an activity row to another user.
drop policy if exists "daily_steps_select_own" on public.daily_steps;
drop policy if exists "daily_steps_insert_own" on public.daily_steps;
drop policy if exists "daily_steps_update_own" on public.daily_steps;
drop policy if exists "daily_steps_delete_own" on public.daily_steps;

create policy "daily_steps_select_own" on public.daily_steps
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "daily_steps_insert_own" on public.daily_steps
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "daily_steps_update_own" on public.daily_steps
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "daily_steps_delete_own" on public.daily_steps
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.daily_steps to authenticated;
