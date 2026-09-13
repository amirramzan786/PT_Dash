-- Consent and privacy lifecycle for future native activity providers. The
-- provider connection is always separate from imported data deletion.

alter table public.activity_connections
  add column if not exists consent_version text;

-- This uses the caller's RLS context rather than privileged database access.
-- The deletes and audit timestamp update run in one transaction: if either
-- fails, neither change is committed. Only recognised imported provider
-- sources can be deleted, so a person's manual entries can never match.
create or replace function public.delete_activity_provider_data(p_provider text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'An authenticated user is required.';
  end if;

  if p_provider is null or p_provider not in ('apple_health', 'health_connect', 'samsung_health', 'garmin', 'fitbit', 'oura', 'whoop') then
    raise exception 'Unsupported activity provider.';
  end if;

  delete from public.daily_steps
  where user_id = (select auth.uid())
    and source = p_provider;

  update public.activity_connections
  set imported_data_deleted_at = now(),
      updated_at = now()
  where user_id = (select auth.uid())
    and provider = p_provider;
end;
$$;

revoke all on function public.delete_activity_provider_data(text) from public;
grant execute on function public.delete_activity_provider_data(text) to authenticated;
