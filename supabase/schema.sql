-- CatsCare Supabase Schema
-- 프로젝트: kbjxjogmnwurxbxnpfsz.supabase.co

-- ========================
-- 1. cats
-- ========================
create table if not exists public.cats (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  breed        text,
  age_years    int,
  birth_date   date,
  weight_kg    numeric(5,2),
  gender       text check (gender in ('male','female')),
  neutered     boolean default false,
  photo_url    text,
  created_at   timestamptz default now()
);

alter table public.cats enable row level security;

create policy "cats: own rows only"
  on public.cats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========================
-- 2. weight_records
-- ========================
create table if not exists public.weight_records (
  id           uuid primary key default gen_random_uuid(),
  cat_id       uuid not null references public.cats(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  weight_kg    numeric(5,2) not null,
  recorded_at  date not null default current_date,
  created_at   timestamptz default now()
);

alter table public.weight_records enable row level security;

create policy "weight_records: own rows only"
  on public.weight_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========================
-- 3. medications
-- ========================
create table if not exists public.medications (
  id            uuid primary key default gen_random_uuid(),
  cat_id        uuid not null references public.cats(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  dosage        int default 1,
  frequency     text,
  doses_per_day int default 1,
  times         text[],
  alarm_on      boolean default false,
  created_at    timestamptz default now()
);

alter table public.medications enable row level security;

create policy "medications: own rows only"
  on public.medications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========================
-- 4. exam_records
-- ========================
create table if not exists public.exam_records (
  id          uuid primary key default gen_random_uuid(),
  cat_id      uuid not null references public.cats(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  type        text not null default 'blood',
  metrics     jsonb default '{}',
  created_at  timestamptz default now()
);

alter table public.exam_records enable row level security;

create policy "exam_records: own rows only"
  on public.exam_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========================
-- 5. vaccinations
-- ========================
create table if not exists public.vaccinations (
  id          uuid primary key default gen_random_uuid(),
  cat_id      uuid not null references public.cats(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  date        date not null,
  next_date   date,
  notes       text,
  created_at  timestamptz default now()
);

alter table public.vaccinations enable row level security;

create policy "vaccinations: own rows only"
  on public.vaccinations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
