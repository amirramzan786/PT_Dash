-- STEEL-118: owner-scoped, read-only aggregate boundary for Steel AI Coach.
-- This migration is additive and intentionally NOT applied remotely yet.
-- The browser receives only the fields needed for deterministic insight rules;
-- raw health notes, meal content and exercise/set detail stay out of this
-- read model. No insight, conversation or plan state is written here.

create index if not exists sessions_user_date_idx
  on public.sessions (user_id, session_date desc);
create index if not exists meal_logs_user_date_idx
  on public.meal_logs (user_id, meal_date desc);
create index if not exists weight_checkins_user_date_idx
  on public.weight_checkins (user_id, checkin_date desc);

create or replace function public.get_my_ai_coach_aggregate()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_latest_checkin jsonb;
  v_recent_sessions integer;
  v_baseline_sessions integer;
  v_recent_meal_days integer;
  v_baseline_meal_days integer;
  v_recent_weight_count integer;
  v_baseline_weight_count integer;
  v_latest_weight numeric;
  v_earliest_weight numeric;
  v_has_active_programme boolean;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to read AI Coach signals.' using errcode = '42501';
  end if;

  -- Keep this payload deliberately aggregate-only. In particular, free-text
  -- check-in answers and meal names never cross the AI Coach boundary.
  select jsonb_build_object(
    'id', c.id,
    'week_start', c.week_start,
    'energy', c.energy,
    'sleep', c.sleep,
    'stress', c.stress,
    'soreness', c.soreness,
    'workouts_completed', c.workouts_completed,
    'nutrition_days', c.nutrition_days,
    'submitted_at', c.submitted_at
  )
  into v_latest_checkin
  from public.weekly_checkins c
  where c.user_id = v_user_id
  order by c.week_start desc, c.submitted_at desc
  limit 1;

  select count(*)::integer into v_recent_sessions
  from public.sessions s
  where s.user_id = v_user_id
    and s.session_date >= current_date - 13;

  select count(*)::integer into v_baseline_sessions
  from public.sessions s
  where s.user_id = v_user_id
    and s.session_date >= current_date - 27;

  select count(distinct m.meal_date)::integer into v_recent_meal_days
  from public.meal_logs m
  where m.user_id = v_user_id
    and m.meal_date >= current_date - 13;

  select count(distinct m.meal_date)::integer into v_baseline_meal_days
  from public.meal_logs m
  where m.user_id = v_user_id
    and m.meal_date >= current_date - 27;

  select count(*)::integer into v_recent_weight_count
  from public.weight_checkins w
  where w.user_id = v_user_id
    and w.checkin_date >= current_date - 27;

  select count(*)::integer into v_baseline_weight_count
  from public.weight_checkins w
  where w.user_id = v_user_id
    and w.checkin_date >= current_date - 55;

  select w.weight_lb into v_latest_weight
  from public.weight_checkins w
  where w.user_id = v_user_id
    and w.checkin_date >= current_date - 27
  order by w.checkin_date desc
  limit 1;

  select w.weight_lb into v_earliest_weight
  from public.weight_checkins w
  where w.user_id = v_user_id
    and w.checkin_date >= current_date - 27
  order by w.checkin_date asc
  limit 1;

  select exists (
    select 1 from public.training_programmes p
    where p.user_id = v_user_id and p.status = 'active'
  ) into v_has_active_programme;

  return jsonb_build_object(
    'schema_version', 'ai-coach-aggregate-v1',
    'generated_at', now(),
    'windows', jsonb_build_object('recent_days', 14, 'baseline_days', 28),
    'latest_checkin', coalesce(v_latest_checkin, 'null'::jsonb),
    'training', jsonb_build_object(
      'logged_sessions_recent', coalesce(v_recent_sessions, 0),
      'logged_sessions_baseline', coalesce(v_baseline_sessions, 0),
      'has_active_programme', coalesce(v_has_active_programme, false)
    ),
    'nutrition', jsonb_build_object(
      'logged_days_recent', coalesce(v_recent_meal_days, 0),
      'logged_days_baseline', coalesce(v_baseline_meal_days, 0)
    ),
    'weight', jsonb_build_object(
      'checkins_recent', coalesce(v_recent_weight_count, 0),
      'checkins_baseline', coalesce(v_baseline_weight_count, 0),
      'latest_lb', v_latest_weight,
      'earliest_lb', v_earliest_weight
    )
  );
end;
$$;

revoke all on function public.get_my_ai_coach_aggregate() from public, anon, authenticated;
grant execute on function public.get_my_ai_coach_aggregate() to authenticated;
