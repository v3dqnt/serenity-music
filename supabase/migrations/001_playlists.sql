-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- Creates the playlists table with Row Level Security so each user only sees their own playlists

create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  tracks      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.playlists enable row level security;

-- Policies: users can only CRUD their own rows
create policy "Users can view their own playlists"
  on public.playlists for select
  using (auth.uid() = user_id);

create policy "Users can insert their own playlists"
  on public.playlists for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own playlists"
  on public.playlists for update
  using (auth.uid() = user_id);

create policy "Users can delete their own playlists"
  on public.playlists for delete
  using (auth.uid() = user_id);
