-- Project Steel: verified Founding 20 beta access
--
-- This migration is intentionally additive. It keeps the marketing capture
-- records private, allocates Founders under a transaction lock, and uses the
-- existing membership_entitlements table when that table is already present.

create extension if not exists "pgcrypto";

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'approved', 'waitlist', 'rejected', 'expired')),
  verification_sent_at timestamptz,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  approved_at timestamptz,
  founding_number smallint unique
    check (founding_number is null or founding_number between 1 and 20),
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'marketing-site'
    check (char_length(source) between 1 and 80),
  last_request_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_signups_status_idx
  on public.beta_signups (status, founding_number);
create index if not exists beta_signups_user_id_idx
  on public.beta_signups (user_id)
  where user_id is not null;
create index if not exists beta_signups_expiry_idx
  on public.beta_signups (verification_expires_at)
  where status = 'pending';

-- IP addresses are never stored. The Edge Function stores only a keyed hash
-- with an expiry so this table can be safely cleaned without retaining raw IPs.
create table if not exists public.beta_rate_limits (
  scope text not null check (scope in ('email', 'ip')),
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (scope, key_hash)
);

create index if not exists beta_rate_limits_expiry_idx
  on public.beta_rate_limits (expires_at);

alter table public.beta_signups enable row level security;
alter table public.beta_rate_limits enable row level security;

-- No anon/authenticated policy is deliberate: raw signup rows and rate-limit
-- keys are only accessed by the privileged Edge Functions.
revoke all on table public.beta_signups from anon, authenticated;
revoke all on table public.beta_rate_limits from anon, authenticated;

-- Older Steel environments already have this table. The conditional column
-- additions retain compatibility with either the existing or a fresh schema.
create table if not exists public.membership_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_key text not null,
  plan_label text not null default 'Foundation',
  status text not null default 'active',
  plan_change_limit smallint not null default 1,
  plan_change_period_days smallint not null default 28,
  requires_trainer_approval boolean not null default true,
  training_access boolean not null default true,
  nutrition_access boolean not null default true,
  billing_provider text not null default 'manual',
  provider_customer_ref text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.membership_entitlements') is not null then
    alter table public.membership_entitlements add column if not exists plan_key text;
    alter table public.membership_entitlements add column if not exists plan_label text default 'Foundation';
    alter table public.membership_entitlements add column if not exists status text default 'active';
    alter table public.membership_entitlements add column if not exists plan_change_limit smallint default 1;
    alter table public.membership_entitlements add column if not exists plan_change_period_days smallint default 28;
    alter table public.membership_entitlements add column if not exists requires_trainer_approval boolean default true;
    alter table public.membership_entitlements add column if not exists training_access boolean default true;
    alter table public.membership_entitlements add column if not exists nutrition_access boolean default true;
    alter table public.membership_entitlements add column if not exists billing_provider text default 'manual';
    alter table public.membership_entitlements add column if not exists provider_customer_ref text;
    alter table public.membership_entitlements add column if not exists starts_at timestamptz default now();
    alter table public.membership_entitlements add column if not exists ends_at timestamptz;
    alter table public.membership_entitlements add column if not exists metadata jsonb default '{}'::jsonb;
    alter table public.membership_entitlements add column if not exists created_at timestamptz default now();
    alter table public.membership_entitlements add column if not exists updated_at timestamptz default now();
  end if;
end;
$$;

alter table public.membership_entitlements enable row level security;
revoke all on table public.membership_entitlements from anon;
grant select on table public.membership_entitlements to authenticated;

drop policy if exists "users read own membership entitlements" on public.membership_entitlements;
create policy "users read own membership entitlements"
  on public.membership_entitlements for select to authenticated
  using ((select auth.uid()) = user_id);

-- Atomic, idempotent rate-limit increment. It is callable only by the service
-- role used inside the Edge Functions, never by a browser client.
create or replace function public.consume_beta_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := now();
  v_row public.beta_rate_limits;
  v_allowed boolean;
  v_retry integer;
begin
  if p_scope not in ('email', 'ip') or p_key_hash is null or char_length(p_key_hash) < 32 then
    raise exception 'Invalid rate limit key.' using errcode = '22023';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration.' using errcode = '22023';
  end if;

  insert into public.beta_rate_limits (scope, key_hash, window_started_at, attempt_count, updated_at, expires_at)
  values (p_scope, p_key_hash, v_now, 1, v_now, v_now + make_interval(secs => p_window_seconds))
  on conflict (scope, key_hash) do update
    set attempt_count = case
      when public.beta_rate_limits.expires_at <= v_now then 1
      else public.beta_rate_limits.attempt_count + 1
    end,
    window_started_at = case
      when public.beta_rate_limits.expires_at <= v_now then v_now
      else public.beta_rate_limits.window_started_at
    end,
    updated_at = v_now,
    expires_at = case
      when public.beta_rate_limits.expires_at <= v_now then v_now + make_interval(secs => p_window_seconds)
      else public.beta_rate_limits.expires_at
    end
  returning * into v_row;

  v_allowed := v_row.attempt_count <= p_limit;
  v_retry := greatest(1, ceil(extract(epoch from (v_row.expires_at - v_now)))::integer);
  return jsonb_build_object('allowed', v_allowed, 'retry_after_seconds', v_retry);
end;
$$;

revoke all on function public.consume_beta_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_beta_rate_limit(text, text, integer, integer) to service_role;

-- Reserve a signup request under a row lock so two browser submissions cannot
-- both bypass the resend cooldown or create duplicate pending rows.
create or replace function public.reserve_beta_signup_request(
  p_email_normalized text,
  p_source text,
  p_cooldown_seconds integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := now();
  v_signup public.beta_signups;
  v_retry integer;
begin
  if p_email_normalized is null or p_email_normalized = '' or p_source is null or p_source = '' then
    raise exception 'Invalid beta signup request.' using errcode = '22023';
  end if;
  if p_cooldown_seconds < 1 then
    raise exception 'Invalid cooldown.' using errcode = '22023';
  end if;

  select * into v_signup
  from public.beta_signups
  where email_normalized = p_email_normalized
  for update;

  if found then
    if v_signup.status in ('verified', 'approved', 'waitlist') then
      return jsonb_build_object('allowed', false, 'existing_status', v_signup.status, 'signup_id', v_signup.id);
    end if;
    if v_signup.status = 'rejected' then
      return jsonb_build_object('allowed', false, 'existing_status', 'rejected', 'signup_id', v_signup.id);
    end if;
    if v_signup.status = 'pending' and v_signup.last_request_at is not null
      and v_signup.last_request_at > v_now - make_interval(secs => p_cooldown_seconds) then
      v_retry := greatest(1, ceil(extract(epoch from (v_signup.last_request_at + make_interval(secs => p_cooldown_seconds) - v_now)))::integer);
      return jsonb_build_object('allowed', false, 'existing_status', 'pending', 'retry_after_seconds', v_retry, 'signup_id', v_signup.id);
    end if;

    update public.beta_signups
    set status = 'pending',
        verification_expires_at = v_now + interval '24 hours',
        last_request_at = v_now,
        updated_at = v_now,
        source = left(p_source, 80)
    where id = v_signup.id;
    return jsonb_build_object('allowed', true, 'created', false, 'signup_id', v_signup.id);
  end if;

  insert into public.beta_signups (
    email, email_normalized, status, verification_expires_at, last_request_at, source
  ) values (
    p_email_normalized, p_email_normalized, 'pending', v_now + interval '24 hours', v_now, left(p_source, 80)
  ) returning id into v_signup.id;
  return jsonb_build_object('allowed', true, 'created', true, 'signup_id', v_signup.id);
end;
$$;

revoke all on function public.reserve_beta_signup_request(text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_beta_signup_request(text, text, integer) to service_role;

-- Completes a verified Auth magic-link journey and allocates the next available
-- Founder number. The advisory transaction lock serialises every allocation,
-- including the boundary between Founder #20 and the waitlist.
create or replace function public.complete_beta_verification(
  p_user_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_signup public.beta_signups;
  v_founder_number smallint;
  v_status text;
  v_plan_key text constant := 'steel-core-premium-founder-lifetime';
begin
  if p_user_id is null or v_email = '' then
    raise exception 'A verified account and email are required.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(187421, 20);

  select * into v_signup
  from public.beta_signups
  where email_normalized = v_email or user_id = p_user_id
  order by case when email_normalized = v_email then 0 else 1 end
  limit 1
  for update;

  if not found then
    raise exception 'No beta signup is linked to this account.' using errcode = 'P0002';
  end if;
  if v_signup.user_id is not null and v_signup.user_id <> p_user_id then
    raise exception 'This beta signup is linked to another account.' using errcode = '42501';
  end if;
  if v_signup.email_normalized <> v_email and v_signup.user_id is null then
    raise exception 'The verified email does not match the beta signup.' using errcode = '42501';
  end if;

  if v_signup.status = 'pending'
     and v_signup.verification_expires_at is not null
     and v_signup.verification_expires_at < now() then
    update public.beta_signups
    set status = 'expired', updated_at = now()
    where id = v_signup.id;
    raise exception 'This verification request has expired.' using errcode = '22023';
  end if;

  if v_signup.founding_number is not null and v_signup.status in ('verified', 'approved') then
    v_founder_number := v_signup.founding_number;
    v_status := v_signup.status;
    update public.beta_signups
    set user_id = coalesce(user_id, p_user_id),
        verified_at = coalesce(verified_at, now()),
        updated_at = now()
    where id = v_signup.id;
  elsif v_signup.status = 'expired' then
    raise exception 'This verification request has expired.' using errcode = '22023';
  elsif v_signup.status = 'waitlist' then
    v_status := 'waitlist';
    update public.beta_signups
    set user_id = coalesce(user_id, p_user_id),
        verified_at = coalesce(verified_at, now()),
        updated_at = now()
    where id = v_signup.id;
  elsif v_signup.status = 'rejected' then
    raise exception 'This beta signup cannot be completed.' using errcode = '42501';
  else
    select candidate::smallint into v_founder_number
    from generate_series(1, 20) as candidate
    where not exists (
      select 1 from public.beta_signups b
      where b.founding_number = candidate
        and b.status in ('verified', 'approved')
    )
    order by candidate
    limit 1;

    v_status := case when v_founder_number is null then 'waitlist' else 'verified' end;
    update public.beta_signups
    set user_id = p_user_id,
        status = v_status,
        founding_number = v_founder_number,
        verified_at = coalesce(verified_at, now()),
        updated_at = now()
    where id = v_signup.id;
  end if;

  if v_founder_number is not null then
    insert into public.membership_entitlements (
      user_id, plan_key, plan_label, status, plan_change_limit,
      plan_change_period_days, requires_trainer_approval, training_access,
      nutrition_access, billing_provider, provider_customer_ref,
      starts_at, ends_at, metadata, created_at, updated_at
    ) values (
      p_user_id, v_plan_key, 'Steel Premium · Founder lifetime', 'active', 0,
      0, false, true, true, 'manual', null, now(), null,
      jsonb_build_object('source', 'founding20', 'founding_number', v_founder_number, 'permanent', true),
      now(), now()
    )
    on conflict (user_id) do update
      set plan_key = excluded.plan_key,
          plan_label = excluded.plan_label,
          status = 'active',
          plan_change_limit = excluded.plan_change_limit,
          plan_change_period_days = excluded.plan_change_period_days,
          requires_trainer_approval = excluded.requires_trainer_approval,
          training_access = excluded.training_access,
          nutrition_access = excluded.nutrition_access,
          billing_provider = excluded.billing_provider,
          provider_customer_ref = null,
          starts_at = coalesce(public.membership_entitlements.starts_at, excluded.starts_at),
          ends_at = null,
          metadata = coalesce(public.membership_entitlements.metadata, '{}'::jsonb)
            || jsonb_build_object('source', 'founding20', 'founding_number', v_founder_number, 'permanent', true),
          updated_at = now();
  end if;

  return jsonb_build_object(
    'status', v_status,
    'founding_number', v_founder_number,
    'capacity', 20
  );
end;
$$;

revoke all on function public.complete_beta_verification(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_beta_verification(uuid, text) to service_role;

-- Admin reconciliation is kept server-side; the Edge Function checks user_roles
-- before invoking this function.
create or replace function public.reconcile_founder_entitlement(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_signup public.beta_signups;
begin
  select * into v_signup
  from public.beta_signups
  where user_id = p_user_id
    and founding_number is not null
    and status in ('verified', 'approved')
  order by founding_number
  limit 1;
  if not found then
    return jsonb_build_object('reconciled', false, 'reason', 'no_founder_allocation');
  end if;

  insert into public.membership_entitlements (
    user_id, plan_key, plan_label, status, plan_change_limit,
    plan_change_period_days, requires_trainer_approval, training_access,
    nutrition_access, billing_provider, provider_customer_ref,
    starts_at, ends_at, metadata, created_at, updated_at
  ) values (
    p_user_id, 'steel-core-premium-founder-lifetime', 'Steel Premium · Founder lifetime', 'active', 0,
    0, false, true, true, 'manual', null, now(), null,
    jsonb_build_object('source', 'founding20', 'founding_number', v_signup.founding_number, 'permanent', true),
    now(), now()
  )
  on conflict (user_id) do update
    set plan_key = excluded.plan_key,
        plan_label = excluded.plan_label,
        status = 'active',
        plan_change_limit = excluded.plan_change_limit,
        plan_change_period_days = excluded.plan_change_period_days,
        requires_trainer_approval = excluded.requires_trainer_approval,
        training_access = excluded.training_access,
        nutrition_access = excluded.nutrition_access,
        billing_provider = excluded.billing_provider,
        provider_customer_ref = null,
        starts_at = coalesce(public.membership_entitlements.starts_at, excluded.starts_at),
        ends_at = null,
        metadata = coalesce(public.membership_entitlements.metadata, '{}'::jsonb)
          || jsonb_build_object('source', 'founding20', 'founding_number', v_signup.founding_number, 'permanent', true),
        updated_at = now();
  return jsonb_build_object('reconciled', true, 'founding_number', v_signup.founding_number);
end;
$$;

revoke all on function public.reconcile_founder_entitlement(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_founder_entitlement(uuid) to service_role;

-- Cleanup is safe to run from a scheduled job or manually. Expired rows remain
-- as an audit state; only short-lived rate-limit keys are deleted.
create or replace function public.cleanup_beta_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_deleted integer;
begin
  delete from public.beta_rate_limits where expires_at < now();
  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted, 0);
end;
$$;
revoke all on function public.cleanup_beta_rate_limits() from public, anon, authenticated;
grant execute on function public.cleanup_beta_rate_limits() to service_role;
