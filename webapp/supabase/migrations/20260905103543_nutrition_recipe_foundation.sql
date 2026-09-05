-- Project Steel nutrition must be reproducible from source control.  This is the
-- canonical food, recipe and diary model; user-owned records are protected by RLS.

create table if not exists public.nutrition_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source text not null default 'manual',
  provider_food_id text,
  barcode text,
  name text not null,
  brand text,
  image_url text,
  default_serving_label text,
  default_serving_g numeric(8,2) not null default 100 check (default_serving_g > 0),
  calories_per_100g numeric(9,2) not null default 0 check (calories_per_100g >= 0),
  protein_g_per_100g numeric(9,2) not null default 0 check (protein_g_per_100g >= 0),
  carbs_g_per_100g numeric(9,2) not null default 0 check (carbs_g_per_100g >= 0),
  fat_g_per_100g numeric(9,2) not null default 0 check (fat_g_per_100g >= 0),
  fibre_g_per_100g numeric(9,2) not null default 0 check (fibre_g_per_100g >= 0),
  sugar_g_per_100g numeric(9,2) not null default 0 check (sugar_g_per_100g >= 0),
  salt_g_per_100g numeric(9,2) not null default 0 check (salt_g_per_100g >= 0),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_foods_name_idx on public.nutrition_foods (name);
create index if not exists nutrition_foods_barcode_idx on public.nutrition_foods (barcode) where barcode is not null;

create table if not exists public.nutrition_food_servings (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.nutrition_foods(id) on delete cascade,
  label text not null,
  grams numeric(8,2) not null check (grams > 0),
  sort_order smallint not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (food_id, label)
);

create table if not exists public.nutrition_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null check (meal_type in ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text,
  instructions text,
  servings numeric(6,2) not null default 1 check (servings > 0),
  source text not null default 'personal' check (source in ('assigned', 'personal', 'saved_from_diary')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_recipes_user_meal_idx on public.nutrition_recipes (user_id, meal_type, active, created_at desc);

create table if not exists public.nutrition_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.nutrition_recipes(id) on delete cascade,
  food_id uuid not null references public.nutrition_foods(id) on delete restrict,
  grams numeric(8,2) not null check (grams > 0),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (recipe_id, sort_order)
);

create table if not exists public.nutrition_food_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.nutrition_foods(id) on delete cascade,
  is_favourite boolean not null default false,
  use_count integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

alter table public.meal_logs drop constraint if exists meal_logs_entry_type_check;
alter table public.meal_logs add constraint meal_logs_entry_type_check check (entry_type in ('planned', 'custom', 'food', 'recipe'));

create table if not exists public.nutrition_meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  food_id uuid references public.nutrition_foods(id) on delete set null,
  name text not null,
  brand text,
  serving_label text,
  grams numeric(8,2) not null check (grams > 0),
  calories numeric(9,2) not null default 0,
  protein_g numeric(9,2) not null default 0,
  carbs_g numeric(9,2) not null default 0,
  fat_g numeric(9,2) not null default 0,
  fibre_g numeric(9,2) not null default 0,
  sugar_g numeric(9,2) not null default 0,
  salt_g numeric(9,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists nutrition_meal_log_items_food_idx on public.nutrition_meal_log_items (food_id, created_at desc);

alter table public.nutrition_foods enable row level security;
alter table public.nutrition_food_servings enable row level security;
alter table public.nutrition_recipes enable row level security;
alter table public.nutrition_recipe_items enable row level security;
alter table public.nutrition_food_preferences enable row level security;
alter table public.nutrition_meal_log_items enable row level security;

drop policy if exists "catalogue foods are visible to members" on public.nutrition_foods;
create policy "catalogue foods are visible to members" on public.nutrition_foods for select to authenticated using (user_id is null or user_id = (select auth.uid()));
drop policy if exists "members manage their own foods" on public.nutrition_foods;
create policy "members manage their own foods" on public.nutrition_foods for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "catalogue servings are visible to members" on public.nutrition_food_servings;
create policy "catalogue servings are visible to members" on public.nutrition_food_servings for select to authenticated using (exists (select 1 from public.nutrition_foods food where food.id = food_id and (food.user_id is null or food.user_id = (select auth.uid()))));
drop policy if exists "members manage own recipes" on public.nutrition_recipes;
create policy "members manage own recipes" on public.nutrition_recipes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "members manage own recipe items" on public.nutrition_recipe_items;
create policy "members manage own recipe items" on public.nutrition_recipe_items for all to authenticated using (exists (select 1 from public.nutrition_recipes recipe where recipe.id = recipe_id and recipe.user_id = (select auth.uid()))) with check (exists (select 1 from public.nutrition_recipes recipe where recipe.id = recipe_id and recipe.user_id = (select auth.uid())));
drop policy if exists "members manage own food preferences" on public.nutrition_food_preferences;
create policy "members manage own food preferences" on public.nutrition_food_preferences for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "members read own meal items" on public.nutrition_meal_log_items;
create policy "members read own meal items" on public.nutrition_meal_log_items for select to authenticated using (exists (select 1 from public.meal_logs log where log.id = meal_log_id and log.user_id = (select auth.uid())));
create policy "members insert own meal items" on public.nutrition_meal_log_items for insert to authenticated with check (exists (select 1 from public.meal_logs log where log.id = meal_log_id and log.user_id = (select auth.uid())));
create policy "members update own meal items" on public.nutrition_meal_log_items for update to authenticated using (exists (select 1 from public.meal_logs log where log.id = meal_log_id and log.user_id = (select auth.uid()))) with check (exists (select 1 from public.meal_logs log where log.id = meal_log_id and log.user_id = (select auth.uid())));
create policy "members delete own meal items" on public.nutrition_meal_log_items for delete to authenticated using (exists (select 1 from public.meal_logs log where log.id = meal_log_id and log.user_id = (select auth.uid())));

grant select on public.nutrition_foods, public.nutrition_food_servings to authenticated;
grant select, insert, update, delete on public.nutrition_recipes, public.nutrition_recipe_items, public.nutrition_food_preferences, public.nutrition_meal_log_items to authenticated;
