-- Project Steel v1 Supabase schema
-- AI deliberately parked. This schema covers programme, workout logging,
-- incline cardio, body-weight check-ins, and future nutrition basics.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goal text default 'Lose fat and gain muscle',
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
  sort_order integer not null default 0,
  active boolean not null default true,
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

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own workouts" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exercises" on exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weight checkins" on weight_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own nutrition targets" on nutrition_targets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own meal plan" on meal_plan_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own workout exercises" on workout_exercises for all
using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()))
with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "own set logs" on set_logs for all
using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));

create policy "own cardio logs" on cardio_logs for all
using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
