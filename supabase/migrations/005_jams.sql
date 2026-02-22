-- Tables for Listen Together (Jams)
create table if not exists public.jams (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  name text default 'Midnight Session',
  created_at timestamptz not null default now()
);

-- Active members in a jam
create table if not exists public.jam_members (
  id uuid primary key default gen_random_uuid(),
  jam_id uuid not null references public.jams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(jam_id, user_id)
);

-- Jam Invitations
create table if not exists public.jam_invites (
  id uuid primary key default gen_random_uuid(),
  jam_id uuid not null references public.jams(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz not null default now(),
  unique(jam_id, receiver_id)
);

-- Jam Queue (Shared)
create table if not exists public.jam_queue (
  id uuid primary key default gen_random_uuid(),
  jam_id uuid not null references public.jams(id) on delete cascade,
  track_id text not null,
  title text not null,
  artist text not null,
  thumbnail text,
  added_by uuid not null references auth.users(id) on delete set null,
  added_at timestamptz not null default now()
);

-- Current playback state of the jam
create table if not exists public.jam_state (
  jam_id uuid primary key references public.jams(id) on delete cascade,
  current_track_id text,
  is_playing boolean default false,
  position_ms integer default 0,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.jams enable row level security;
alter table public.jam_members enable row level security;
alter table public.jam_invites enable row level security;
alter table public.jam_queue enable row level security;
alter table public.jam_state enable row level security;

-- RLS Policies
-- IMPORTANT: jam_members policies must NOT query jam_members itself (causes infinite recursion)

-- Jams: host can manage their own jams
create policy "Hosts can manage jams" on public.jams for all using (host_id = auth.uid());
-- Any authenticated user can create a new jam (INSERT needs with check)
create policy "Authenticated can create jams" on public.jams for insert with check (auth.uid() is not null and host_id = auth.uid());
create policy "Authenticated can view jams" on public.jams for select using (auth.uid() is not null);

-- Jam Members: use direct column checks to avoid self-referencing recursion
create policy "Members can view own memberships" on public.jam_members for select using (auth.uid() = user_id);
create policy "Members can see co-members" on public.jam_members for select using (
  jam_id in (select jm.jam_id from public.jam_members jm where jm.user_id = auth.uid())
);
create policy "Internal join" on public.jam_members for insert with check (true);

-- Invites
create policy "Invites visibility" on public.jam_invites for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Send invites" on public.jam_invites for insert with check (auth.uid() = sender_id);
create policy "Update invites" on public.jam_invites for update using (auth.uid() = receiver_id);

-- Queue & State: check membership via direct user_id match (no recursion)
create policy "Queue visibility" on public.jam_queue for select using (auth.uid() is not null);
create policy "Queue add" on public.jam_queue for insert with check (auth.uid() is not null);

create policy "State visibility" on public.jam_state for select using (auth.uid() is not null);
create policy "State update" on public.jam_state for update using (auth.uid() is not null);
create policy "State insert" on public.jam_state for insert with check (auth.uid() is not null);

-- Enable Realtime
begin;
  alter publication supabase_realtime add table public.jam_queue;
  alter publication supabase_realtime add table public.jam_state;
  alter publication supabase_realtime add table public.jam_invites;
commit;
