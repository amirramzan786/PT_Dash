-- Project Steel: approved membership rules.
-- 1) A member can regenerate their programme once every 28 days.
-- 2) A verified trainer can be provisioned with ten sponsored Premium seats.
-- These tables are operational truth; browsers never write grants or limits.

create table if not exists public.plan_change_windows (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_changed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_change_windows enable row level security;
revoke all on table public.plan_change_windows from anon, authenticated;

create or replace function public.enforce_programme_change_window()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_limit smallint := 1;
  v_period_days smallint := 28;
  v_last_changed_at timestamptz;
  v_has_previous_programme boolean;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select exists (
    select 1 from public.training_programmes p
    where p.user_id = new.user_id and p.id <> coalesce(new.id, gen_random_uuid())
  ) into v_has_previous_programme;

  -- The first programme comes from onboarding and is not treated as a change.
  if not v_has_previous_programme then
    return new;
  end if;

  select coalesce(e.plan_change_limit, 1), coalesce(e.plan_change_period_days, 28)
    into v_limit, v_period_days
  from public.membership_entitlements e
  where e.user_id = new.user_id and e.status = 'active';

  v_limit := coalesce(v_limit, 1);
  v_period_days := coalesce(v_period_days, 28);
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select last_changed_at into v_last_changed_at
  from public.plan_change_windows
  where user_id = new.user_id;

  if v_limit < 1 or (v_last_changed_at is not null and now() < v_last_changed_at + make_interval(days => greatest(v_period_days, 1))) then
    raise exception 'Your next programme review is available on %.', (v_last_changed_at + make_interval(days => greatest(v_period_days, 1)))::date
      using errcode = '42501';
  end if;

  insert into public.plan_change_windows (user_id, last_changed_at, updated_at)
  values (new.user_id, now(), now())
  on conflict (user_id) do update set last_changed_at = excluded.last_changed_at, updated_at = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists enforce_programme_change_window on public.training_programmes;
create trigger enforce_programme_change_window
before insert or update of status on public.training_programmes
for each row execute function public.enforce_programme_change_window();

create or replace function public.get_my_plan_change_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_last_changed_at timestamptz;
  v_period_days smallint := 28;
  v_next_change_at timestamptz;
  v_has_programme boolean;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;
  select exists (select 1 from public.training_programmes where user_id = v_user_id and status = 'active') into v_has_programme;
  select coalesce(plan_change_period_days, 28) into v_period_days
  from public.membership_entitlements where user_id = v_user_id and status = 'active';
  v_period_days := coalesce(v_period_days, 28);
  select last_changed_at into v_last_changed_at from public.plan_change_windows where user_id = v_user_id;
  v_next_change_at := case when v_last_changed_at is null then null else v_last_changed_at + make_interval(days => greatest(v_period_days, 1)) end;
  return jsonb_build_object(
    'period_days', greatest(v_period_days, 1),
    'has_programme', v_has_programme,
    'last_changed_at', v_last_changed_at,
    'next_change_at', v_next_change_at,
    'can_change_now', v_has_programme and (v_next_change_at is null or now() >= v_next_change_at)
  );
end;
$$;
revoke all on function public.get_my_plan_change_status() from public, anon;
grant execute on function public.get_my_plan_change_status() to authenticated;

create table if not exists public.trainer_premium_seat_pools (
  trainer_id uuid primary key references auth.users(id) on delete cascade,
  seat_limit smallint not null default 10 check (seat_limit between 0 and 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trainer_premium_grants (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  entitlement_applied boolean not null default false,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trainer_id, client_id),
  check (trainer_id <> client_id)
);
create unique index if not exists trainer_premium_one_active_grant_per_client_idx
  on public.trainer_premium_grants (client_id) where status = 'active';
create index if not exists trainer_premium_grants_trainer_idx
  on public.trainer_premium_grants (trainer_id, status, granted_at desc);

alter table public.trainer_premium_seat_pools enable row level security;
alter table public.trainer_premium_grants enable row level security;
revoke all on table public.trainer_premium_seat_pools, public.trainer_premium_grants from anon, authenticated;

-- Called only by a privileged backend after it has authenticated an admin. It
-- cannot replace Founder or future paid access, and locks the PT pool before
-- counting seats so two concurrent grants cannot exceed the limit.
create or replace function public.admin_grant_trainer_premium(
  p_trainer_id uuid,
  p_client_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_seat_limit smallint;
  v_active_seats integer;
  v_existing_plan text;
  v_entitlement_applied boolean := false;
begin
  if p_trainer_id is null or p_client_id is null or p_trainer_id = p_client_id then
    raise exception 'A valid trainer and a different client are required.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.user_roles where user_id = p_trainer_id and role = 'trainer') then
    raise exception 'The account is not an approved trainer.' using errcode = '42501';
  end if;

  insert into public.trainer_premium_seat_pools (trainer_id, seat_limit)
  values (p_trainer_id, 10)
  on conflict (trainer_id) do nothing;
  select seat_limit into v_seat_limit from public.trainer_premium_seat_pools
  where trainer_id = p_trainer_id and active = true for update;
  if v_seat_limit is null then
    raise exception 'This trainer has no active Premium seat pool.' using errcode = '42501';
  end if;

  select count(*) into v_active_seats from public.trainer_premium_grants
  where trainer_id = p_trainer_id and status = 'active';
  if v_active_seats >= v_seat_limit and not exists (
    select 1 from public.trainer_premium_grants where trainer_id = p_trainer_id and client_id = p_client_id and status = 'active'
  ) then
    raise exception 'All trainer Premium seats are in use.' using errcode = '42501';
  end if;

  insert into public.trainer_client_assignments (trainer_id, client_id, active)
  values (p_trainer_id, p_client_id, true)
  on conflict (trainer_id, client_id) do update set active = true;

  select plan_key into v_existing_plan from public.membership_entitlements where user_id = p_client_id for update;
  if v_existing_plan is null then
    insert into public.membership_entitlements (
      user_id, plan_key, plan_label, status, plan_change_limit, plan_change_period_days,
      requires_trainer_approval, training_access, nutrition_access, billing_provider, starts_at, metadata
    ) values (
      p_client_id, 'steel-premium-pt-sponsored', 'Steel Premium · PT access', 'active', 1, 28,
      false, true, true, 'manual', now(), jsonb_build_object('source', 'trainer_seat', 'trainer_id', p_trainer_id)
    );
    v_entitlement_applied := true;
  elsif v_existing_plan = 'steel-premium-pt-sponsored' then
    update public.membership_entitlements
    set status = 'active', ends_at = null, training_access = true, nutrition_access = true,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('source', 'trainer_seat', 'trainer_id', p_trainer_id), updated_at = now()
    where user_id = p_client_id;
    v_entitlement_applied := true;
  elsif v_existing_plan = 'steel-core-premium-founder-lifetime' then
    v_entitlement_applied := false;
  else
    raise exception 'This client already has a separate membership entitlement.' using errcode = '40901';
  end if;

  insert into public.trainer_premium_grants (trainer_id, client_id, status, entitlement_applied)
  values (p_trainer_id, p_client_id, 'active', v_entitlement_applied)
  on conflict (trainer_id, client_id) do update
  set status = 'active', entitlement_applied = excluded.entitlement_applied, revoked_at = null, updated_at = now();

  return jsonb_build_object('ok', true, 'entitlement_applied', v_entitlement_applied, 'seat_limit', v_seat_limit);
end;
$$;
revoke all on function public.admin_grant_trainer_premium(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_grant_trainer_premium(uuid, uuid) to service_role;
