-- Project Steel: Founder entitlement compatibility repair.
--
-- The canonical membership table predates Alpha 20 and validates both its
-- plan keys and programme-change periods. Founders deliberately have no
-- self-service programme changes, but a period of zero violates that table's
-- valid range before the zero change-limit can take effect. Keep the zero
-- limit, retain a valid 28-day period, and explicitly recognise the two
-- server-managed entitlement plans that Steel now issues.

alter table public.membership_entitlements
  drop constraint if exists membership_entitlements_plan_key_check;

alter table public.membership_entitlements
  add constraint membership_entitlements_plan_key_check
  check (plan_key in (
    'foundation',
    'guided',
    'pt_coached',
    'steel-core-premium-founder-lifetime',
    'steel-premium-pt-sponsored'
  ));

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
  v_plan_key constant text := 'steel-core-premium-founder-lifetime';
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
    update public.beta_signups set status = 'expired', updated_at = now() where id = v_signup.id;
    raise exception 'This verification request has expired.' using errcode = '22023';
  end if;

  if v_signup.founding_number is not null and v_signup.status in ('verified', 'approved') then
    v_founder_number := v_signup.founding_number;
    v_status := v_signup.status;
    update public.beta_signups
    set user_id = coalesce(user_id, p_user_id), verified_at = coalesce(verified_at, now()), updated_at = now()
    where id = v_signup.id;
  elsif v_signup.status = 'expired' then
    raise exception 'This verification request has expired.' using errcode = '22023';
  elsif v_signup.status = 'waitlist' then
    v_status := 'waitlist';
    update public.beta_signups
    set user_id = coalesce(user_id, p_user_id), verified_at = coalesce(verified_at, now()), updated_at = now()
    where id = v_signup.id;
  elsif v_signup.status = 'rejected' then
    raise exception 'This beta signup cannot be completed.' using errcode = '42501';
  else
    select candidate::smallint into v_founder_number
    from generate_series(1, 20) as candidate
    where not exists (
      select 1 from public.beta_signups b
      where b.founding_number = candidate and b.status in ('verified', 'approved')
    )
    order by candidate
    limit 1;

    v_status := case when v_founder_number is null then 'waitlist' else 'verified' end;
    update public.beta_signups
    set user_id = p_user_id, status = v_status, founding_number = v_founder_number,
        verified_at = coalesce(verified_at, now()), updated_at = now()
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
      28, false, true, true, 'manual', null, now(), null,
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

  return jsonb_build_object('status', v_status, 'founding_number', v_founder_number, 'capacity', 20);
end;
$$;

revoke all on function public.complete_beta_verification(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_beta_verification(uuid, text) to service_role;

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
  where user_id = p_user_id and founding_number is not null and status in ('verified', 'approved')
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
    28, false, true, true, 'manual', null, now(), null,
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
    28, false, true, true, 'manual', null, now(), null,
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

revoke all on function public.admin_promote_waitlisted_signup(uuid) from public, anon, authenticated;
grant execute on function public.admin_promote_waitlisted_signup(uuid) to service_role;
