begin;

alter table public.nutrition_targets
  add column if not exists training_day_indices smallint[] not null default '{}'::smallint[],
  add column if not exists training_calories integer,
  add column if not exists training_protein_g integer,
  add column if not exists rest_calories integer,
  add column if not exists rest_protein_g integer;

alter table public.nutrition_targets
  drop constraint if exists nutrition_targets_training_day_indices_valid,
  drop constraint if exists nutrition_targets_training_calories_valid,
  drop constraint if exists nutrition_targets_training_protein_valid,
  drop constraint if exists nutrition_targets_rest_calories_valid,
  drop constraint if exists nutrition_targets_rest_protein_valid;

alter table public.nutrition_targets
  add constraint nutrition_targets_training_day_indices_valid
    check (training_day_indices <@ array[0,1,2,3,4,5,6]::smallint[]),
  add constraint nutrition_targets_training_calories_valid
    check (training_calories is null or training_calories between 600 and 10000),
  add constraint nutrition_targets_training_protein_valid
    check (training_protein_g is null or training_protein_g between 20 and 500),
  add constraint nutrition_targets_rest_calories_valid
    check (rest_calories is null or rest_calories between 600 and 10000),
  add constraint nutrition_targets_rest_protein_valid
    check (rest_protein_g is null or rest_protein_g between 20 and 500);

-- Preserve the present plan for any existing member while allowing the trainer
-- to assign a genuine split later. An empty schedule means "use standard target".
update public.nutrition_targets
set training_calories = coalesce(training_calories, calories),
    training_protein_g = coalesce(training_protein_g, protein_g),
    rest_calories = coalesce(rest_calories, calories),
    rest_protein_g = coalesce(rest_protein_g, protein_g)
where training_calories is null
   or training_protein_g is null
   or rest_calories is null
   or rest_protein_g is null;

drop policy if exists "own nutrition targets" on public.nutrition_targets;
drop policy if exists "member read own nutrition targets" on public.nutrition_targets;
drop policy if exists "trainer manage assigned nutrition targets" on public.nutrition_targets;

create policy "member read own nutrition targets"
  on public.nutrition_targets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "trainer manage assigned nutrition targets"
  on public.nutrition_targets
  for all
  to authenticated
  using (private.is_admin() or private.is_trainer_for(user_id))
  with check (private.is_admin() or private.is_trainer_for(user_id));

comment on column public.nutrition_targets.training_day_indices is
  'Monday-first day indexes (0-6) assigned by a trainer. An empty array keeps the standard target active.';
comment on column public.nutrition_targets.training_calories is
  'Assigned calorie target for scheduled training days.';
comment on column public.nutrition_targets.training_protein_g is
  'Assigned protein target for scheduled training days.';
comment on column public.nutrition_targets.rest_calories is
  'Assigned calorie target for scheduled rest days.';
comment on column public.nutrition_targets.rest_protein_g is
  'Assigned protein target for scheduled rest days.';

commit;
