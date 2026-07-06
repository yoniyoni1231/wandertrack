-- ============================================================
-- WanderTrack cloud sync — run this ONCE in your Supabase
-- project: Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================

-- One row per user holding their whole app state as JSON.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: each user can only ever touch their own row.
alter table public.user_data enable row level security;

drop policy if exists "Users manage own data" on public.user_data;
create policy "Users manage own data"
  on public.user_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
