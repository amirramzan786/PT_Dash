-- STEEL-71: explicit Coach/client relationship state and consent boundary.
-- This migration is additive and intentionally NOT applied remotely yet.
-- Legacy trainer_client_assignments remains useful for provisioning/seat
-- bookkeeping, but it must never grant Coach visibility by itself.

create table if not exists public.coach_client_relationships (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'invited' check (state in (
    'invited', 'accepted_pending_consent', 'active', 'paused',
    'transfer_pending', 'revoked', 'expired'
  )),
  version integer not null default 1 check (version > 0),
  invited_email text,
  invitation_token_hash text,
  invited_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  consent_version text,
  consent_domains text[] not null default '{}'::text[],
  consented_at timestamptz,
  paused_at timestamptz,
  paused_by uuid references auth.users(id) on delete set null,
  paused_reason text,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trainer_id, client_id),
  check (trainer_id <> client_id),
  check (invited_email is null or char_length(trim(invited_email)) between 3 and 320),
  check (consent_domains <@ array['coach_progress']::text[]),
  check (state <> 'active' or (consented_at is not null and 'coach_progress' = any(consent_domains)))
);

-- Keep a partially deployed table compatible with the full contract above.
alter table public.coach_client_relationships
  add column if not exists state text,
  add column if not exists version integer,
  add column if not exists invited_email text,
  add column if not exists invitation_token_hash text,
  add column if not exists invited_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists consent_version text,
  add column if not exists consent_domains text[] default '{}'::text[],
  add column if not exists consented_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists paused_by uuid,
  add column if not exists paused_reason text,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid,
  add column if not exists revoked_reason text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.coach_client_relationships
set state = coalesce(state, 'invited'),
    version = greatest(coalesce(version, 1), 1),
    consent_domains = coalesce(consent_domains, '{}'::text[]),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where state is null or version is null or consent_domains is null or created_at is null or updated_at is null;

alter table public.coach_client_relationships
  alter column state set default 'invited',
  alter column state set not null,
  alter column version set default 1,
  alter column version set not null,
  alter column consent_domains set default '{}'::text[],
  alter column consent_domains set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_relationship_state_allowed') then
    alter table public.coach_client_relationships add constraint coach_relationship_state_allowed
      check (state in ('invited', 'accepted_pending_consent', 'active', 'paused', 'transfer_pending', 'revoked', 'expired'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_relationship_not_self') then
    alter table public.coach_client_relationships add constraint coach_relationship_not_self
      check (trainer_id <> client_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_relationship_consent_domains_allowed') then
    alter table public.coach_client_relationships add constraint coach_relationship_consent_domains_allowed
      check (consent_domains <@ array['coach_progress']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_relationship_active_requires_consent') then
    alter table public.coach_client_relationships add constraint coach_relationship_active_requires_consent
      check (state <> 'active' or (consented_at is not null and 'coach_progress' = any(consent_domains)));
  end if;
end $$;

create index if not exists coach_relationship_client_state_idx
  on public.coach_client_relationships (client_id, state, updated_at desc);
create index if not exists coach_relationship_trainer_state_idx
  on public.coach_client_relationships (trainer_id, state, updated_at desc);
create unique index if not exists coach_relationship_one_active_client_idx
  on public.coach_client_relationships (client_id) where state = 'active';
create unique index if not exists coach_relationship_invitation_token_idx
  on public.coach_client_relationships (invitation_token_hash)
  where invitation_token_hash is not null;

alter table public.coach_client_relationships enable row level security;
revoke all on table public.coach_client_relationships from anon, authenticated;

-- A Coach read is valid only after client consent. Existing trainer policies
-- call this helper, so replacing it closes the legacy assignment-only path.
create or replace function private.is_trainer_for(target_user_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.coach_client_relationships r
    where r.trainer_id = (select auth.uid())
      and r.client_id = target_user_id
      and r.state = 'active'
      and r.consented_at is not null
      and 'coach_progress' = any(r.consent_domains)
  );
$$;

revoke all on function private.is_trainer_for(uuid) from public;
grant execute on function private.is_trainer_for(uuid) to authenticated;

create or replace function public.get_my_coach_relationships()
returns table (
  id uuid,
  trainer_id uuid,
  client_id uuid,
  state text,
  version integer,
  accepted_at timestamptz,
  consent_version text,
  consent_domains text[],
  consented_at timestamptz,
  paused_at timestamptz,
  paused_reason text,
  revoked_at timestamptz,
  revoked_reason text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select r.id, r.trainer_id, r.client_id, r.state, r.version,
    r.accepted_at, r.consent_version, r.consent_domains, r.consented_at,
    r.paused_at, r.paused_reason, r.revoked_at, r.revoked_reason,
    r.expires_at, r.created_at, r.updated_at
  from public.coach_client_relationships r
  where r.trainer_id = (select auth.uid()) or r.client_id = (select auth.uid())
  order by r.updated_at desc;
$$;

revoke all on function public.get_my_coach_relationships() from public, anon;
grant execute on function public.get_my_coach_relationships() to authenticated;

-- Invitation creation is server-only. The service passes a token hash; the
-- raw one-time token is delivered through the approved email path and never
-- stored or returned by this function.
create or replace function public.create_coach_invitation(
  p_trainer_id uuid,
  p_client_id uuid,
  p_invited_email text,
  p_invitation_token_hash text,
  p_expires_at timestamptz default now() + interval '7 days'
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_relationship public.coach_client_relationships;
  v_email text := lower(trim(coalesce(p_invited_email, '')));
begin
  if p_trainer_id is null or p_client_id is null or p_trainer_id = p_client_id then
    raise exception 'A valid trainer and different client are required.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.user_roles where user_id = p_trainer_id and role = 'trainer') then
    raise exception 'The account is not an approved trainer.' using errcode = '42501';
  end if;
  if char_length(v_email) < 3 or char_length(v_email) > 320 or position('@' in v_email) < 2 then
    raise exception 'A valid invitation email is required.' using errcode = '22023';
  end if;
  if p_invitation_token_hash is null or char_length(trim(p_invitation_token_hash)) < 32 then
    raise exception 'A one-time invitation token hash is required.' using errcode = '22023';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'The invitation expiry must be in the future.' using errcode = '22023';
  end if;

  select * into v_relationship
  from public.coach_client_relationships
  where trainer_id = p_trainer_id and client_id = p_client_id
  for update;

  if v_relationship.id is not null and v_relationship.state not in ('revoked', 'expired') then
    raise exception 'A non-terminal Coach relationship already exists.' using errcode = '23505';
  end if;

  if v_relationship.id is null then
    insert into public.coach_client_relationships (
      trainer_id, client_id, state, version, invited_email,
      invitation_token_hash, invited_at, expires_at
    ) values (
      p_trainer_id, p_client_id, 'invited', 1, v_email,
      trim(p_invitation_token_hash), now(), p_expires_at
    ) returning * into v_relationship;
  else
    update public.coach_client_relationships
    set state = 'invited', version = v_relationship.version + 1,
        invited_email = v_email, invitation_token_hash = trim(p_invitation_token_hash),
        invited_at = now(), expires_at = p_expires_at,
        accepted_at = null, consent_version = null, consent_domains = '{}'::text[],
        consented_at = null, paused_at = null, paused_by = null, paused_reason = null,
        revoked_at = null, revoked_by = null, revoked_reason = null, updated_at = now()
    where id = v_relationship.id
    returning * into v_relationship;
  end if;

  return jsonb_build_object(
    'id', v_relationship.id, 'trainer_id', v_relationship.trainer_id,
    'client_id', v_relationship.client_id, 'state', v_relationship.state,
    'version', v_relationship.version, 'invited_at', v_relationship.invited_at,
    'expires_at', v_relationship.expires_at
  );
end;
$$;

revoke all on function public.create_coach_invitation(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_coach_invitation(uuid, uuid, text, text, timestamptz) to service_role;

create or replace function public.accept_coach_invitation(p_relationship_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_relationship public.coach_client_relationships;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_relationship from public.coach_client_relationships where id = p_relationship_id for update;
  if v_relationship.id is null or v_relationship.client_id <> v_user_id then
    raise exception 'This invitation is not available to the signed-in client.' using errcode = '42501';
  end if;
  if v_relationship.state = 'accepted_pending_consent' then
    return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version);
  end if;
  if v_relationship.state <> 'invited' then
    raise exception 'This invitation is no longer available.' using errcode = '40901';
  end if;
  if v_relationship.expires_at is null or v_relationship.expires_at <= now() then
    update public.coach_client_relationships
    set state = 'expired', version = version + 1, invitation_token_hash = null, updated_at = now()
    where id = v_relationship.id;
    raise exception 'This invitation has expired.' using errcode = '41001';
  end if;

  update public.coach_client_relationships
  set state = 'accepted_pending_consent', version = version + 1,
      accepted_at = now(), invitation_token_hash = null, updated_at = now()
  where id = v_relationship.id
  returning * into v_relationship;
  return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version, 'accepted_at', v_relationship.accepted_at);
end;
$$;

revoke all on function public.accept_coach_invitation(uuid) from public, anon;
grant execute on function public.accept_coach_invitation(uuid) to authenticated;

create or replace function public.grant_coach_visibility(
  p_relationship_id uuid,
  p_consent_version text,
  p_consent_domains text[] default array['coach_progress']::text[]
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_relationship public.coach_client_relationships;
  v_user_id uuid := (select auth.uid());
  v_domains text[] := coalesce(p_consent_domains, '{}'::text[]);
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if p_consent_version is null or char_length(trim(p_consent_version)) < 1 then
    raise exception 'A consent version is required.' using errcode = '22023';
  end if;
  if not (v_domains <@ array['coach_progress']::text[]) or not ('coach_progress' = any(v_domains)) then
    raise exception 'Unsupported Coach consent domain.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select * into v_relationship from public.coach_client_relationships where id = p_relationship_id for update;
  if v_relationship.id is null or v_relationship.client_id <> v_user_id then
    raise exception 'This relationship is not controlled by the signed-in client.' using errcode = '42501';
  end if;
  if v_relationship.state = 'active' and v_relationship.consent_version = trim(p_consent_version)
     and v_relationship.consent_domains = v_domains then
    return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version, 'consented_at', v_relationship.consented_at);
  end if;
  if v_relationship.state not in ('accepted_pending_consent', 'paused') then
    raise exception 'The relationship is not awaiting consent.' using errcode = '40901';
  end if;
  if exists (select 1 from public.coach_client_relationships where client_id = v_user_id and state = 'active' and id <> v_relationship.id) then
    raise exception 'This client already has an active Coach relationship.' using errcode = '40902';
  end if;

  update public.coach_client_relationships
  set state = 'active', version = version + 1, consent_version = trim(p_consent_version),
      consent_domains = v_domains, consented_at = now(), paused_at = null,
      paused_by = null, paused_reason = null, updated_at = now()
  where id = v_relationship.id
  returning * into v_relationship;
  return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version, 'consent_version', v_relationship.consent_version, 'consent_domains', v_relationship.consent_domains, 'consented_at', v_relationship.consented_at);
exception when unique_violation then
  raise exception 'This client already has an active Coach relationship.' using errcode = '40902';
end;
$$;

revoke all on function public.grant_coach_visibility(uuid, text, text[]) from public, anon;
grant execute on function public.grant_coach_visibility(uuid, text, text[]) to authenticated;

create or replace function public.pause_coach_relationship(p_relationship_id uuid, p_reason text default null)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_relationship public.coach_client_relationships;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_relationship from public.coach_client_relationships where id = p_relationship_id for update;
  if v_relationship.id is null or (v_relationship.client_id <> v_user_id and v_relationship.trainer_id <> v_user_id and not private.is_admin()) then
    raise exception 'This relationship cannot be paused by the signed-in user.' using errcode = '42501';
  end if;
  if v_relationship.state = 'paused' then
    return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version);
  end if;
  if v_relationship.state not in ('active', 'transfer_pending') then
    raise exception 'Only active relationships can be paused.' using errcode = '40901';
  end if;

  update public.coach_client_relationships
  set state = 'paused', version = version + 1, paused_at = now(),
      paused_by = v_user_id, paused_reason = nullif(left(trim(coalesce(p_reason, '')), 240), ''),
      updated_at = now()
  where id = v_relationship.id
  returning * into v_relationship;
  return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version, 'paused_at', v_relationship.paused_at);
end;
$$;

revoke all on function public.pause_coach_relationship(uuid, text) from public, anon;
grant execute on function public.pause_coach_relationship(uuid, text) to authenticated;

create or replace function public.start_coach_transfer(p_relationship_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_relationship public.coach_client_relationships;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_relationship from public.coach_client_relationships where id = p_relationship_id for update;
  if v_relationship.id is null or v_relationship.client_id <> v_user_id then
    raise exception 'Only the client can start a Coach transfer.' using errcode = '42501';
  end if;
  if v_relationship.state = 'transfer_pending' then
    return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version);
  end if;
  if v_relationship.state <> 'active' then
    raise exception 'Only an active relationship can be transferred.' using errcode = '40901';
  end if;
  update public.coach_client_relationships
  set state = 'transfer_pending', version = version + 1, paused_at = now(),
      paused_by = v_user_id, paused_reason = 'coach_transfer', updated_at = now()
  where id = v_relationship.id
  returning * into v_relationship;
  return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version);
end;
$$;

revoke all on function public.start_coach_transfer(uuid) from public, anon;
grant execute on function public.start_coach_transfer(uuid) to authenticated;

create or replace function public.revoke_coach_relationship(p_relationship_id uuid, p_reason text default null)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_relationship public.coach_client_relationships;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_relationship from public.coach_client_relationships where id = p_relationship_id for update;
  if v_relationship.id is null or (v_relationship.client_id <> v_user_id and v_relationship.trainer_id <> v_user_id and not private.is_admin()) then
    raise exception 'This relationship cannot be revoked by the signed-in user.' using errcode = '42501';
  end if;
  if v_relationship.state = 'revoked' then
    return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version);
  end if;

  update public.coach_client_relationships
  set state = 'revoked', version = version + 1, revoked_at = now(), revoked_by = v_user_id,
      revoked_reason = nullif(left(trim(coalesce(p_reason, '')), 240), ''),
      invitation_token_hash = null, updated_at = now()
  where id = v_relationship.id
  returning * into v_relationship;
  return jsonb_build_object('id', v_relationship.id, 'state', v_relationship.state, 'version', v_relationship.version, 'revoked_at', v_relationship.revoked_at);
end;
$$;

revoke all on function public.revoke_coach_relationship(uuid, text) from public, anon;
grant execute on function public.revoke_coach_relationship(uuid, text) to authenticated;
