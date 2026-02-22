-- Table to store recently played tracks for each user
create table if not exists public.recently_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  title text not null,
  channel_title text not null,
  thumbnail text,
  played_at timestamptz not null default now(),
  unique(user_id, track_id) -- Only store each track once per user
);

-- Enable RLS
alter table public.recently_played enable row level security;

-- Policies
drop policy if exists "Users can view their own recently played" on public.recently_played;
create policy "Users can view their own recently played"
  on public.recently_played for select
  using (auth.uid() = user_id);

-- Allow friends to see each other's recently_played (needed for friend_activity view)
drop policy if exists "Friends can view recently played" on public.recently_played;
create policy "Friends can view recently played"
  on public.recently_played for select
  using (
    exists (
      select 1 from public.friends f
      where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = recently_played.user_id)
          or
          (f.friend_id = auth.uid() and f.user_id = recently_played.user_id)
        )
    )
  );

drop policy if exists "Users can insert/update their own recently played" on public.recently_played;
create policy "Users can insert/update their own recently played"
  on public.recently_played for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own recently played" on public.recently_played;
create policy "Users can update their own recently played"
  on public.recently_played for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own recently played" on public.recently_played;
create policy "Users can delete their own recently played"
  on public.recently_played for delete
  using (auth.uid() = user_id);

-- Function to update played_at on duplicate insert
create or replace function public.handle_recently_played_upsert()
returns trigger
language plpgsql
as $$
begin
  -- If track already exists for user, update the played_at timestamp
  update public.recently_played 
  set played_at = now()
  where user_id = new.user_id and track_id = new.track_id;
  
  if found then
    return null; -- Stop the insert
  end if;
  return new; -- Continue with the insert
end;
$$;

drop trigger if exists on_recently_played_insert on public.recently_played;
create trigger on_recently_played_insert
  before insert on public.recently_played
  for each row execute procedure public.handle_recently_played_upsert();

-- View to see what friends are currently listening to
drop view if exists public.friend_activity;
create view public.friend_activity as
with latest_plays as (
  select distinct on (user_id) *
  from public.recently_played
  order by user_id, played_at desc
)
select 
  f.observer_id as user_id,
  f.friend_id,
  f.friend_name,
  f.friend_avatar,
  lp.track_id,
  lp.title as track_title,
  lp.channel_title as track_artist,
  lp.thumbnail as track_thumbnail,
  lp.played_at
from public.friend_details f
join latest_plays lp on f.friend_id = lp.user_id
where f.status = 'accepted';

-- Enable Realtime for recently_played to allow live social updates
begin;
  -- drop the publication if it exists to avoid errors (Supabase specific)
  alter publication supabase_realtime add table public.recently_played;
commit;
