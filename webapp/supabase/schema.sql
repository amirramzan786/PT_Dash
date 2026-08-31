-- Project Steel v1 Supabase schema
-- AI deliberately parked. This schema covers programme, workout logging,
-- incline cardio, body-weight check-ins, and future nutrition basics.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  goal text default 'Lose fat and gain muscle',
  experience_level text not null default 'Intermediate' check (experience_level in ('Beginner','Intermediate','Advanced')),
  available_equipment text[] not null default array['Machines']::text[],
  training_days smallint not null default 3 check (training_days between 1 and 7),
  units text not null default 'lb' check (units in ('lb','kg')),
  limitations text,
  onboarding_completed boolean not null default false,
  dietary_preference text not null default 'No preference',
  allergies text,
  meals_per_day smallint not null default 3 check (meals_per_day between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  equipment text,
  youtube_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  sort_order integer not null,
  sets integer not null default 3 check (sets > 0),
  rep_target text not null default '10–12',
  start_weight_kg numeric(7,2) not null default 0,
  unique (workout_id, exercise_id)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references workouts(id) on delete set null,
  workout_name text not null,
  session_date date not null default current_date,
  duration_min integer,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete set null,
  exercise_name text not null,
  set_no integer not null check (set_no > 0),
  reps integer not null check (reps > 0),
  weight_kg numeric(7,2) not null default 0,
  completed boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists cardio_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  activity text not null default 'Incline treadmill walk',
  duration_min integer not null check (duration_min > 0),
  incline_percent numeric(4,1),
  rpe numeric(3,1),
  intensity text default 'Medium',
  created_at timestamptz not null default now()
);

create table if not exists weight_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  weight_lb numeric(6,1) not null check (weight_lb > 0),
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create table if not exists nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories integer,
  protein_g integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null,
  title text not null,
  description text,
  calories integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  serving_g integer,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  energy smallint check (energy between 1 and 5),
  sleep smallint check (sleep between 1 and 5),
  stress smallint check (stress between 1 and 5),
  soreness smallint check (soreness between 1 and 5),
  workouts_completed smallint check (workouts_completed between 0 and 14),
  nutrition_days smallint check (nutrition_days between 0 and 7),
  pain_or_injury text,
  wins text,
  challenges text,
  questions text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null,
  meal_type text not null,
  recipe_name text,
  calories integer,
  created_at timestamptz not null default now(),
  unique (user_id, meal_date, meal_type)
);

create table if not exists weekly_checkin_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size integer not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table workout_exercises enable row level security;
alter table sessions enable row level security;
alter table set_logs enable row level security;
alter table cardio_logs enable row level security;
alter table weight_checkins enable row level security;
alter table nutrition_targets enable row level security;
alter table meal_plan_items enable row level security;
alter table weekly_checkins enable row level security;
alter table meal_logs enable row level security;
alter table weekly_checkin_media enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own workouts" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exercises" on exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weight checkins" on weight_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own nutrition targets" on nutrition_targets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own meal plan" on meal_plan_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weekly checkins" on weekly_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own meal logs" on meal_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own checkin media" on weekly_checkin_media for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private check-in uploads. Files are stored under <user_id>/<week_start>/...
insert into storage.buckets (id, name, public) values ('checkin-media', 'checkin-media', false) on conflict (id) do nothing;
drop policy if exists "own checkin media files" on storage.objects;
create policy "own checkin media files" on storage.objects for all to authenticated
using (bucket_id = 'checkin-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'checkin-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own workout exercises" on workout_exercises for all
using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()))
with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "own set logs" on set_logs for all
using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));

create policy "own cardio logs" on cardio_logs for all
using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));

-- Shared free content catalogue. User plans remain in the user-owned tables above;
-- this catalogue is the reusable foundation for future journeys and AI recommendations.
create table if not exists exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  primary_muscle_group text not null,
  secondary_muscle_groups text[] not null default '{}'::text[],
  equipment text[] not null default '{}'::text[],
  movement_pattern text,
  difficulty text not null default 'Intermediate' check (difficulty in ('Beginner','Intermediate','Advanced')),
  instructions text,
  video_url text,
  thumbnail_url text,
  is_free boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  focus text,
  goal_tags text[] not null default '{}'::text[],
  equipment text[] not null default '{}'::text[],
  difficulty text not null default 'Intermediate' check (difficulty in ('Beginner','Intermediate','Advanced')),
  duration_min integer,
  is_free boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_catalog_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workout_catalog(id) on delete cascade,
  exercise_id uuid not null references exercise_catalog(id) on delete cascade,
  sort_order integer not null,
  sets integer not null default 3 check (sets > 0),
  rep_target text not null default '10–12',
  rest_seconds integer,
  unique (workout_id, exercise_id)
);

alter table exercise_catalog enable row level security;
alter table workout_catalog enable row level security;
alter table workout_catalog_exercises enable row level security;

create policy "read active exercise catalogue" on exercise_catalog for select
to anon, authenticated using (active = true);
create policy "read active workout catalogue" on workout_catalog for select
to anon, authenticated using (active = true);
create policy "read active workout catalogue exercises" on workout_catalog_exercises for select
to anon, authenticated using (exists (select 1 from workout_catalog w where w.id = workout_id and w.active = true));

create index if not exists exercise_catalog_muscle_group_idx on exercise_catalog (primary_muscle_group);
create index if not exists workout_catalog_active_idx on workout_catalog (active, is_free);
create index if not exists workout_catalog_exercises_workout_idx on workout_catalog_exercises (workout_id, sort_order);

-- Starter catalogue content. All of these entries are free and safe to expose through the read-only policies above.
insert into exercise_catalog (slug, name, primary_muscle_group, secondary_muscle_groups, equipment, movement_pattern, difficulty, instructions, is_free)
values
('lat-pulldown','Lat Pulldown','Back',array['Biceps']::text[],array['Machine','Cable']::text[],'Vertical pull','Beginner','Pull the bar toward your upper chest while keeping your ribs controlled.',true),
('seated-row-machine','Seated Row Machine','Back',array['Biceps']::text[],array['Machine']::text[],'Horizontal pull','Beginner','Drive your elbows back and pause when your hands reach your torso.',true),
('high-row-machine','High Row Machine','Back',array['Rear delts','Biceps']::text[],array['Machine']::text[],'Horizontal pull','Intermediate','Keep your chest supported and pull toward the upper ribs.',true),
('preacher-curl-machine','Preacher Curl Machine','Biceps',array[]::text[],array['Machine']::text[],'Elbow flexion','Beginner','Keep the upper arm fixed and curl without swinging.',true),
('cable-curl','Cable Curl','Biceps',array['Forearms']::text[],array['Cable']::text[],'Elbow flexion','Beginner','Brace your elbows by your sides and control the return.',true),
('db-hammer-curl','Dumbbell Hammer Curl','Biceps',array['Forearms']::text[],array['Dumbbells']::text[],'Elbow flexion','Beginner','Keep palms facing inward and move through a smooth range.',true),
('machine-chest-press','Machine Chest Press','Chest',array['Triceps','Front delts']::text[],array['Machine']::text[],'Horizontal push','Beginner','Set the handles at mid-chest height and press without locking out hard.',true),
('incline-chest-press-machine','Incline Chest Press Machine','Chest',array['Front delts','Triceps']::text[],array['Machine']::text[],'Incline push','Intermediate','Keep your shoulders down and press along the machine path.',true),
('pec-deck','Pec Deck','Chest',array['Front delts']::text[],array['Machine']::text[],'Horizontal adduction','Beginner','Bring the handles together with a soft bend in the elbows.',true),
('rope-tricep-pushdown','Rope Tricep Pushdown','Triceps',array[]::text[],array['Cable']::text[],'Elbow extension','Beginner','Keep the elbows still and separate the rope at the bottom.',true),
('overhead-cable-tricep-extension','Overhead Cable Tricep Extension','Triceps',array[]::text[],array['Cable']::text[],'Elbow extension','Intermediate','Brace your core and extend without flaring the elbows.',true),
('assisted-dip-machine','Assisted Dip Machine','Triceps',array['Chest','Front delts']::text[],array['Machine']::text[],'Vertical push','Beginner','Lower under control and press evenly through both arms.',true),
('machine-shoulder-press','Machine Shoulder Press','Shoulders',array['Triceps']::text[],array['Machine']::text[],'Vertical push','Beginner','Press overhead while keeping your back supported and wrists stacked.',true),
('lateral-raise-machine','Lateral Raise Machine','Shoulders',array['Side delts']::text[],array['Machine']::text[],'Shoulder abduction','Beginner','Raise to shoulder height with control and avoid shrugging.',true),
('leg-press','Leg Press','Quads',array['Glutes','Hamstrings']::text[],array['Machine']::text[],'Knee-dominant squat','Beginner','Lower until comfortable while keeping your feet and knees aligned.',true),
('leg-extension','Leg Extension','Quads',array[]::text[],array['Machine']::text[],'Knee extension','Beginner','Extend smoothly and pause briefly at the top.',true),
('seated-leg-curl','Seated Leg Curl','Hamstrings',array['Calves']::text[],array['Machine']::text[],'Knee flexion','Beginner','Keep your hips down and curl through the full comfortable range.',true),
('calf-raise-machine','Calf Raise Machine','Calves',array[]::text[],array['Machine']::text[],'Plantar flexion','Beginner','Pause at the top and lower your heels under control.',true)
on conflict (slug) do update set name = excluded.name, primary_muscle_group = excluded.primary_muscle_group, secondary_muscle_groups = excluded.secondary_muscle_groups, equipment = excluded.equipment, movement_pattern = excluded.movement_pattern, difficulty = excluded.difficulty, instructions = excluded.instructions, is_free = excluded.is_free, updated_at = now();

update exercise_catalog set video_url = case slug
  when 'lat-pulldown' then 'https://www.youtube.com/results?search_query=lat+pulldown+proper+form'
  when 'seated-row-machine' then 'https://www.youtube.com/results?search_query=seated+row+machine+proper+form'
  when 'high-row-machine' then 'https://www.youtube.com/results?search_query=machine+high+row+proper+form'
  when 'preacher-curl-machine' then 'https://www.youtube.com/results?search_query=preacher+curl+machine+proper+form'
  when 'cable-curl' then 'https://www.youtube.com/results?search_query=cable+curl+proper+form'
  when 'db-hammer-curl' then 'https://www.youtube.com/results?search_query=dumbbell+hammer+curl+proper+form'
  when 'machine-chest-press' then 'https://www.youtube.com/results?search_query=machine+chest+press+proper+form'
  when 'incline-chest-press-machine' then 'https://www.youtube.com/results?search_query=incline+chest+press+machine+proper+form'
  when 'pec-deck' then 'https://www.youtube.com/results?search_query=pec+deck+proper+form'
  when 'rope-tricep-pushdown' then 'https://www.youtube.com/results?search_query=rope+tricep+pushdown+proper+form'
  when 'overhead-cable-tricep-extension' then 'https://www.youtube.com/results?search_query=overhead+cable+tricep+extension+proper+form'
  when 'assisted-dip-machine' then 'https://www.youtube.com/results?search_query=assisted+dip+machine+proper+form'
  when 'machine-shoulder-press' then 'https://www.youtube.com/results?search_query=machine+shoulder+press+proper+form'
  when 'lateral-raise-machine' then 'https://www.youtube.com/results?search_query=lateral+raise+machine+proper+form'
  when 'leg-press' then 'https://www.youtube.com/results?search_query=leg+press+proper+form'
  when 'leg-extension' then 'https://www.youtube.com/results?search_query=leg+extension+proper+form'
  when 'seated-leg-curl' then 'https://www.youtube.com/results?search_query=seated+leg+curl+proper+form'
  when 'calf-raise-machine' then 'https://www.youtube.com/results?search_query=calf+raise+machine+proper+form'
  else video_url
end, updated_at = now()
where active = true;

insert into workout_catalog (slug, name, description, focus, goal_tags, equipment, difficulty, duration_min, is_free)
values
('back-biceps','Back + Biceps','A focused pull session for back strength and arm development.','Back · Biceps',array['Build muscle','Get stronger']::text[],array['Machines','Cable','Dumbbells']::text[],'Beginner',45,true),
('chest-triceps','Chest + Triceps','A controlled push session for chest, shoulders and triceps.','Chest · Shoulders · Triceps',array['Build muscle','Get stronger']::text[],array['Machines','Cable']::text[],'Beginner',45,true),
('shoulders-legs','Shoulders + Legs','A balanced lower-body and shoulder strength session.','Shoulders · Quads · Hamstrings · Calves',array['Build muscle','Improve fitness']::text[],array['Machines']::text[],'Beginner',45,true)
on conflict (slug) do update set name = excluded.name, description = excluded.description, focus = excluded.focus, goal_tags = excluded.goal_tags, equipment = excluded.equipment, difficulty = excluded.difficulty, duration_min = excluded.duration_min, is_free = excluded.is_free, updated_at = now();

with links(workout_slug, exercise_slug, sort_order, sets, rep_target, rest_seconds) as (
  values
  ('back-biceps','lat-pulldown',1,3,'8–12',90),('back-biceps','seated-row-machine',2,3,'8–12',90),('back-biceps','high-row-machine',3,3,'10–12',75),('back-biceps','preacher-curl-machine',4,3,'10–12',75),('back-biceps','cable-curl',5,3,'10–12',75),('back-biceps','db-hammer-curl',6,2,'10–12',60),
  ('chest-triceps','machine-chest-press',1,3,'8–12',90),('chest-triceps','incline-chest-press-machine',2,3,'8–12',90),('chest-triceps','pec-deck',3,3,'10–15',75),('chest-triceps','rope-tricep-pushdown',4,3,'10–12',75),('chest-triceps','overhead-cable-tricep-extension',5,3,'10–12',75),('chest-triceps','assisted-dip-machine',6,2,'8–12',90),
  ('shoulders-legs','machine-shoulder-press',1,3,'8–12',90),('shoulders-legs','lateral-raise-machine',2,3,'10–15',60),('shoulders-legs','leg-press',3,3,'8–12',120),('shoulders-legs','leg-extension',4,3,'10–15',75),('shoulders-legs','seated-leg-curl',5,3,'10–15',75),('shoulders-legs','calf-raise-machine',6,3,'12–15',60)
)
insert into workout_catalog_exercises (workout_id, exercise_id, sort_order, sets, rep_target, rest_seconds)
select w.id, e.id, l.sort_order, l.sets, l.rep_target, l.rest_seconds from links l join workout_catalog w on w.slug = l.workout_slug join exercise_catalog e on e.slug = l.exercise_slug
on conflict (workout_id, exercise_id) do update set sort_order = excluded.sort_order, sets = excluded.sets, rep_target = excluded.rep_target, rest_seconds = excluded.rest_seconds;
