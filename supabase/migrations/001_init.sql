-- Fitgod — initial schema.
-- Run in the Supabase SQL editor, then enable the Anonymous provider under
-- Authentication → Providers.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------- garments
create table if not exists public.garments (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('top', 'bottom', 'shoes')),
  name text not null default 'Untitled',
  -- Measured from the photo in lib/palette.ts, never model output.
  colors jsonb not null default '[]'::jsonb,
  style text not null default 'casual',
  warmth int not null default 3 check (warmth between 1 and 5),
  formality int not null default 3 check (formality between 1 and 5),
  description text,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists garments_user_idx on public.garments (user_id, created_at desc);

alter table public.garments enable row level security;

create policy "Users manage own garments" on public.garments
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------- saved_outfits
create table if not exists public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  garment_ids jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_outfits_user_idx on public.saved_outfits (user_id, created_at desc);

alter table public.saved_outfits enable row level security;

create policy "Users manage own saved outfits" on public.saved_outfits
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------- outfit_history
-- Feeds the recency penalty in lib/rotation.ts when syncing across devices.
create table if not exists public.outfit_history (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  garment_ids jsonb not null,
  primary key (user_id, date)
);

alter table public.outfit_history enable row level security;

create policy "Users manage own history" on public.outfit_history
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- ai_cache
-- RLS on with NO policies: service-role only, unreachable from the browser.
create table if not exists public.ai_cache (
  key text primary key,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_cache enable row level security;

-- --------------------------------------------------------------- api_usage
-- Deliberately no FK to auth.users, so locally-generated ids are throttled too.
create table if not exists public.api_usage (
  user_id text not null,
  date date not null,
  count int not null default 0,
  primary key (user_id, date)
);

alter table public.api_usage enable row level security;

-- ----------------------------------------------------------------- storage
-- Private bucket. Garment photos are personal, and since IndexedDB is the
-- render source, signed URLs are only needed to restore on a fresh device.
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;

-- Path convention: {user_id}/{garment_id}.jpg
create policy "Users read own garment images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users upload own garment images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own garment images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own garment images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
