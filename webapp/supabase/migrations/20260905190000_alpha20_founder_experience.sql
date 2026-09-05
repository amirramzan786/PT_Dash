-- Project Steel Alpha 20: founder recognition, feedback, updates and minimal analytics.
-- This is additive and intentionally keeps public/anonymous access away from raw
-- signup, feedback and analytics data.

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in (
    'bug', 'friction', 'feature_request', 'training', 'nutrition', 'progress_recovery', 'other'
  )),
  message text not null check (char_length(trim(message)) between 1 and 4000),
  app_area text check (app_area is null or char_length(app_area) <= 80),
  triage_type text check (triage_type is null or triage_type in ('bug', 'friction', 'feature_request', 'value_signal')),
  severity smallint check (severity is null or severity between 1 and 4),
  triage_status text not null default 'new' check (triage_status in ('new', 'reviewing', 'planned', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists beta_feedback_user_created_idx on public.beta_feedback (user_id, created_at desc);
create index if not exists beta_feedback_triage_idx on public.beta_feedback (triage_status, created_at desc);
alter table public.beta_feedback enable row level security;
revoke all on table public.beta_feedback from anon;
grant select, insert on table public.beta_feedback to authenticated;
drop policy if exists "users read own beta feedback" on public.beta_feedback;
create policy "users read own beta feedback" on public.beta_feedback for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users create own beta feedback" on public.beta_feedback;
create policy "users create own beta feedback" on public.beta_feedback for insert to authenticated with check ((select auth.uid()) = user_id);

create table if not exists public.product_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 140),
  description text not null check (char_length(trim(description)) between 1 and 1000),
  category text check (category is null or category in ('training', 'nutrition', 'progress', 'ux', 'fix')),
  from_feedback boolean not null default false,
  release_key text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_updates_published_idx on public.product_updates (published_at desc) where published_at is not null;
alter table public.product_updates enable row level security;
revoke all on table public.product_updates from anon;
grant select on table public.product_updates to authenticated;
drop policy if exists "authenticated users read published product updates" on public.product_updates;
create policy "authenticated users read published product updates" on public.product_updates for select to authenticated using (published_at is not null and published_at <= now());

create table if not exists public.product_update_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  update_id uuid not null references public.product_updates(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, update_id)
);
alter table public.product_update_reads enable row level security;
revoke all on table public.product_update_reads from anon;
grant select, insert, update on table public.product_update_reads to authenticated;
drop policy if exists "users manage own product update reads" on public.product_update_reads;
create policy "users manage own product update reads" on public.product_update_reads for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'beta_signup_accepted', 'beta_email_verified', 'beta_founder_allocated', 'beta_waitlist_allocated',
    'beta_account_linked', 'verification_email_sent', 'onboarding_completed', 'activation_milestone', 'meaningful_return', 'feedback_submitted'
  )),
  user_id uuid references auth.users(id) on delete set null,
  signup_id uuid references public.beta_signups(id) on delete set null,
  source text check (source is null or source in ('hero', 'beta-section', 'marketing-site', 'other')),
  properties jsonb not null default '{}'::jsonb check (octet_length(properties::text) <= 2048),
  occurred_at timestamptz not null default now()
);
create index if not exists analytics_events_name_time_idx on public.analytics_events (event_name, occurred_at desc);
create index if not exists analytics_events_user_time_idx on public.analytics_events (user_id, occurred_at desc) where user_id is not null;
alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from anon, authenticated;

-- An authenticated user sees only their own confirmed Founder data. The
-- security-definer boundary is deliberate because beta_signups is otherwise
-- completely private to the service role.
create or replace function public.get_my_founder_status()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce((
    select jsonb_build_object(
      'status', b.status,
      'founder_number', b.founding_number,
      'has_lifetime_entitlement', exists (
        select 1 from public.membership_entitlements e
        where e.user_id = (select auth.uid())
          and e.plan_key = 'steel-core-premium-founder-lifetime'
          and e.status = 'active'
          and e.ends_at is null
      )
    )
    from public.beta_signups b
    where b.user_id = (select auth.uid())
      and b.status in ('verified', 'approved', 'waitlist')
    order by b.verified_at nulls last
    limit 1
  ), jsonb_build_object('status', 'none', 'founder_number', null, 'has_lifetime_entitlement', false));
$$;
revoke all on function public.get_my_founder_status() from public, anon;
grant execute on function public.get_my_founder_status() to authenticated;

create or replace function public.record_alpha_event(p_event_name text, p_properties jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_signup_id uuid;
  v_source text;
  v_activation_at timestamptz;
  v_return_bucket text;
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if p_event_name not in ('onboarding_completed', 'activation_milestone', 'meaningful_return', 'feedback_submitted') then
    raise exception 'Invalid analytics event.' using errcode = '22023';
  end if;
  if octet_length(coalesce(p_properties, '{}'::jsonb)::text) > 2048 then
    raise exception 'Analytics properties are too large.' using errcode = '22023';
  end if;
  select id, case when source in ('hero', 'beta-section', 'marketing-site') then source else 'other' end into v_signup_id, v_source
  from public.beta_signups where user_id = v_user_id order by verified_at nulls last limit 1;
  if p_event_name = 'activation_milestone' and exists (select 1 from public.analytics_events where user_id = v_user_id and event_name = 'activation_milestone') then return; end if;
  if p_event_name = 'meaningful_return' then
    select min(occurred_at) into v_activation_at from public.analytics_events
      where user_id = v_user_id and event_name = 'activation_milestone';
    if v_activation_at is null then return; end if;
    v_return_bucket := case
      when now() >= v_activation_at + interval '1 day' and now() < v_activation_at + interval '2 days' then 'd1'
      when now() >= v_activation_at + interval '5 days' and now() < v_activation_at + interval '10 days' then 'd7'
      when now() >= v_activation_at + interval '10 days' and now() < v_activation_at + interval '15 days' then 'd14'
      else null
    end;
    if v_return_bucket is null or exists (
      select 1 from public.analytics_events
      where user_id = v_user_id and event_name = 'meaningful_return'
        and properties ->> 'day_bucket' = v_return_bucket
    ) then return; end if;
    p_properties := coalesce(p_properties, '{}'::jsonb) || jsonb_build_object('day_bucket', v_return_bucket);
  end if;
  insert into public.analytics_events (event_name, user_id, signup_id, source, properties)
  values (p_event_name, v_user_id, v_signup_id, v_source, coalesce(p_properties, '{}'::jsonb));
end;
$$;
revoke all on function public.record_alpha_event(text, jsonb) from public, anon;
grant execute on function public.record_alpha_event(text, jsonb) to authenticated;

-- A founder entitlement is a permanent contract. Ordinary future plan writes
-- cannot silently replace it; authorised remediation explicitly deletes it.
create or replace function public.protect_founder_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if old.plan_key = 'steel-core-premium-founder-lifetime'
     and new.plan_key <> 'steel-core-premium-founder-lifetime' then
    raise exception 'A lifetime Founder entitlement cannot be overwritten.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_founder_entitlement on public.membership_entitlements;
create trigger protect_founder_entitlement before update on public.membership_entitlements
for each row execute function public.protect_founder_entitlement();

-- Database truth emits the authoritative acquisition/allocation records.
create or replace function public.track_alpha_signup_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.analytics_events (event_name, signup_id, source, properties)
    values ('beta_signup_accepted', new.id, case when new.source in ('hero', 'beta-section', 'marketing-site') then new.source else 'other' end, '{}'::jsonb);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('verified', 'waitlist', 'approved') then
    insert into public.analytics_events (event_name, user_id, signup_id, source, properties)
    values ('beta_email_verified', new.user_id, new.id, case when new.source in ('hero', 'beta-section', 'marketing-site') then new.source else 'other' end, jsonb_build_object('outcome', case when new.founding_number is null then 'waitlist' else 'founder' end));
    if new.user_id is not null then
      insert into public.analytics_events (event_name, user_id, signup_id, source, properties)
      values ('beta_account_linked', new.user_id, new.id, case when new.source in ('hero', 'beta-section', 'marketing-site') then new.source else 'other' end, '{}'::jsonb);
    end if;
    if new.founding_number is null then
      insert into public.analytics_events (event_name, user_id, signup_id, source, properties) values ('beta_waitlist_allocated', new.user_id, new.id, case when new.source in ('hero', 'beta-section', 'marketing-site') then new.source else 'other' end, '{}'::jsonb);
    else
      insert into public.analytics_events (event_name, user_id, signup_id, source, properties) values ('beta_founder_allocated', new.user_id, new.id, case when new.source in ('hero', 'beta-section', 'marketing-site') then new.source else 'other' end, jsonb_build_object('founding_number', new.founding_number));
    end if;
  elsif tg_op = 'UPDATE' and old.user_id is null and new.user_id is not null and new.status in ('verified', 'waitlist', 'approved') then
    insert into public.analytics_events (event_name, user_id, signup_id, source, properties)
    values ('beta_account_linked', new.user_id, new.id, case when new.source in ('hero', 'beta-section', 'marketing-site') then new.source else 'other' end, '{}'::jsonb);
  end if;
  return new;
end;
$$;
drop trigger if exists track_alpha_signup_event on public.beta_signups;
create trigger track_alpha_signup_event after insert or update of status, user_id on public.beta_signups for each row execute function public.track_alpha_signup_event();

-- These remediation procedures are callable only by the Edge Function's service
-- role after it has independently verified the caller's admin role. They keep
-- promotion/revocation and entitlement changes atomic in the database.
create or replace function public.admin_promote_waitlisted_signup(p_signup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_signup public.beta_signups%rowtype;
  v_number smallint;
begin
  perform pg_advisory_xact_lock(187421, 20);
  select * into v_signup from public.beta_signups where id = p_signup_id for update;
  if not found then raise exception 'Signup not found.' using errcode = 'P0002'; end if;
  if v_signup.status <> 'waitlist' or v_signup.user_id is null or v_signup.verified_at is null then
    raise exception 'Only a verified, linked waitlist signup may be promoted.' using errcode = '22023';
  end if;
  select slot into v_number from generate_series(1, 20) slot
  where not exists (select 1 from public.beta_signups where founding_number = slot)
  order by slot limit 1;
  if v_number is null then raise exception 'No Founder place is available.' using errcode = '22023'; end if;
  update public.beta_signups set status = 'approved', founding_number = v_number, approved_at = now(), updated_at = now()
    where id = p_signup_id;
  insert into public.membership_entitlements (
    user_id, plan_key, plan_label, status, plan_change_limit,
    plan_change_period_days, requires_trainer_approval, training_access,
    nutrition_access, billing_provider, provider_customer_ref,
    starts_at, ends_at, metadata, created_at, updated_at
  ) values (
    v_signup.user_id, 'steel-core-premium-founder-lifetime', 'Steel Premium — Lifetime Founding Access', 'active', 0,
    0, false, true, true, 'manual', null, now(), null,
    jsonb_build_object('source', 'founding20', 'founding_number', v_number, 'permanent', true), now(), now()
  ) on conflict (user_id) do update set
    plan_key = excluded.plan_key, plan_label = excluded.plan_label, status = 'active',
    plan_change_limit = excluded.plan_change_limit, plan_change_period_days = excluded.plan_change_period_days,
    requires_trainer_approval = excluded.requires_trainer_approval, training_access = excluded.training_access,
    nutrition_access = excluded.nutrition_access, billing_provider = excluded.billing_provider,
    provider_customer_ref = null, ends_at = null,
    metadata = coalesce(public.membership_entitlements.metadata, '{}'::jsonb) || excluded.metadata, updated_at = now();
  return jsonb_build_object('status', 'approved', 'founder_number', v_number);
end;
$$;

create or replace function public.admin_revoke_founder_signup(p_signup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_signup public.beta_signups%rowtype;
begin
  perform pg_advisory_xact_lock(187421, 20);
  select * into v_signup from public.beta_signups where id = p_signup_id for update;
  if not found then raise exception 'Signup not found.' using errcode = 'P0002'; end if;
  update public.beta_signups set status = 'rejected', founding_number = null, updated_at = now() where id = p_signup_id;
  if v_signup.user_id is not null and v_signup.founding_number is not null then
    delete from public.membership_entitlements where user_id = v_signup.user_id and plan_key = 'steel-core-premium-founder-lifetime';
  end if;
  return jsonb_build_object('status', 'rejected', 'had_founder_access', v_signup.founding_number is not null);
end;
$$;
revoke all on function public.admin_promote_waitlisted_signup(uuid), public.admin_revoke_founder_signup(uuid) from public, anon, authenticated;
grant execute on function public.admin_promote_waitlisted_signup(uuid), public.admin_revoke_founder_signup(uuid) to service_role;
