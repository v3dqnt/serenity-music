-- Create a friends table to store user relationships
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- 'pending' or 'accepted'
  created_at timestamptz not null default now(),
  unique(user_id, friend_id)
);

-- Enable RLS
alter table public.friends enable row level security;

-- Policies
drop policy if exists "Users can view their own friends" on public.friends;
create policy "Users can view their own friends"
  on public.friends for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users can add friends" on public.friends;
create policy "Users can add friends"
  on public.friends for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove friends" on public.friends;
create policy "Users can remove friends"
  on public.friends for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users can update friendship status" on public.friends;
create policy "Users can update friendship status"
  on public.friends for update
  using (auth.uid() = friend_id) -- Only the receiver can accept
  with check (status = 'accepted');

-- View to easily see friend details (join with profiles)
-- This view is bidirectional: it shows the link for BOTH the initiator and the receiver
-- View to easily see friend details
-- This view helps identify if I am the sender or receiver
drop view if exists public.friend_details;
create or replace view public.friend_details as
-- Case A: I am the initiator (user_id)
select 
  f.id as friendship_id,
  f.user_id as observer_id,
  f.friend_id as friend_id,
  f.status,
  f.created_at,
  'sent' as direction,
  p.display_name as friend_name,
  p.email as friend_email,
  p.avatar_url as friend_avatar
from public.friends f
join public.profiles p on f.friend_id = p.id
union all
-- Case B: I am the receiver (friend_id)
select 
  f.id as friendship_id,
  f.friend_id as observer_id,
  f.user_id as friend_id,
  f.status,
  f.created_at,
  'received' as direction,
  p.display_name as friend_name,
  p.email as friend_email,
  p.avatar_url as friend_avatar
from public.friends f
join public.profiles p on f.user_id = p.id;
